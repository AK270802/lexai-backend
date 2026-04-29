from rest_framework import serializers
from .models import ResearchQuery

class ResearchQuerySerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)
    matter_title = serializers.CharField(source='matter.title', read_only=True)

    class Meta:
        model = ResearchQuery
        fields = (
            'id', 
            'user', 
            'user_name',
            'matter', 
            'matter_title',
            'query', 
            'response', 
            'citations', 
            'sources',
            'model_used', 
            'tokens_used', 
            'created_at'
        )
        read_only_fields = ('id', 'user', 'created_at')
