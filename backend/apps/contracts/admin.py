from django.contrib import admin
from .models import ContractClause, Redline


@admin.register(ContractClause)
class ContractClauseAdmin(admin.ModelAdmin):
    list_display = ('clause_type', 'document', 'risk_level', 'page_number', 'confidence_score')
    list_filter = ('document', 'risk_level', 'standard_deviation', 'extracted_by')
    search_fields = ('clause_type', 'raw_text', 'document__file_name')
    readonly_fields = ('created_at',)


@admin.register(Redline)
class RedlineAdmin(admin.ModelAdmin):
    list_display = ('clause', 'user', 'action', 'status', 'created_at')
    list_filter = ('clause', 'status', 'action', 'created_at')
    search_fields = ('clause__clause_type', 'user__name', 'original_text', 'revised_text')
    readonly_fields = ('created_at',)
