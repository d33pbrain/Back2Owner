# notifications/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from items.models import ItemReport, Claim
from notifications.models import Notification

# Trigger notification when a new lost/found report is posted
@receiver(post_save, sender=ItemReport)
def create_report_notification(sender, instance, created, **kwargs):
    if created:
        Notification.objects.create(
            recipient=instance.reporter,
            actor=instance.reporter,
            category=Notification.Category.MATCH_FOUND if instance.report_type == ItemReport.ReportType.FOUND else Notification.Category.GENERAL,
            title_prefix="Item Report Published",
            item_title=instance.title,
            body=f"Your {instance.report_type.lower()} report ({instance.item_ref}) was successfully published to the campus bulletin.",
            target_item_id=instance.id
        )

# Trigger notifications when claims are created or reviewed
@receiver(post_save, sender=Claim)
def create_claim_notification(sender, instance, created, **kwargs):
    if created:
        item = instance.item
        reporter = item.reporter

        if reporter != instance.claimant:
            claimant_name = getattr(instance.claimant, 'full_name', None) or 'A student'
            Notification.objects.create(
                recipient=reporter,
                actor=instance.claimant,
                category=Notification.Category.CLAIM_SUBMITTED,
                title_prefix="New Ownership Claim Submitted",
                item_title=item.title,
                body=f"{claimant_name} provided verification details for your review.",
                target_item_id=item.id,
                target_claim_id=instance.id
            )
    else:
        if instance.status == Claim.ClaimStatus.APPROVED:
            Notification.objects.create(
                recipient=instance.claimant,
                actor=instance.item.reporter,
                category=Notification.Category.CLAIM_ACCEPTED,
                title_prefix="Claim Accepted",
                item_title=instance.item.title,
                body="Your ownership claim was authenticated and authorized by the reporter.",
                target_item_id=instance.item.id,
                target_claim_id=instance.id
            )
        elif instance.status == Claim.ClaimStatus.REJECTED:
            Notification.objects.create(
                recipient=instance.claimant,
                actor=instance.item.reporter,
                category=Notification.Category.CLAIM_SUBMITTED,
                title_prefix="Claim Declined",
                item_title=instance.item.title,
                body=f"Your ownership claim for '{instance.item.title}' was declined.",
                target_item_id=instance.item.id,
                target_claim_id=instance.id
            )