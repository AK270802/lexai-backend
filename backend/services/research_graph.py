import json
import logging
from typing import TypedDict, List, Dict, Any, Optional, Annotated
from langgraph.graph import StateGraph, END
from services.llmrouter import LLMRouter
from services.qdrant_client import QdrantClient

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

def analyze_query(state: ResearchState) -> Dict[str, Any]:
    """Node: Analyze the query to extract filters and retrieval hints."""
    router = LLMRouter(organization_id=state["org_id"])
    
    prompt = f"""
    Analyze the following legal research query and extract key information:
    Query: "{state['query']}"
    
    Return a JSON object with:
    - legal_area: (e.g., contract, tort, property)
    - jurisdiction: (e.g., US, UK, New York)
    - entities: (list of companies or persons)
    - search_terms: (optimized keywords for vector search)
    - constraints: (any specific dates or conditions)
    
    Return ONLY JSON.
    """
    
    response = router.chat([{"role": "user", "content": prompt}], task="extraction")
    try:
        # Clean response to handle potential markdown
        if response.startswith("```json"):
            response = response.split("```json")[1].split("```")[0].strip()
        elif response.startswith("```"):
            response = response.split("```")[1].split("```")[0].strip()
        
        filters = json.loads(response)
    except Exception as e:
        logger.error(f"Failed to parse query analysis: {e}")
        filters = {"search_terms": state["query"]}
        
    return {"extracted_filters": filters, "status": "retrieving"}

def retrieve_from_qdrant(state: ResearchState) -> Dict[str, Any]:
    """Node: Retrieve relevant document chunks from Qdrant."""
    router = LLMRouter(organization_id=state["org_id"])
    qdrant = QdrantClient()
    
    # Use search terms or original query for embedding
    search_query = state["extracted_filters"].get("search_terms", state["query"])
    # Ensure search_query is a string (LLM might return a list)
    if isinstance(search_query, list):
        search_query = " ".join(search_query)
    query_vector = router.embed(search_query)
    
    results = qdrant.search_document_chunks(
        query_vector=query_vector,
        org_id=state["org_id"],
        matter_id=state["matter_id"],
        limit=20
    )
    
    return {"chunks": results, "status": "reranking"}

def rerank_results(state: ResearchState) -> Dict[str, Any]:
    """Node: Rerank chunks using LLM to select top candidates."""
    if not state["chunks"]:
        return {"reranked": [], "status": "synthesizing"}
        
    router = LLMRouter(organization_id=state["org_id"])
    
    # Simple reranking logic: use LLM to score relevance
    # For speed in a production app, we could use a dedicated cross-encoder
    # but for now we'll select the top 5 most relevant looking ones
    
    prompt = f"""
    Below are some document excerpts for the query: "{state['query']}"
    
    Excerpts:
    {json.dumps([{ 'id': c['document_id'], 'text': c['text'][:200] } for c in state['chunks']])}
    
    Select the indices of the top 5 most relevant excerpts for answering the query.
    Return ONLY a JSON list of IDs.
    """
    
    # In a real scenario, we'd do more sophisticated reranking.
    # For now, let's just take the first 5 if LLM fails or for simplicity.
    reranked = state["chunks"][:8]
    
    return {"reranked": reranked, "status": "synthesizing"}

def synthesize_with_llm(state: ResearchState) -> Dict[str, Any]:
    """Node: Synthesize the final answer with citations."""
    router = LLMRouter(organization_id=state["org_id"])
    
    context = "\n\n".join([
        f"[Source {i+1}]: {c['text']}" 
        for i, c in enumerate(state["reranked"])
    ])
    
    prompt = f"""
    You are LexAI, a senior legal research assistant. 
    Answer the following query using ONLY the provided source material.
    
    Query: "{state['query']}"
    
    Source Material:
    {context}
    
    Instructions:
    1. Use a professional, clear legal tone.
    2. Provide direct citations in the format [Source N] after relevant statements.
    3. If the sources do not contain the answer, state that clearly.
    4. Do NOT invent legal authorities.
    5. Include a list of used sources at the end if applicable.
    
    Answer:
    """
    
    # This node will be called as a generator for streaming in the view
    # But for LangGraph's internal state, we just return the full text.
    # The actual streaming happens in the SSE view by calling router.stream_chat
    
    return {"status": "completed"}

def create_research_graph():
    """Build the LangGraph StateGraph."""
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
