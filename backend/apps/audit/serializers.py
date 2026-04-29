from rest_framework import serializers

from apps.audit.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.name', read_only=True)
    actor_email = serializers.CharField(source='actor.email', read_only=True)

    class Meta:
        model = AuditLog
        fields = (
            'id',
            'actor',
            'actor_name',
            'actor_email',
            'action',
            'entity_type',
            'entity_id',
            'metadata',
            'created_at',
        )
        read_only_fields = fields

