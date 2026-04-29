from rest_framework import serializers

from apps.playbooks.models import Playbook


class PlaybookSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)

    class Meta:
        model = Playbook
        fields = (
            'id',
            'name',
            'description',
            'status',
            'rules',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_by', 'created_at', 'updated_at')

