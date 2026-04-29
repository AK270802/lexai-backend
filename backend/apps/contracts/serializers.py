from rest_framework import serializers

from apps.contracts.models import ContractClause, Redline


class ContractClauseSerializer(serializers.ModelSerializer):
    highlights = serializers.SerializerMethodField()

    class Meta:
        model = ContractClause
        fields = (
            'id',
            'clause_type',
            'raw_text',
            'start_char',
            'end_char',
            'page_number',
            'highlights',
            'risk_level',
            'risk_reason',
            'standard_deviation',
            'suggested_revision',
            'confidence_score',
            'created_at',
        )

    def get_highlights(self, obj):
        if isinstance(obj.bbox_coords, dict):
            return obj.bbox_coords.get('highlights', [])
        return []


class RedlineSerializer(serializers.ModelSerializer):
    clause_id = serializers.UUIDField(source='clause.id', read_only=True)
    user_name = serializers.CharField(source='user.name', read_only=True)

    class Meta:
        model = Redline
        fields = (
            'id',
            'clause_id',
            'user',
            'user_name',
            'action',
            'original_text',
            'revised_text',
            'status',
            'created_at',
        )
        read_only_fields = ('id', 'status', 'created_at', 'user')


class CreateRedlineSerializer(serializers.Serializer):
    clause_id = serializers.UUIDField()
    action = serializers.ChoiceField(choices=['revision', 'deletion'], default='revision')
    revised_text = serializers.CharField(required=False, allow_blank=True)

