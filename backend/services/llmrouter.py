import os
import json
import time
import logging
from typing import List, Dict, Any, AsyncGenerator, Optional
import ollama
from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from django.conf import settings
from apps.authapp.models import Organization

logger = logging.getLogger(__name__)

class LLMRouter:
    def __init__(self, organization_id: Optional[str] = None):
        self.organization_id = organization_id
        self.config = self._get_config()
        self._setup_clients()

    def _get_config(self) -> Dict[str, Any]:
        """Load configuration from Organization settings or environment variables."""
        default_config = {
            "provider": os.getenv("DEFAULT_LLM_PROVIDER", "ollama"),
            "ollama_host": os.getenv("OLLAMA_HOST", "http://localhost:11434"),
            "openrouter_api_key": os.getenv("OPENROUTER_API_KEY"),
            "openrouter_base_url": os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
            "models": {
                "research": os.getenv("MODEL_RESEARCH", "llama3"),
                "extraction": os.getenv("MODEL_EXTRACTION", "llama3"),
                "drafting": os.getenv("MODEL_DRAFTING", "llama3"),
                "embedding": os.getenv("MODEL_EMBEDDING", "nomic-embed-text"),
            }
        }

        if self.organization_id:
            try:
                org = Organization.objects.get(id=self.organization_id)
                org_config = org.llm_config
                if org_config:
                    # Merge org config with defaults
                    if "provider" in org_config:
                        default_config["provider"] = org_config["provider"]
                    if "ollama_host" in org_config:
                        default_config["ollama_host"] = org_config["ollama_host"]
                    if "models" in org_config:
                        default_config["models"].update(org_config["models"])
            except Organization.DoesNotExist:
                logger.warning(f"Organization {self.organization_id} not found, using default LLM config.")

        return default_config

    def _setup_clients(self):
        """Initialize the appropriate client based on the provider."""
        self.provider = self.config["provider"]
        if self.provider == "ollama":
            self.ollama_client = ollama.Client(host=self.config["ollama_host"])
        elif self.provider == "openrouter":
            self.openrouter_client = OpenAI(
                base_url=self.config["openrouter_base_url"],
                api_key=self.config["openrouter_api_key"],
            )
        else:
            raise ValueError(f"Unsupported LLM provider: {self.provider}")

    def _get_model(self, task: str) -> str:
        """Get the model name for a specific task."""
        return self.config["models"].get(task, self.config["models"]["research"])

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((Exception,)),
        reraise=True
    )
    def chat(self, messages: List[Dict[str, str]], task: str = "research") -> str:
        """Synchronous chat completion."""
        model = self._get_model(task)
        start_time = time.time()

        try:
            if self.provider == "ollama":
                response = self.ollama_client.chat(model=model, messages=messages)
                content = response['message']['content']
            elif self.provider == "openrouter":
                response = self.openrouter_client.chat.completions.create(
                    model=model,
                    messages=messages,
                )
                content = response.choices[0].message.content

            latency = time.time() - start_time
            logger.info(f"LLM Chat: provider={self.provider}, model={model}, task={task}, latency={latency:.2f}s")
            return content
        except Exception as e:
            logger.error(f"LLM Chat error: {str(e)}")
            raise

    async def stream_chat(self, messages: List[Dict[str, str]], task: str = "research") -> AsyncGenerator[str, None]:
        """Asynchronous streaming chat completion."""
        model = self._get_model(task)
        
        try:
            if self.provider == "ollama":
                # Ollama's python client doesn't support async generators natively easily with Client
                # We use the sync generator for now, but in a real async environment we'd want more.
                for chunk in self.ollama_client.chat(model=model, messages=messages, stream=True):
                    if 'message' in chunk and 'content' in chunk['message']:
                        yield chunk['message']['content']
            elif self.provider == "openrouter":
                response = self.openrouter_client.chat.completions.create(
                    model=model,
                    messages=messages,
                    stream=True,
                )
                for chunk in response:
                    if chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
        except Exception as e:
            logger.error(f"LLM Stream Chat error: {str(e)}")
            raise

    def embed(self, text: str) -> List[float]:
        """Generate embeddings using Ollama (always)."""
        model = self.config["models"]["embedding"]
        try:
            # We always use Ollama for embeddings as per requirements
            client = ollama.Client(host=self.config["ollama_host"])
            response = client.embeddings(model=model, prompt=text)
            return response['embedding']
        except Exception as e:
            logger.error(f"LLM Embedding error: {str(e)}")
            raise
