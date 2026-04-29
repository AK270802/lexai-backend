from django.contrib import admin
from .models import Document, DocumentChunk


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('file_name', 'matter', 'file_type', 'parse_status', 'uploaded_by', 'created_at')
    list_filter = ('matter', 'parse_status', 'file_type', 'created_at')
    search_fields = ('file_name', 'matter__title', 'uploaded_by__name')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(DocumentChunk)
class DocumentChunkAdmin(admin.ModelAdmin):
    list_display = ('document', 'chunk_index', 'page_number', 'created_at')
    list_filter = ('document', 'page_number')
    search_fields = ('document__file_name', 'content')
