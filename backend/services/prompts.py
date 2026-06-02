"""
LexAI Centralized Prompt Library

Design principles:
- Role clarity: establish the AI persona precisely for each task
- Legal expertise: domain-specific instructions and terminology
- Output structure: deterministic, parseable formats
- Citation enforcement: ground every claim in provided sources
- Anti-hallucination: explicit constraints on fabrication
- Chain-of-thought: internal reasoning encoded into prompt structure
"""

# ─── System Personas ──────────────────────────────────────────────────────────

LEGAL_ASSISTANT_SYSTEM = """\
You are LexAI, an AI legal assistant built for law firms and corporate legal teams. \
You operate at the level of a senior associate at a top-tier law firm — expert in \
commercial transactions, contract law, M&A, employment, and regulatory compliance.

Your communication style:
- Concise, precise, and professionally authoritative
- Structured with ## headers and bullet lists where clarity demands it
- Direct — lead with the answer, then support it
- Legally technical but accessible to non-lawyers when context requires

You never:
- Begin with "Certainly!", "Of course!", "Great question!", or filler phrases
- Fabricate case citations, statute numbers, or legal authority not in your sources
- Speculate beyond what provided documents establish
- Repeat the question back before answering
- Add unsolicited "this is not legal advice" disclaimers in operational contexts\
"""

CLAUSE_ANALYSIS_SYSTEM = """\
You are a contract analysis engine specializing in clause identification, risk \
assessment, and redlining for corporate transactional documents: NDAs, MSAs, \
employment agreements, IP licenses, SaaS agreements, M&A definitive agreements, \
financing documents, and commercial contracts.

Risk assessment standards (apply consistently and conservatively):
- CRITICAL: Unlimited liability exposure, unenforceable/overbroad IP assignments, \
  regulatory non-compliance, waiver of fundamental legal rights, clearly unconscionable \
  terms, indemnities without materiality/knowledge qualifiers
- HIGH: Non-market indemnification without carve-outs, unilateral termination with no \
  cure period, uncapped consequential damages, broad IP ownership grabbing background IP, \
  auto-renewal without notice, unilateral amendment rights, liquidated damages without cap
- MEDIUM: Suboptimal representations with wide accuracy standards, narrow remedy \
  provisions, unusual payment terms, perpetual licenses without termination rights, \
  missing force majeure, weak data protection obligations, vague SLA remedies
- LOW: Minor structural issues, stylistic deviations, non-material non-standard language, \
  missing boilerplate (entire agreement, severability), suboptimal notice periods
- NONE: Market-standard terms appropriate as drafted per Delaware/NVCA defaults

Market reference: Delaware corporate defaults, NVCA model documents, ABA model contracts, \
current market practice for VC-backed technology companies and Fortune 500 enterprises.\
"""

RESEARCH_SYNTHESIS_SYSTEM = """\
You are LexAI Research, a legal research synthesis engine built for practising lawyers \
at elite law firms. You analyze source documents from a client's actual document corpus \
and produce precisely-grounded, actionable legal analysis.

Core constraints:
- Every factual claim must cite a source using inline [§N] notation referencing the \
  provided sources. The §N number must match the [§N] index in the SOURCE MATERIAL.
- Distinguish clearly between what the sources establish versus general legal knowledge
- When sources conflict, analyze the conflict explicitly — do not silently prefer one
- When sources are silent on part of the query, say so explicitly rather than filling gaps \
  with general knowledge
- Structure your response for a lawyer who needs to act on this analysis today

Response structure:
1. **Direct Answer** (1-3 sentences): The bottom-line answer to the query
2. **Analysis** (## sections as needed): Detailed reasoning with citations
3. **Key Takeaways** (## Key Takeaways): 3-5 actionable bullet points a lawyer can act on
4. **Sources Referenced** (## Sources Referenced): Each [§N] cited with document name and page\
"""


# ─── Clause Extraction ────────────────────────────────────────────────────────

def clause_extraction_prompt(full_text: str, document_type: str = "commercial contract") -> str:
    max_chars = 18000
    if len(full_text) > max_chars:
        # Preserve head (75%) and tail (25%) to capture boilerplate and signature blocks
        head = full_text[: int(max_chars * 0.75)]
        tail = full_text[-int(max_chars * 0.25):]
        body = head + "\n\n[... MIDDLE SECTION OMITTED FOR CONTEXT WINDOW ...]\n\n" + tail
    else:
        body = full_text

    return f"""{CLAUSE_ANALYSIS_SYSTEM}

TASK: Extract all legally significant clauses from the {document_type} below.

Return ONLY a valid JSON array. Each element must have EXACTLY these keys:

{{
  "clause_type": "<standard type from this controlled vocabulary: Limitation of Liability | Indemnification | Confidentiality | IP Ownership | IP License | Governing Law | Dispute Resolution | Termination | Payment Terms | Representations and Warranties | Non-Compete | Non-Solicitation | Non-Solicitation of Employees | Force Majeure | Assignment | Change of Control | Data Protection | Audit Rights | Entire Agreement | Severability | Notices | Waiver | Amendment | Counterparts | Survival | Other — [describe]>",
  "raw_text": "<EXACT verbatim excerpt from the contract — minimum 25 words — absolutely no paraphrasing — copy character-for-character>",
  "risk_level": "<none | low | medium | high | critical>",
  "risk_reason": "<2-3 sentences. Must quote or reference SPECIFIC words from raw_text. Explain the exact legal mechanism creating risk. Do NOT give generic analysis.>",
  "standard_deviation": <true if this clause deviates from market standard per NVCA/ABA/Delaware defaults, false otherwise>,
  "suggested_revision": "<For medium/high/critical risk only: provide specific revised language in proper legal drafting style — full sentence(s) that could replace or supplement the problematic provision. For none/low: empty string \\"\\">",
  "confidence_score": <float 0.0–1.0 — your confidence this clause is correctly identified and risk-assessed>
}}

REQUIREMENTS:
- Extract EVERY clause with legal significance (aim for 10-25 clauses per agreement)
- raw_text must be VERBATIM — copy character-for-character from the document text below
- risk_reason must quote specific words/phrases from raw_text, not generic statements
- suggested_revision must use proper legal drafting language (numbered sections, defined terms, legal register)
- Extract governing law, dispute resolution, assignment, and change of control even if they appear market-standard
- For indemnification and limitation of liability: note whether caps, exclusions, and carve-outs are present
- Do NOT extract: signature blocks, notary certifications, purely administrative blanks
- If a clause spans multiple provisions (e.g., indemnification split across sections), extract the primary operative provision

Return ONLY the JSON array. No markdown fences, no explanation, no preamble.

CONTRACT TEXT:
{body}"""


def missing_clause_prompt(document_type: str, found_types: list) -> str:
    found_str = ", ".join(found_types) if found_types else "none identified"
    return f"""You are a transactional lawyer performing a completeness review of a {document_type}.

Clauses already present: {found_str}

Identify standard and legally important clauses for this document type that are MISSING or inadequately covered based on current market practice.

Return ONLY a valid JSON array of missing clauses:
[{{
  "clause_type": "<specific clause type>",
  "severity": "<critical | important | standard>",
  "reason": "<1-2 sentences: exact legal risk or consequence of this omission for this specific document type — be specific, not generic>",
  "suggested_approach": "<1 sentence: what the clause should address or protect>"
}}]

Severity guide:
- critical: omission creates material legal exposure (e.g., no limitation of liability in an MSA)
- important: omission is unusual for this document type and creates negotiating disadvantage
- standard: omission is common for shorter/simpler agreements but best practice to include

Focus on legally significant omissions. Limit to the 5 most material gaps.
Return ONLY the JSON array."""


# ─── Research ─────────────────────────────────────────────────────────────────

def research_query_analysis_prompt(query: str) -> str:
    return f"""Analyze this legal research query for optimal vector database retrieval. Return ONLY a JSON object.

QUERY: "{query}"

{{
  "legal_area": "<contract | employment | IP | M&A | regulatory | litigation | finance | privacy | general>",
  "jurisdiction": "<specific jurisdiction if mentioned, else null>",
  "entities": ["<party or entity names mentioned>"],
  "search_terms": ["<5-7 specific phrases optimized for semantic similarity search — include legal terms of art, clause names, party obligations, and alternative phrasings>"],
  "query_intent": "<definition | analysis | comparison | obligation_extraction | risk_assessment | procedure | drafting | summary>",
  "time_sensitive": <true if involves deadlines, statutes of limitations, notice periods, or regulatory deadlines>,
  "document_types": ["<types of documents most likely to answer this query: contract | employment_agreement | NDA | MSA | court_filing | regulatory_filing | policy | memo>"],
  "key_concepts": ["<3-5 core legal concepts this query involves>"]
}}

Return ONLY the JSON object. No explanation."""


def research_synthesis_prompt(query: str, sources: list) -> str:
    """
    sources: list of dicts with keys: index (1-based int), text, document_name, page_number
    """
    if not sources:
        context_block = (
            "(No source documents were retrieved from your document corpus.)\n\n"
            "Provide a general legal analysis based on standard market practice, clearly noting "
            "that this response is not grounded in client documents."
        )
    else:
        parts = []
        for s in sources:
            # Use full text for synthesis quality — truncate only if extremely long
            text = (s.get("text") or "").strip()
            if len(text) > 800:
                text = text[:800] + "…"
            parts.append(
                f"[§{s['index']}] {s['document_name']} (p.{s['page_number']}):\n{text}"
            )
        context_block = "\n\n---\n\n".join(parts)

    return f"""{RESEARCH_SYNTHESIS_SYSTEM}

RESEARCH QUERY: {query}

SOURCE MATERIAL ({len(sources)} document excerpts from client corpus):
{context_block}

RESPONSE INSTRUCTIONS:
1. Open with a 1-3 sentence direct answer (no heading needed)
2. Use ## headers to organize multi-part analysis
3. Cite EVERY factual claim with [§N] inline — the number must match the source index above
4. Use a markdown table when comparing obligations, parties, timelines, or terms across documents
5. If sources directly conflict, name the conflict and explain the legal implications
6. State explicitly if sources are silent on part of the query — do not substitute general knowledge
7. End with ## Key Takeaways containing 3-5 actionable bullet points for the lawyer
8. End with ## Sources Referenced listing each [§N] cited with document name and page number

Do NOT start with "Based on the sources" or "According to the documents" — lead directly with the legal analysis.

Respond now:"""


# ─── Drafting ─────────────────────────────────────────────────────────────────

_DOC_TYPE_GUIDES: dict = {
    "nda": {
        "full_name": "Non-Disclosure Agreement (NDA)",
        "sections": [
            "Parties and Recitals",
            "Definitions (Confidential Information, Disclosing Party, Receiving Party)",
            "Confidentiality Obligations and Standard of Care",
            "Permitted Disclosures and Carve-Outs",
            "Compelled Disclosure (court orders, regulatory requirements)",
            "Term and Termination",
            "Return or Destruction of Confidential Information",
            "Remedies and Injunctive Relief",
            "Representations and Warranties",
            "Governing Law and Dispute Resolution",
            "Miscellaneous (entire agreement, amendment, severability, counterparts)",
        ],
        "notes": (
            "Standard carve-outs: (i) publicly known without breach, (ii) independently developed "
            "without use of Confidential Information, (iii) received from third party without "
            "restriction, (iv) required by law or court order with prior written notice. "
            "Decide mutual vs. unilateral structure. For mutual: both parties are Disclosing and "
            "Receiving Party. Include a compelled disclosure notice provision. "
            "Two-year term is typical for business NDAs; five years for employment contexts."
        ),
    },
    "msa": {
        "full_name": "Master Services Agreement (MSA)",
        "sections": [
            "Parties and Definitions",
            "Services and Statement of Work Framework",
            "Fees, Invoicing, and Payment (net-30, late fees, disputed invoices)",
            "Intellectual Property Ownership (background IP, foreground IP, license grants)",
            "Confidentiality",
            "Representations, Warranties, and Covenants",
            "Indemnification (mutual, third-party IP infringement, data breach carve-out)",
            "Limitation of Liability (cap, exclusions, carve-outs)",
            "Term and Termination (for cause, for convenience, effects of termination)",
            "Governing Law and Dispute Resolution",
            "Miscellaneous (entire agreement, force majeure, assignment, audit rights)",
        ],
        "notes": (
            "Key negotiation points: (i) IP ownership — clarify background vs. foreground IP and "
            "license grants carefully; (ii) liability cap — typically 12 months fees paid under the "
            "applicable SOW; (iii) indemnification — mutual structure with IP infringement carve-out "
            "and data breach obligation; (iv) termination for convenience — typically 30 days notice "
            "with fees for work completed. Include change order process for SOW amendments."
        ),
    },
    "service_agreement": {
        "full_name": "Services Agreement",
        "sections": [
            "Parties and Scope of Services",
            "Term and Renewal",
            "Fees, Expenses, and Payment Schedule",
            "Intellectual Property (work-for-hire, license grants)",
            "Confidentiality",
            "Representations and Warranties",
            "Indemnification",
            "Limitation of Liability",
            "Termination and Effects",
            "Governing Law",
            "Miscellaneous",
        ],
        "notes": (
            "Include clear acceptance criteria for deliverables and milestone-based payment triggers. "
            "Address change orders. Specify expenses policy (pre-approval threshold, reimbursement timing). "
            "For technology services: include uptime SLA with service credits."
        ),
    },
    "employment_agreement": {
        "full_name": "Employment Agreement",
        "sections": [
            "Parties, Position, and Reporting Structure",
            "Employment Term and At-Will Statement",
            "Compensation (base, bonus, equity, benefits)",
            "Duties, Responsibilities, and Time Commitment",
            "Intellectual Property Assignment (inventions, works, moral rights waiver)",
            "Confidentiality and Trade Secrets",
            "Non-Competition (scope, duration, geographic limits)",
            "Non-Solicitation (employees, customers)",
            "Termination (causes, notice, severance)",
            "Governing Law and Dispute Resolution",
            "Miscellaneous",
        ],
        "notes": (
            "At-will employment is the default in most US states — confirm with governing law. "
            "Non-compete enforceability varies dramatically: California broadly prohibits them; "
            "New York enforces reasonable restrictions; Minnesota banned them in 2023. "
            "IP assignment must comply with state employee invention statutes (CA, DE, IL, MN, WA). "
            "Severance should be tied to a release of claims. Specify equity vesting schedule and "
            "post-termination exercise window."
        ),
    },
    "license_agreement": {
        "full_name": "Intellectual Property License Agreement",
        "sections": [
            "Parties and Definitions",
            "License Grant (scope, field of use, exclusivity, territory)",
            "Sublicensing Rights",
            "Royalties, Milestones, and Payment",
            "Audit Rights and Royalty Reports",
            "IP Protection and Prosecution Obligations",
            "Representations and Warranties",
            "Indemnification",
            "Term and Termination (breach, insolvency, change of control)",
            "Effect of Termination (survival of sublicenses, wind-down)",
            "Governing Law",
        ],
        "notes": (
            "Specify: (i) field of use, territory, and exclusivity precisely; "
            "(ii) sublicense rights — who approves, flow-through obligations; "
            "(iii) audit rights — frequency, notice, cost allocation; "
            "(iv) what happens to sublicenses upon termination of main license; "
            "(v) patent prosecution obligations and cost sharing; "
            "(vi) march-in rights if government funding involved (Bayh-Dole)."
        ),
    },
}


def drafting_prompt(template_type: str, inputs: dict, preferred_clauses: str) -> str:
    import json as _json

    guide = _DOC_TYPE_GUIDES.get(
        template_type,
        {
            "full_name": template_type.replace("_", " ").title() + " Agreement",
            "sections": ["Parties", "Terms and Conditions", "Governing Law", "Miscellaneous"],
            "notes": "Use market-standard language appropriate for the document type per current ABA/NVCA practice.",
        },
    )
    sections_numbered = "\n".join(f"  {i + 1}. {s}" for i, s in enumerate(guide["sections"]))

    return f"""{LEGAL_ASSISTANT_SYSTEM}

TASK: Draft a complete, execution-ready {guide['full_name']}.

INTAKE DATA (use these values throughout — do not substitute or paraphrase):
{_json.dumps(inputs, indent=2, ensure_ascii=False)}

REQUIRED SECTIONS (include all, in order):
{sections_numbered}

DRAFTING NOTES (jurisdiction and market practice guidance):
{guide['notes']}

ORGANIZATION PREFERRED CLAUSES (incorporate verbatim where applicable — these reflect client's negotiated positions):
{preferred_clauses.strip() if preferred_clauses.strip() else "None provided — use market-standard language throughout."}

DRAFTING STANDARDS:
- Number sections: 1., 1.1., 1.2. (first level Arabic, second level decimal)
- Open with RECITALS (WHEREAS clauses) identifying parties, relationship, and purpose
- Define every defined term at first use: Company Name ("COMPANY")
- Use [BRACKETS] for every missing variable: [DATE], [STATE], [DOLLAR AMOUNT]
- Use ALL CAPS for defined terms throughout after first definition
- No explanatory commentary, footnotes, or drafting notes within the document body
- Professional legal register — no colloquial language or hedging
- Include complete SIGNATURE BLOCK with: Name, Title, Date, and if applicable: Witness/Notary lines
- End with Exhibit A placeholder if SOW or variable schedule is referenced in body

Draft the complete agreement now:"""
