from django.contrib import admin
from .models import DailyMetrics, UsageSnapshot


@admin.register(DailyMetrics)
class DailyMetricsAdmin(admin.ModelAdmin):
    list_display = ('organization', 'date', 'matters_created', 'documents_uploaded', 'research_queries')
    list_filter = ('organization', 'date')
    search_fields = ('organization__name',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(UsageSnapshot)
class UsageSnapshotAdmin(admin.ModelAdmin):
    list_display = ('organization', 'timestamp', 'total_storage_bytes', 'total_vectors', 'total_users')
    list_filter = ('organization', 'timestamp')
    search_fields = ('organization__name',)
    readonly_fields = ('timestamp',)
