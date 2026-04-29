import json
import logging
import asyncio
from typing import AsyncGenerator
from django.http import StreamingHttpResponse
from rest_framework import status, permissions, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import ResearchQuery
from .serializers import ResearchQuerySerializer
from services.research_graph import create_research_graph, ResearchState
from services.llmrouter import LLMRouter

logger = logging.getLogger(__name__)

class ResearchHistoryView(generics.ListAPIView):
    serializer_class = ResearchQuerySerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return ResearchQuery.objects.filter(
            organization=self.request.user.organization
        ).order_by('-created_at')

class ResearchDetailView(generics.RetrieveAPIView):
    serializer_class = ResearchQuerySerializer
    permission_classes = (permissions.IsAuthenticated,)
    lookup_field = 'id'

    def get_queryset(self):
        return ResearchQuery.objects.filter(
            organization=self.request.user.organization
        )

class ResearchStreamView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        query = request.data.get('query')
        matter_id = request.data.get('matter_id')
        
        if not query:
            return Response({"error": "Query is required"}, status=status.HTTP_400_BAD_REQUEST)

        org_id = str(request.user.organization.id)
        user_id = str(request.user.id)
        
        # Initialize LangGraph
        graph = create_research_graph()
        
        def stream_generator():
            # Initial state
            state = ResearchState(
                query=query,
                org_id=org_id,
                matter_id=matter_id,
                extracted_filters={},
                chunks=[],
                reranked=[],
                answer="",
                citations=[],
                sources=[],
                status="analyzing"
            )
            
            # Step-by-step graph execution
            # LangGraph's astream() or stream() can be used.
            # For simplicity, we'll execute the nodes and stream status events.
            
            try:
                # 1. Analyze
                yield f"data: {json.dumps({'event': 'status', 'message': 'Analyzing query...'})}\n\n"
                state = graph.invoke(state)
                
                # 2. Retrieve & Rerank (Already done by invoke up to synthesis)
                chunks_count = len(state.get("chunks", []))
                yield f"data: {json.dumps({'event': 'status', 'message': f'Found {chunks_count} sources. Reranking...'})}\n\n"
                
                # 3. Stream Sources
                sources = []
                for i, chunk in enumerate(state.get("reranked", [])):
                    source = {
                        "id": str(chunk.get("id", i)),
                        "document_id": str(chunk.get("document_id")),
                        "document_name": chunk.get("document_name", "Document"),
                        "excerpt": chunk.get("text", ""),
                        "score": chunk.get("score", 0),
                        "page_number": chunk.get("page_number", 1)
                    }
                    sources.append(source)
                
                yield f"data: {json.dumps({'event': 'sources', 'data': sources})}\n\n"
                
                # 4. Synthesize with streaming tokens
                yield f"data: {json.dumps({'event': 'status', 'message': 'Synthesizing answer...'})}\n\n"
                
                router = LLMRouter(organization_id=org_id)
                context = "\n\n".join([
                    f"[Source {i+1}]: {c['text']}" 
                    for i, c in enumerate(state.get("reranked", []))
                ])
                
                messages = [
                    {"role": "system", "content": "You are LexAI, a senior legal research assistant. Answer using ONLY provided sources with [Source N] citations."},
                    {"role": "user", "content": f"Query: {query}\n\nContext:\n{context}"}
                ]
                
                full_answer = ""
                
                # Run the async stream_chat in an event loop
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    async_token_generator = router.stream_chat(messages, task="research")
                    while True:
                        try:
                            token = loop.run_until_complete(async_token_generator.__anext__())
                            full_answer += token
                            yield f"data: {json.dumps({'event': 'token', 'data': token})}\n\n"
                        except StopAsyncIteration:
                            break
                finally:
                    loop.close()
                
                # 5. Save history
                ResearchQuery.objects.create(
                    organization=request.user.organization,
                    user=request.user,
                    matter_id=matter_id,
                    query=query,
                    response=full_answer,
                    sources=sources,
                    model_used="research-model"
                )
                
                yield f"data: {json.dumps({'event': 'done', 'message': 'Complete'})}\n\n"
                
            except Exception as e:
                logger.error(f"Research streaming error: {e}")
                yield f"data: {json.dumps({'event': 'error', 'message': str(e)})}\n\n"

        return StreamingHttpResponse(stream_generator(), content_type='text/event-stream')
