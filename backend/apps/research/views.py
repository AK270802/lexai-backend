import json
import logging
import asyncio
from django.http import StreamingHttpResponse
from rest_framework import status, permissions, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import ResearchQuery
from .serializers import ResearchQuerySerializer
from services.research_graph import create_research_graph, ResearchState
from services.llmrouter import LLMRouter
from services.prompts import research_synthesis_prompt, research_query_analysis_prompt

logger = logging.getLogger(__name__)


class ResearchHistoryView(generics.ListAPIView):
    serializer_class = ResearchQuerySerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return ResearchQuery.objects.filter(
            organization=self.request.user.organization
        ).order_by("-created_at")


class ResearchDetailView(generics.RetrieveAPIView):
    serializer_class = ResearchQuerySerializer
    permission_classes = (permissions.IsAuthenticated,)
    lookup_field = "id"

    def get_queryset(self):
        return ResearchQuery.objects.filter(organization=self.request.user.organization)


class ResearchStreamView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        query = (request.data.get("query") or "").strip()
        matter_id = request.data.get("matter_id") or None

        if not query:
            return Response({"error": "Query is required"}, status=status.HTTP_400_BAD_REQUEST)

        org_id = str(request.user.organization.id)

        def _sse(type_: str, **kwargs) -> str:
            return f"data: {json.dumps({'type': type_, **kwargs})}\n\n"

        def stream_generator():
            graph = create_research_graph()
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
                status="analyzing",
            )

            try:
                yield _sse("status", message="Analyzing query…")
                state = graph.invoke(state)

                chunks_count = len(state.get("chunks", []))
                yield _sse("status", message=f"Retrieved {chunks_count} sources. Preparing synthesis…")

                # Build structured sources list for the frontend
                sources = []
                for i, chunk in enumerate(state.get("reranked", [])):
                    sources.append({
                        "id": str(chunk.get("id", i)),
                        "document_id": str(chunk.get("document_id", "")),
                        "document_name": chunk.get("document_name") or "Document",
                        "excerpt": (chunk.get("text") or "")[:400],
                        "score": float(chunk.get("score") or 0),
                        "page_number": int(chunk.get("page_number") or 1),
                    })

                yield _sse("sources", sources=sources)
                yield _sse("status", message="Synthesizing legal analysis…")

                # Build premium synthesis prompt
                source_dicts = [
                    {
                        "index": i + 1,
                        "text": chunk.get("text") or "",
                        "document_name": chunk.get("document_name") or "Document",
                        "page_number": int(chunk.get("page_number") or 1),
                    }
                    for i, chunk in enumerate(state.get("reranked", []))
                ]
                synthesis_prompt = research_synthesis_prompt(query, source_dicts)
                messages = [{"role": "user", "content": synthesis_prompt}]

                full_answer = ""
                router = LLMRouter(organization_id=org_id)

                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    gen = router.stream_chat(messages, task="research")
                    while True:
                        try:
                            token = loop.run_until_complete(gen.__anext__())
                            full_answer += token
                            yield _sse("token", token=token)
                        except StopAsyncIteration:
                            break
                finally:
                    loop.close()

                # Persist to history
                ResearchQuery.objects.create(
                    organization=request.user.organization,
                    user=request.user,
                    matter_id=matter_id,
                    query=query,
                    response=full_answer,
                    sources=sources,
                    model_used="research-model",
                )

                yield _sse("done", message="Complete")

            except Exception as e:
                logger.error(f"Research streaming error: {e}", exc_info=True)
                yield _sse("error", message=str(e))

        response = StreamingHttpResponse(stream_generator(), content_type="text/event-stream")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response
