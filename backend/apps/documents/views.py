from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Document
from .serializers import DocumentSerializer
from tasks.ingestion import process_document_ingestion
from services.storage import StorageService

class DocumentListView(generics.ListCreateAPIView):
    serializer_class = DocumentSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Document.objects.filter(organization=self.request.user.organization)

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            uploaded_by=self.request.user
        )

class DocumentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DocumentSerializer
    permission_classes = (permissions.IsAuthenticated,)
    lookup_field = 'id'

    def get_queryset(self):
        return Document.objects.filter(organization=self.request.user.organization)

class DocumentUploadView(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        file = request.FILES.get('file')
        matter_id = request.data.get('matter_id')
        
        if not file:
            return Response({"error": "File is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Upload file to storage
        storage = StorageService()
        storage_path = f"documents/{request.user.organization.id}/{file.name}"
        
        if not storage.upload_file(file, storage_path):
            return Response({"error": "Failed to upload file to storage"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Create document record (matter_id can be None)
        document = Document.objects.create(
            organization=request.user.organization,
            matter_id=matter_id if matter_id else None,
            file_name=file.name,
            file_type=file.content_type or 'application/pdf',
            file_size=file.size,
            storage_path=storage_path,
            uploaded_by=request.user,
            parse_status='pending'
        )
        
        # Trigger document parsing in background
        process_document_ingestion.delay(str(document.id))
        
        serializer = DocumentSerializer(document)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
