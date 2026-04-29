# Local Development Setup with GPU (RTX 3050)

## Prerequisites

### 1. Install NVIDIA Drivers
- Download and install the latest NVIDIA drivers for RTX 3050
- https://www.nvidia.com/Download/index.aspx

### 2. Install CUDA 12.1
- Download CUDA 12.1 from: https://developer.nvidia.com/cuda-downloads
- For Windows: Select Windows, x86_64, 11, exe (local)
- Install with default settings

### 3. Install cuDNN 8.9+
- Download cuDNN for CUDA 12.x from: https://developer.nvidia.com/cudnn
- Extract and copy files to CUDA installation directory:
  - `bin/` → `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.1\bin`
  - `include/` → `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.1\include`
  - `lib/` → `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.1\lib`

### 4. Verify CUDA Installation
```bash
nvcc --version
nvidia-smi
```

## Python Environment Setup

### 1. Activate Virtual Environment
```bash
cd backend
# If using venv
venv\Scripts\activate
# If using conda
conda activate lexai
```

### 2. Install PyTorch with CUDA Support
```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

### 3. Install Other Dependencies
```bash
pip install -r requirements.txt
```

### 4. Verify PyTorch CUDA Support
```bash
python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}'); print(f'CUDA device: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else None}')"
```

## Environment Variables

Create `.env` file in `backend/` directory:

```bash
# Database
DATABASE_URL=postgres://lexai:lexai@localhost:5432/lexai
POSTGRES_DB=lexai
POSTGRES_USER=lexai
POSTGRES_PASSWORD=lexai
POSTGRES_HOST=localhost

# Redis
REDIS_URL=redis://localhost:6379/0

# MinIO (Storage)
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=lexai
MINIO_SECRET_KEY=lexai_secret
MINIO_BUCKET=lexai-documents

# Qdrant (Vector DB)
QDRANT_HOST=http://localhost:6333

# Ollama (LLM)
OLLAMA_HOST=http://localhost:11434

# Frontend
FRONTEND_URL=http://localhost:3000

# GPU Configuration
CUDA_VISIBLE_DEVICES=0
TORCH_CUDA_ARCH_LIST="8.6"  # RTX 3050 architecture
```

## Start Services

### 1. Start Infrastructure Services (Docker)
```bash
# Start only the infrastructure services (db, redis, minio, qdrant, ollama)
docker-compose up -d db redis minio qdrant ollama
```

### 2. Run Database Migrations
```bash
cd backend
python manage.py migrate
```

### 3. Start Django Backend (Terminal 1)
```bash
cd backend
python manage.py runserver 0.0.0.0:8000
```

### 4. Start Celery Worker (Terminal 2)
```bash
cd backend
celery -A config worker --loglevel=info
```

### 5. Start Celery Beat (Optional - for scheduled tasks, Terminal 3)
```bash
cd backend
celery -A config beat --loglevel=info
```

## Configure Docling to Use GPU

Edit `backend/utils/doclingextractor.py` to enable GPU:

```python
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.base_models import InputFormat
from docling.backend.pypdfium2_backend import PyPdfiumDocumentBackend

class DoclingExtractor:
    def __init__(self):
        self.converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(
                    backend=PyPdfiumDocumentBackend(),
                    # Enable GPU acceleration if available
                    # Note: Docling may not fully support GPU yet
                )
            }
        )
    
    def extract_layout(self, file_path):
        doc = self.converter.convert(file_path)
        # ... rest of the code
```

## Troubleshooting

### CUDA Not Available
```bash
# Check if CUDA is properly installed
python -c "import torch; print(torch.cuda.is_available())"

# If False, check:
# 1. NVIDIA drivers are installed
# 2. CUDA is in PATH
# 3. PyTorch was installed with CUDA support
```

### Out of Memory on GPU
```bash
# Monitor GPU usage
nvidia-smi

# Reduce batch size in document processing
# Or fall back to CPU for large documents
```

### Docling GPU Support
Docling currently has limited GPU support. The OCR and layout models may still run on CPU. For full GPU acceleration, you may need to:
1. Use alternative OCR engines with GPU support (e.g., Tesseract with CUDA)
2. Wait for Docling to add better GPU support
3. Use a lighter-weight PDF extraction library

## Alternative: Use Lighter PDF Extraction

If GPU setup is too complex, consider using `pypdf` or `pdfplumber` instead of Docling for simpler text extraction:

```python
import pypdf

def extract_text_simple(pdf_path):
    text = ""
    with open(pdf_path, 'rb') as file:
        reader = pypdf.PdfReader(file)
        for page in reader.pages:
            text += page.extract_text()
    return text
```
