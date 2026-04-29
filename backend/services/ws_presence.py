import os
from typing import Dict, List

import redis


class PresenceStore:
    _fallback: dict = {}

    def __init__(self):
        self.redis = None
        try:
            r = redis.Redis.from_url(os.getenv('REDIS_URL', 'redis://localhost:6379/0'))
            r.ping()
            self.redis = r
        except Exception:
            self.redis = None

    def _key(self, org_id: str, matter_id: str) -> str:
        return f"lexai:presence:{org_id}:{matter_id}"

    def add(self, *, org_id: str, matter_id: str, user_id: str, ttl: int = 120) -> None:
        key = self._key(org_id, matter_id)
        if self.redis is None:
            PresenceStore._fallback.setdefault(key, set()).add(user_id)
            return
        pipe = self.redis.pipeline()
        pipe.sadd(key, user_id)
        pipe.expire(key, ttl)
        pipe.execute()

    def remove(self, *, org_id: str, matter_id: str, user_id: str) -> None:
        key = self._key(org_id, matter_id)
        if self.redis is None:
            PresenceStore._fallback.setdefault(key, set()).discard(user_id)
            return
        self.redis.srem(key, user_id)

    def list(self, *, org_id: str, matter_id: str) -> List[str]:
        key = self._key(org_id, matter_id)
        if self.redis is None:
            return list(PresenceStore._fallback.get(key, set()))
        ids = self.redis.smembers(key)
        return [i.decode('utf-8') for i in ids]
