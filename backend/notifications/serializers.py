# notifications/serializers.py
from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    actor_initials = serializers.SerializerMethodField()
    formatted_title = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id',
            'category',
            'title_prefix',
            'item_title',
            'formatted_title',
            'body',
            'actor_initials',
            'target_item_id',
            'target_claim_id',
            'target_conversation_id',
            'is_read',
            'created_at',
        ]

    def get_actor_initials(self, obj):
        if obj.actor and obj.actor.full_name:
            names = obj.actor.full_name.strip().split()
            return "".join([n[0] for n in names[:2]]).upper()
        return "SY"

    def get_formatted_title(self, obj):
        if obj.item_title:
            return f"{obj.title_prefix}: {obj.item_title}"
        return obj.title_prefix