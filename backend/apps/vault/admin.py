from django.contrib import admin
from .models import ClauseVaultEntry


@admin.register(ClauseVaultEntry)
class ClauseVaultEntryAdmin(admin.ModelAdmin):
    list_display = ('label', 'category', 'jurisdiction', 'organization', 'created_by')
    list_filter = ('organization', 'category', 'jurisdiction', 'created_at')
    search_fields = ('label', 'text', 'category')
    readonly_fields = ('created_at', 'updated_at')
