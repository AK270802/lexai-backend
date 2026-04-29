from rest_framework import serializers
from .models import Matter, Task, Milestone

class MatterSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = Matter
        fields = ('id', 'title', 'description', 'status', 'parties', 'organization_name', 'created_at')
        read_only_fields = ('id', 'created_at')


class TaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source='assigned_to.name', read_only=True)
    matter_title = serializers.CharField(source='matter.title', read_only=True)

    class Meta:
        model = Task
        fields = ('id', 'matter', 'matter_title', 'title', 'description', 'status', 'assigned_to', 'assigned_to_name', 'due_date', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')


class MilestoneSerializer(serializers.ModelSerializer):
    matter_title = serializers.CharField(source='matter.title', read_only=True)

    class Meta:
        model = Milestone
        fields = ('id', 'matter', 'matter_title', 'title', 'description', 'due_date', 'is_completed', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')
