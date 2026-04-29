from rest_framework import generics, permissions
from .models import Matter, Task, Milestone
from .serializers import MatterSerializer, TaskSerializer, MilestoneSerializer

class MatterListView(generics.ListCreateAPIView):
    serializer_class = MatterSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Matter.objects.filter(organization=self.request.user.organization)

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            created_by=self.request.user
        )

class MatterDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MatterSerializer
    permission_classes = (permissions.IsAuthenticated,)
    lookup_field = 'id'

    def get_queryset(self):
        return Matter.objects.filter(organization=self.request.user.organization)


class TaskListView(generics.ListCreateAPIView):
    serializer_class = TaskSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        matter_id = self.request.query_params.get('matter_id')
        queryset = Task.objects.filter(organization=self.request.user.organization)
        if matter_id:
            queryset = queryset.filter(matter_id=matter_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TaskSerializer
    permission_classes = (permissions.IsAuthenticated,)
    lookup_field = 'id'

    def get_queryset(self):
        return Task.objects.filter(organization=self.request.user.organization)


class MilestoneListView(generics.ListCreateAPIView):
    serializer_class = MilestoneSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        matter_id = self.request.query_params.get('matter_id')
        queryset = Milestone.objects.filter(organization=self.request.user.organization)
        if matter_id:
            queryset = queryset.filter(matter_id=matter_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class MilestoneDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MilestoneSerializer
    permission_classes = (permissions.IsAuthenticated,)
    lookup_field = 'id'

    def get_queryset(self):
        return Milestone.objects.filter(organization=self.request.user.organization)
