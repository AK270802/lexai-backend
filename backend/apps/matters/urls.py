from django.urls import path
from .views import MatterListView, MatterDetailView, TaskListView, TaskDetailView, MilestoneListView, MilestoneDetailView

urlpatterns = [
    path('', MatterListView.as_view(), name='matter_list'),
    path('<uuid:id>/', MatterDetailView.as_view(), name='matter_detail'),
    path('tasks/', TaskListView.as_view(), name='task_list'),
    path('tasks/<uuid:id>/', TaskDetailView.as_view(), name='task_detail'),
    path('milestones/', MilestoneListView.as_view(), name='milestone_list'),
    path('milestones/<uuid:id>/', MilestoneDetailView.as_view(), name='milestone_detail'),
]
