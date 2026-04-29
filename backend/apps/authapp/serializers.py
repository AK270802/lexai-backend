from rest_framework import serializers
from .models import User, Organization
from django.contrib.auth.password_validation import validate_password

class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ('id', 'name', 'llm_config', 'created_at')

class UserSerializer(serializers.ModelSerializer):
    organization = OrganizationSerializer(read_only=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'name', 'role', 'organization', 'created_at')

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    org_name = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('email', 'password', 'name', 'org_name')

    def create(self, validated_data):
        org_name = validated_data.pop('org_name')
        organization = Organization.objects.create(name=org_name)
        
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            name=validated_data['name'],
            organization=organization,
            role='admin'  # First user in org is admin
        )
        return user

class LLMSettingsSerializer(serializers.Serializer):
    provider = serializers.ChoiceField(choices=['ollama', 'openrouter'], default='ollama')
    ollama_host = serializers.CharField(required=False, allow_blank=True)
    models = serializers.DictField(
        child=serializers.CharField(),
        required=False
    )

    def validate_models(self, value):
        required_tasks = ['research', 'extraction', 'drafting']
        for task in required_tasks:
            if task not in value:
                # We can set defaults if missing, but let's just ensure they are strings
                pass
        return value
