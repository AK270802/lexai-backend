from rest_framework import serializers

from apps.drafts.models import DraftTemplate


class DraftTemplateSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)

    class Meta:
        model = DraftTemplate
        fields = (
            'id',
            'template_type',
            'title',
            'description',
            'storage_path',
            'variables',
            'is_active',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_by', 'created_at', 'updated_at')


class DraftGenerateSerializer(serializers.Serializer):
    matter_id = serializers.UUIDField()
    template_type = serializers.ChoiceField(choices=[c[0] for c in DraftTemplate.TEMPLATE_CHOICES])
    template_id = serializers.UUIDField(required=False, allow_null=True)
    title = serializers.CharField(required=False, allow_blank=True)
    inputs = serializers.DictField(child=serializers.JSONField(), required=True)
    apply_preferred_clauses = serializers.BooleanField(required=False, default=True)


class DraftSaveSerializer(serializers.Serializer):
    matter_id = serializers.UUIDField()
    template_type = serializers.ChoiceField(choices=[c[0] for c in DraftTemplate.TEMPLATE_CHOICES])
    title = serializers.CharField()
    draft_content = serializers.CharField()
    used_clause_ids = serializers.ListField(child=serializers.UUIDField(), required=False, default=list)

