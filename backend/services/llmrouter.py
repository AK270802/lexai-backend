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
            "provider": os.getenv("DEFAULT_LLM_PROVIDER", "openrouter"),
            "ollama_host": os.getenv("OLLAMA_HOST", "http://localhost:11434"),
            "openrouter_api_key": os.getenv("OPENROUTER_API_KEY"),
            "openrouter_base_url": os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
            "models": {
                "research": os.getenv("MODEL_RESEARCH", "meta-llama/llama-3.2-3b-instruct:free"),
                "extraction": os.getenv("MODEL_EXTRACTION", "meta-llama/llama-3.2-3b-instruct:free"),
                "drafting": os.getenv("MODEL_DRAFTING", "meta-llama/llama-3.2-3b-instruct:free"),
                "embedding": os.getenv("MODEL_EMBEDDING", "nvidia/llama-nemotron-embed-vl-1b-v2:free"),
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
        """Generate embeddings."""
        
        import requests
    
        model = self.config["models"]["embedding"]
    
        try:
            if self.provider == "openrouter":
            
                # NVIDIA multimodal embedding model
                if "nvidia/llama-nemotron-embed-vl" in model:
                
                    response = requests.post(
                        f"{self.config['openrouter_base_url']}/embeddings",
                        headers={
                            "Authorization": f"Bearer {self.config['openrouter_api_key']}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": model,
                            "input": [
                                {
                                    "content": [
                                        {
                                            "type": "text",
                                            "text": text[:20000]
                                        }
                                    ]
                                }
                            ],
                            "encoding_format": "float"
                        },
                        timeout=120
                    )
    
                    response.raise_for_status()
    
                    data = response.json()
    
                    if not data.get("data"):
                        raise ValueError(
                            f"No embedding data received from model: {model}. "
                            f"Response: {data}"
                        )
    
                    embedding = data["data"][0]["embedding"]
    
                else:
                
                    response = self.openrouter_client.embeddings.create(
                        model=model,
                        input=text[:20000]
                    )
    
                    if not response.data:
                        raise ValueError(
                            f"No embedding data received from model: {model}"
                        )
    
                    embedding = response.data[0].embedding
    
                if not embedding:
                    raise ValueError(
                        f"Empty embedding returned from model: {model}"
                    )
    
                return embedding
    
            elif self.provider == "ollama":
            
                client = ollama.Client(
                    host=self.config["ollama_host"]
                )
    
                response = client.embed(
                    model=model,
                    input=text[:20000]
                )
    
                embeddings = response.get("embeddings")
    
                if not embeddings:
                    raise ValueError(
                        f"No embeddings returned from Ollama model: {model}"
                    )
    
                return embeddings[0]
    
            else:
                raise ValueError(
                    f"Unsupported embedding provider: {self.provider}"
                )
    
        except Exception as e:
            logger.exception(f"LLM Embedding error: {str(e)}")
            raise
        