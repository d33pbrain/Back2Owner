# notifications/models.py
import uuid
from django.db import models
from django.conf import settings

class Notification(models.Model):
    class NotificationType(models.TextChoices):
        MESSAGE = 'MESSAGE', 'New Message'
        CLAIM = 'CLAIM', 'Claim Request'
        STATUS_UPDATE = 'STATUS_UPDATE', 'Status Update'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='notifications'
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=20, 
        choices=NotificationType.choices
    )
    is_read = models.BooleanField(default=False)
    target_id = models.UUIDField(
        blank=True, 
        null=True, 
        help_text="UUID of the related item report or conversation"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.recipient.email}: {self.title}"