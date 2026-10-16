import asyncio
from typing import Set, Dict, Any
from app.core.time_utils import get_ist_now

class Broadcaster:
    def __init__(self):
        self._listeners: Set[asyncio.Queue] = set()
        self.version: int = 1

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        self._listeners.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        self._listeners.discard(q)

    async def notify(self, event_type: str, data: Dict[str, Any]):
        self.version += 1
        payload = {
            "type": event_type,
            "version": self.version,
            "timestamp": get_ist_now().isoformat(),
            "data": data
        }
        for q in list(self._listeners):
            try:
                q.put_nowait(payload)
            except Exception:
                pass

    def notify_sync(self, event_type: str, data: Dict[str, Any]):
        """Synchronous notification helper for synchronous DB handlers"""
        try:
            loop = asyncio.get_running_loop()
            asyncio.run_coroutine_threadsafe(self.notify(event_type, data), loop)
        except RuntimeError:
            # If no running loop in current thread
            self.version += 1

broadcaster = Broadcaster()
