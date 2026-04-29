from django.urls import path

from apps.comments.views import (
    CommentListView,
    CommentCreateView,
    CommentUpdateView,
    CommentReplyView,
    CommentResolveView,
)


urlpatterns = [
    path('', CommentListView.as_view(), name='comments_list'),
    path('create/', CommentCreateView.as_view(), name='comments_create'),
    path('<uuid:id>/', CommentUpdateView.as_view(), name='comments_update'),
    path('<uuid:id>/reply/', CommentReplyView.as_view(), name='comments_reply'),
    path('<uuid:id>/resolve/', CommentResolveView.as_view(), name='comments_resolve'),
]

