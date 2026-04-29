from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('type', 'title', 'user', 'organization', 'read_at', 'created_at')
    list_filter = ('organization', 'type', 'read_at', 'created_at')
    search_fields = ('title', 'body', 'user__name', 'user__email')
    readonly_fields = ('created_at',)
