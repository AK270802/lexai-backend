from django.contrib import admin
from .models import PortalToken, PortalAction


@admin.register(PortalToken)
class PortalTokenAdmin(admin.ModelAdmin):
    list_display = ('token_prefix', 'matter', 'document', 'expires_at', 'used_at', 'single_use')
    list_filter = ('organization', 'matter', 'expires_at', 'used_at', 'single_use')
    search_fields = ('token_prefix', 'matter__title')
    readonly_fields = ('token_hash', 'created_at')


@admin.register(PortalAction)
class PortalActionAdmin(admin.ModelAdmin):
    list_display = ('token', 'action', 'actor_name', 'created_at')
    list_filter = ('token', 'action', 'created_at')
    search_fields = ('action', 'actor_name', 'actor_email')
    readonly_fields = ('created_at',)
