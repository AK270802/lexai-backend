import json
import logging
from typing import AsyncGenerator, Any, Dict
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)


class SSEStreamer:
    """Helper class for Server-Sent Events streaming."""
    
    @staticmethod
    def format_sse(data: Dict[str, Any], event: str = None) -> str:
        """Format data as SSE event."""
        lines = []
        if event:
            lines.append(f"event: {event}")
        lines.append(f"data: {json.dumps(data)}")
        lines.append("")
        return "\n".join(lines)
    
    @staticmethod
    async def stream_event(event: str, data: Dict[str, Any]) -> AsyncGenerator[str, None]:
        """Yield a single SSE event."""
        yield SSEStreamer.format_sse(data, event)
    
    @staticmethod
    async def stream_from_channel(channel_name: str) -> AsyncGenerator[str, None]:
        """Stream events from a Django Channels channel."""
        channel_layer = get_channel_layer()
        while True:
            message = await channel_layer.receive(channel_name)
            if message.get('type') == 'stream.close':
                break
            yield SSEStreamer.format_sse(
                message.get('data', {}),
                message.get('event')
            )
    
    @staticmethod
    def send_to_channel(channel_name: str, event: str, data: Dict[str, Any]):
        """Send an event to a Django Channels channel (sync wrapper)."""
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.send)(
            channel_name,
            {
                'type': 'stream.event',
                'event': event,
                'data': data
            }
        )