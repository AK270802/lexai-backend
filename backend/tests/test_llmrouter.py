import pytest
from unittest.mock import MagicMock, patch
from services.llmrouter import LLMRouter
from apps.authapp.models import Organization

@pytest.fixture
def org(db):
    return Organization.objects.create(name="Test Org", llm_config={
        "provider": "openrouter",
        "models": {
            "research": "gpt-4",
            "extraction": "gpt-3.5-turbo",
            "drafting": "claude-3",
        }
    })

def test_llm_router_default_config():
    with patch('os.getenv') as mock_env:
        mock_env.side_effect = lambda k, d=None: {
            "DEFAULT_LLM_PROVIDER": "ollama",
            "OLLAMA_HOST": "http://localhost:11434"
        }.get(k, d)
        
        router = LLMRouter()
        assert router.provider == "ollama"
        assert router.config["ollama_host"] == "http://localhost:11434"

def test_llm_router_org_config(org):
    with patch('os.getenv') as mock_env:
        mock_env.side_effect = lambda k, d=None: {
            "OPENROUTER_API_KEY": "sk-test-key",
            "OPENROUTER_BASE_URL": "https://openrouter.ai/api/v1"
        }.get(k, d)
        router = LLMRouter(organization_id=str(org.id))
        assert router.provider == "openrouter"
        assert router.config["models"]["research"] == "gpt-4"

@patch('ollama.Client')
def test_llm_router_chat_ollama(mock_ollama, db):
    mock_client = MagicMock()
    mock_ollama.return_value = mock_client
    mock_client.chat.return_value = {'message': {'content': 'Hello from Ollama'}}
    
    router = LLMRouter()
    router.provider = "ollama"
    router.ollama_client = mock_client
    
    response = router.chat([{"role": "user", "content": "Hi"}])
    assert response == "Hello from Ollama"
    mock_client.chat.assert_called_once()

@patch('openai.OpenAI')
def test_llm_router_chat_openrouter(mock_openai, db):
    mock_client = MagicMock()
    mock_openai.return_value = mock_client
    mock_client.chat.completions.create.return_value.choices[0].message.content = "Hello from OpenRouter"
    
    router = LLMRouter()
    router.provider = "openrouter"
    router.openrouter_client = mock_client
    
    response = router.chat([{"role": "user", "content": "Hi"}], task="research")
    assert response == "Hello from OpenRouter"

@patch('ollama.Client')
def test_llm_router_embed(mock_ollama, db):
    mock_client = MagicMock()
    mock_ollama.return_value = mock_client
    mock_client.embeddings.return_value = {'embedding': [0.1, 0.2, 0.3]}
    
    router = LLMRouter()
    embedding = router.embed("Hello")
    assert embedding == [0.1, 0.2, 0.3]
    mock_client.embeddings.assert_called_once()
