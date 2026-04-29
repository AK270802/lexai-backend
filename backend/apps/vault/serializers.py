from rest_framework import serializers

from apps.vault.models import ClauseVaultEntry


class ClauseVaultEntrySerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)

    class Meta:
        model = ClauseVaultEntry
        fields = (
            'id',
            'label',
            'category',
            'text',
            'jurisdiction',
            'metadata',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_by', 'created_at', 'updated_at')

