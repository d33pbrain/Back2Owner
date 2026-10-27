# chat/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiResponse
from .models import Conversation, Message
from .serializers import (
    ConversationListSerializer,
    ConversationDetailSerializer,
    MessageSerializer,
)


@extend_schema_view(
    list=extend_schema(
        summary="List Active User Conversations",
        description="Retrieve all active message threads for the logged-in user, sorted by the most recent message."
    ),
    retrieve=extend_schema(
        summary="Get Chat Thread Details & Messages",
        description="Fetch full conversation details including participant badges, item context, and historical message log."
    )
)
class ConversationViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(participants=self.request.user).order_by('-updated_at')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ConversationDetailSerializer
        return ConversationListSerializer

    @extend_schema(
        summary="Mark All Messages in Conversation as Read",
        description="Marks all incoming unread messages in the selected conversation thread as read.",
        responses={200: OpenApiResponse(description="All incoming messages marked as read.")}
    )
    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        conversation = self.get_object()
        conversation.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
        return Response({"message": "All messages in conversation marked as read."}, status=status.HTTP_200_OK)


@extend_schema_view(
    create=extend_schema(
        summary="Send Message via REST API",
        description="Post a text or file attachment message directly to a chat thread via HTTP."
    ),
    retrieve=extend_schema(
        summary="Get Message Details",
        description="Fetch a specific message instance by UUID."
    ),
    destroy=extend_schema(
        summary="Delete Message",
        description="Delete a message sent by the user."
    )
)
class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return Message.objects.filter(conversation__participants=self.request.user)

    def perform_create(self, serializer):
        message = serializer.save(sender=self.request.user)
        # Touch updated_at timestamp on parent conversation to keep list view ordered correctly
        message.conversation.save()