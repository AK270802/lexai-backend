from rest_framework import serializers

from apps.portal.models import PortalToken, PortalAction


class PortalTokenCreateSerializer(serializers.Serializer):
    matter_id = serializers.UUIDField()
    document_id = serializers.UUIDField(required=False, allow_null=True)
    ttl_hours = serializers.IntegerField(required=False, min_value=1, max_value=168, default=24)
    single_use = serializers.BooleanField(required=False, default=False)
    permissions = serializers.DictField(required=False)


class PortalActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['acknowledge', 'approve', 'sign'])
    actor_name = serializers.CharField(required=False, allow_blank=True)
    actor_email = serializers.CharField(required=False, allow_blank=True)
    metadata = serializers.DictField(required=False, default=dict)


class PortalTokenAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortalToken
        fields = (
            'id',
            'token_prefix',
            'matter',
            'document',
            'expires_at',
            'used_at',
            'single_use',
            'permissions',
            'created_at',
        )


class PortalActionModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortalAction
        fields = ('id', 'action', 'actor_name', 'actor_email', 'metadata', 'created_at')

