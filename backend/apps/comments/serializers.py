from rest_framework import serializers

from apps.comments.models import Comment


class CommentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = (
            'id',
            'matter',
            'document',
            'user',
            'user_name',
            'parent',
            'anchor',
            'text',
            'status',
            'resolved_at',
            'resolved_by',
            'created_at',
            'updated_at',
            'replies',
        )
        read_only_fields = ('id', 'user', 'status', 'resolved_at', 'resolved_by', 'created_at', 'updated_at')

    def get_replies(self, obj):
        qs = obj.replies.all().order_by('created_at')
        return CommentReplySerializer(qs, many=True).data


class CommentCreateSerializer(serializers.Serializer):
    matter_id = serializers.UUIDField()
    document_id = serializers.UUIDField()
    anchor = serializers.DictField(required=False, default=dict)
    text = serializers.CharField()


class CommentUpdateSerializer(serializers.Serializer):
    text = serializers.CharField(required=False)


class CommentReplySerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)

    class Meta:
        model = Comment
        fields = ('id', 'user', 'user_name', 'text', 'created_at')

