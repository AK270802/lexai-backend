import logging
import threading
from typing import List

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_instance = None


class EmbeddingService:
    """Singleton wrapper around sentence-transformers for local CPU/GPU embeddings."""

    MODEL_NAME = "BAAI/bge-small-en-v1.5"
    DIMENSIONS = 384

    def __init__(self):
        self._model = None
        self._model_lock = threading.Lock()

    @classmethod
    def get_instance(cls) -> "EmbeddingService":
        global _instance
        if _instance is None:
            with _lock:
                if _instance is None:
                    _instance = cls()
        return _instance

    def _load_model(self):
        if self._model is None:
            with self._model_lock:
                if self._model is None:
                    from sentence_transformers import SentenceTransformer
                    logger.info(f"Loading embedding model {self.MODEL_NAME}...")
                    self._model = SentenceTransformer(self.MODEL_NAME)
                    logger.info("Embedding model loaded.")

    def embed(self, text: str) -> List[float]:
        self._load_model()
        text = (text or "").strip()[:20000]
        vectors = self._model.encode([text], normalize_embeddings=True)
        return vectors[0].tolist()

    def embed_batch(self, texts: List[str], batch_size: int = 32) -> List[List[float]]:
        self._load_model()
        cleaned = [(t or "").strip()[:20000] for t in texts]
        all_vectors = self._model.encode(
            cleaned,
            batch_size=batch_size,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        return [v.tolist() for v in all_vectors]
