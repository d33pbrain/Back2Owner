import uuid
from django.db import models
from django.conf import settings

class Notification(models.Model):
    class Category(models.TextChoices):
        CLAIM_SUBMITTED = 'CLAIM_SUBMITTED', 'New Ownership Claim Submitted'
        MATCH_FOUND = 'MATCH_FOUND', 'Potential Match Found'
        RECOVERY_PENDING = 'RECOVERY_PENDING', 'Recovery Sign-Off Pending'
        CLAIM_ACCEPTED = 'CLAIM_ACCEPTED', 'Claim Accepted'
        GENERAL = 'GENERAL', 'General Alert'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='triggered_notifications'
    )
    
    category = models.CharField(
        max_length=30,
        choices=Category.choices,
        default=Category.GENERAL
    )
    
    # Custom title formatting (e.g., "New Ownership Claim Submitted: Casio fx-991ES Plus Calculator")
    title_prefix = models.CharField(max_length=150)
    item_title = models.CharField(max_length=255, blank=True, null=True)
    
    # Detail body text
    body = models.TextField()
    
    # Navigation references for frontend routing when clicked
    target_item_id = models.UUIDField(null=True, blank=True)
    target_claim_id = models.UUIDField(null=True, blank=True)
    target_conversation_id = models.UUIDField(null=True, blank=True)

    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title_prefix} - {self.recipient.email}"