# notifications/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from drf_spectacular.utils import extend_schema, extend_schema_view

from .models import Notification
from .serializers import NotificationSerializer

@extend_schema_view(
    list=extend_schema(
        summary="List user notifications",
        description="Retrieve all notifications for the authenticated user, structured for UI card components.",
        responses={200: NotificationSerializer(many=True)}
    ),
    retrieve=extend_schema(
        summary="Retrieve notification detail",
        responses={200: NotificationSerializer}
    ),
    mark_read=extend_schema(
        summary="Mark notification as read",
        request=None,
        responses={200: NotificationSerializer}
    ),
    mark_all_read=extend_schema(
        summary="Mark all notifications as read",
        request=None,
        responses={200: NotificationSerializer(many=True)}
    ),
    unread_count=extend_schema(
        summary="Get unread notification count",
        responses={200: {"type": "object", "properties": {"unread_count": {"type": "integer"}}}}
    )
)
class NotificationViewSet(viewsets.ModelViewSet):
    # Required by Swagger/drf-spectacular for schema generation
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Filter queryset per user request at runtime
        return Notification.objects.filter(recipient=self.request.user)

    @action(detail=True, methods=['patch', 'post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response(NotificationSerializer(notification).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['patch', 'post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        notifications = self.get_queryset().filter(is_read=False)
        notifications.update(is_read=True)
        return Response(NotificationSerializer(self.get_queryset(), many=True).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count}, status=status.HTTP_200_OK)