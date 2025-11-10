"""Tag management views."""

from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend

from finance.models import Tag
from finance.serializers import TagSerializer


class TagViewSet(viewsets.ModelViewSet):
    """ViewSet for managing tags."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TagSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        return Tag.objects.filter(user=self.request.user, is_deleted=False)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
