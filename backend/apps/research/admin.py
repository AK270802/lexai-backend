from django.contrib import admin
from .models import ResearchQuery


@admin.register(ResearchQuery)
class ResearchQueryAdmin(admin.ModelAdmin):
    list_display = ('user', 'matter', 'query', 'model_used', 'tokens_used', 'created_at')
    list_filter = ('organization', 'user', 'matter', 'model_used', 'created_at')
    search_fields = ('query', 'response', 'user__name', 'user__email')
    readonly_fields = ('created_at',)
