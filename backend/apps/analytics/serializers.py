from rest_framework import serializers
from .models import DailyMetrics, UsageSnapshot


class DailyMetricsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyMetrics
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class UsageSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = UsageSnapshot
        fields = '__all__'
        read_only_fields = ('id', 'timestamp')
