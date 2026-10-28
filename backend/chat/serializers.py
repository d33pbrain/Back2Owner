# chat/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from items.serializers import ItemReportSerializer
from .models import Conversation, Message

User = get_user_model()


class ParticipantSerializer(serializers.ModelSerializer):
    role_badge = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'full_name', 'department_or_faculty', 'avatar', 'role_badge']

    def get_role_badge(self, obj):
        conversation = self.context.get('conversation')
        if conversation and conversation.item:
            if obj == conversation.item.reporter:
                return "Finder" if conversation.item.report_type == 'FOUND' else "Owner"
        return "Claimant"


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.ReadOnlyField(source='sender.full_name')
    is_me = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'sender_name', 'message_type', 'content', 'attachment', 'is_read', 'is_me', 'created_at']
        read_only_fields = ['id', 'sender', 'created_at']

    def get_is_me(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.sender == request.user
        return False


class ConversationListSerializer(serializers.ModelSerializer):
    other_participant = serializers.SerializerMethodField()
    item_details = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'item_details', 'other_participant', 'last_message', 'unread_count', 'updated_at']

    def get_other_participant(self, obj):
        request = self.context.get('request')
        if not request:
            return None
        other_user = obj.participants.exclude(id=request.user.id).first()
        if other_user:
            return ParticipantSerializer(other_user, context={'conversation': obj}).data
        return None

    def get_item_details(self, obj):
        return {
            'id': str(obj.item.id),
            'item_ref': obj.item.item_ref,
            'title': obj.item.title,
            'report_type': obj.item.report_type,
            'status': obj.item.status,
        }

    def get_last_message(self, obj):
        last_msg = obj.messages.last()
        if last_msg:
            return MessageSerializer(last_msg, context=self.context).data
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0


class ConversationDetailSerializer(serializers.ModelSerializer):
    participants = serializers.SerializerMethodField()
    item_details = serializers.SerializerMethodField()
    messages = MessageSerializer(many=True, read_only=True)

    class Meta:
        model = Conversation
        fields = ['id', 'item_details', 'participants', 'messages', 'created_at', 'updated_at']

    def get_participants(self, obj):
        return ParticipantSerializer(obj.participants.all(), many=True, context={'conversation': obj}).data

    def get_item_details(self, obj):
        return {
            'id': str(obj.item.id),
            'item_ref': obj.item.item_ref,
            'title': obj.item.title,
            'report_type': obj.item.report_type,
            'status': obj.item.status,
        }