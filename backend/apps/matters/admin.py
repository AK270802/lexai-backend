from django.contrib import admin
from .models import Matter, Task, Milestone


@admin.register(Matter)
class MatterAdmin(admin.ModelAdmin):
    list_display = ('title', 'organization', 'status', 'created_at')
    list_filter = ('organization', 'status', 'created_at')
    search_fields = ('title', 'description', 'organization__name')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'matter', 'status', 'assigned_to', 'due_date')
    list_filter = ('matter', 'status', 'assigned_to', 'due_date')
    search_fields = ('title', 'description', 'matter__title')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Milestone)
class MilestoneAdmin(admin.ModelAdmin):
    list_display = ('title', 'matter', 'due_date', 'is_completed')
    list_filter = ('matter', 'is_completed', 'due_date')
    search_fields = ('title', 'description', 'matter__title')
    readonly_fields = ('created_at', 'updated_at')
