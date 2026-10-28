# notifications/serializers.py
from rest_framework import serializers
from django.utils.timesince import timesince
from django.utils import timezone
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    actor_name = serializers.ReadOnlyField(source='actor.full_name')
    actor_avatar = serializers.SerializerMethodField()
    actor_initials = serializers.SerializerMethodField()
    formatted_title = serializers.SerializerMethodField()
    time_ago = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id',
            'category',
            'title_prefix',
            'item_title',
            'formatted_title',
            'body',
            'actor_name',
            'actor_avatar',
            'actor_initials',
            'target_item_id',
            'target_claim_id',
            'target_conversation_id',
            'is_read',
            'time_ago',
            'created_at',
        ]
        read_only_fields = [
            'id', 'category', 'title_prefix', 'item_title', 'formatted_title',
            'body', 'actor_name', 'actor_avatar', 'actor_initials',
            'target_item_id', 'target_claim_id', 'target_conversation_id',
            'time_ago', 'created_at'
        ]

    def get_actor_avatar(self, obj):
        if obj.actor and obj.actor.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.actor.avatar.url)
            return obj.actor.avatar.url
        return None

    def get_actor_initials(self, obj):
        if obj.actor and obj.actor.full_name:
            names = obj.actor.full_name.strip().split()
            return "".join([n[0] for n in names[:2]]).upper()
        return "SY"

    def get_formatted_title(self, obj):
        if obj.item_title:
            return f"{obj.title_prefix}: {obj.item_title}"
        return obj.title_prefix

    def get_time_ago(self, obj):
        if obj.created_at:
            now = timezone.now()
            diff = now - obj.created_at
            if diff.total_seconds() < 60:
                return "Just now"
            return f"{timesince(obj.created_at, now).split(',')[0]} ago"
        return ""