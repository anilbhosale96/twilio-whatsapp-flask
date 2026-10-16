import asyncio
from typing import Set, Dict, Any, Optional
from app.core.time_utils import get_ist_now

class Broadcaster:
    def __init__(self):
        self._listeners: Set[asyncio.Queue] = set()
        self.version: int = 1
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def set_loop(self, loop: asyncio.AbstractEventLoop):
        self._loop = loop

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        self._listeners.add(q)
        try:
            self._loop = asyncio.get_running_loop()
        except RuntimeError:
            pass
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
        """Synchronous notification helper for synchronous DB handlers in worker threads"""
        self.version += 1
        payload = {
            "type": event_type,
            "version": self.version,
            "timestamp": get_ist_now().isoformat(),
            "data": data
        }

        loop = self._loop
        if not loop or loop.is_closed():
            try:
                loop = asyncio.get_running_loop()
                self._loop = loop
            except RuntimeError:
                loop = None

        if loop and not loop.is_closed():
            try:
                asyncio.run_coroutine_threadsafe(self.notify(event_type, data), loop)
                return
            except Exception:
                pass

        # Fallback: put directly into subscriber queues if safe
        for q in list(self._listeners):
            try:
                q.put_nowait(payload)
            except Exception:
                pass

broadcaster = Broadcaster()

