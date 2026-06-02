import json
import logging
import re
from typing import TypedDict, List, Dict, Any, Optional
from langgraph.graph import StateGraph, END
from services.llmrouter import LLMRouter
from services.qdrant_client import QdrantClient
from services.prompts import research_query_analysis_prompt

logger = logging.getLogger(__name__)


class ResearchState(TypedDict):
    query: str
    org_id: str
    matter_id: Optional[str]
    extracted_filters: Dict[str, Any]
    chunks: List[Dict[str, Any]]
    reranked: List[Dict[str, Any]]
    answer: str
    citations: List[str]
    sources: List[Dict[str, Any]]
    status: str


def _strip_fences(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        t = re.sub(r"^```[a-zA-Z0-9_-]*\n?", "", t)
        t = t.rsplit("```", 1)[0]
    return t.strip()


def analyze_query(state: ResearchState) -> Dict[str, Any]:
    """Node: Analyze the query using the centralized prompt library."""
    router = LLMRouter(organization_id=state["org_id"])
    prompt = research_query_analysis_prompt(state["query"])
    try:
        response = router.chat([{"role": "user", "content": prompt}], task="extraction")
        filters = json.loads(_strip_fences(response))
    except Exception as e:
        logger.warning(f"Query analysis failed: {e}")
        filters = {"search_terms": [state["query"]], "legal_area": "general"}
    return {"extracted_filters": filters, "status": "retrieving"}


def retrieve_from_qdrant(state: ResearchState) -> Dict[str, Any]:
    """Node: Embed and retrieve relevant chunks. Uses expanded search terms when available."""
    router = LLMRouter(organization_id=state["org_id"])
    qdrant = QdrantClient()

    # Prefer expanded search terms from query analysis
    terms = state["extracted_filters"].get("search_terms", [])
    if isinstance(terms, list) and terms:
        search_query = " ".join(terms[:4])
    elif isinstance(terms, str) and terms:
        search_query = terms
    else:
        search_query = state["query"]

    query_vector = router.embed(search_query)

    results = qdrant.search_document_chunks(
        query_vector=query_vector,
        org_id=state["org_id"],
        matter_id=state["matter_id"],
        limit=20,
    )
    return {"chunks": results, "status": "reranking"}


def rerank_results(state: ResearchState) -> Dict[str, Any]:
    """Node: LLM-guided reranking — hybrid of vector score (40%) + LLM relevance score (60%)."""
    chunks = state["chunks"]
    if not chunks:
        return {"reranked": [], "status": "synthesizing"}

    router = LLMRouter(organization_id=state["org_id"])

    candidates = chunks[:20]
    items = [
        {"idx": i, "preview": (c.get("text") or "")[:250]}
        for i, c in enumerate(candidates)
    ]

    scoring_prompt = f"""You are a legal research relevance judge. Score each excerpt's relevance to the query.

Query: "{state['query']}"

Excerpts:
{json.dumps(items, ensure_ascii=False)}

Return a JSON array ONLY: [{{"idx": 0, "score": 0.95}}, ...]
Score: 0.0 = irrelevant, 1.0 = directly answers the query. Be discriminating — most scores should be 0.2–0.7.
Return ONLY the JSON array, no explanation."""

    try:
        response = router.chat([{"role": "user", "content": scoring_prompt}], task="extraction")
        scores = json.loads(_strip_fences(response))
        score_map = {int(s["idx"]): float(s.get("score", 0)) for s in scores if isinstance(s, dict)}

        for i, chunk in enumerate(candidates):
            vector_score = float(chunk.get("score") or 0)
            llm_score = score_map.get(i, vector_score)
            chunk["_rerank_score"] = 0.4 * vector_score + 0.6 * llm_score

        sorted_chunks = sorted(candidates, key=lambda c: c.get("_rerank_score", 0), reverse=True)
        reranked = sorted_chunks[:8]
    except Exception as e:
        logger.warning(f"LLM reranking failed, falling back to vector scores: {e}")
        reranked = chunks[:8]

    return {"reranked": reranked, "status": "synthesizing"}


def synthesize_with_llm(state: ResearchState) -> Dict[str, Any]:
    """Node: Marks the state as ready for synthesis streaming in the view."""
    return {"status": "completed"}


def create_research_graph():
    """Build the compiled LangGraph StateGraph."""
    workflow = StateGraph(ResearchState)
    workflow.add_node("analyze_query", analyze_query)
    workflow.add_node("retrieve_from_qdrant", retrieve_from_qdrant)
    workflow.add_node("rerank_results", rerank_results)
    workflow.add_node("synthesize_with_llm", synthesize_with_llm)
    workflow.set_entry_point("analyze_query")
    workflow.add_edge("analyze_query", "retrieve_from_qdrant")
    workflow.add_edge("retrieve_from_qdrant", "rerank_results")
    workflow.add_edge("rerank_results", "synthesize_with_llm")
    workflow.add_edge("synthesize_with_llm", END)
    return workflow.compile()
