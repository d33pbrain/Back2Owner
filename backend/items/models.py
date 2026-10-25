# items/models.py
import uuid
import random
from django.db import models
from django.conf import settings
from django.utils import timezone

class Category(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name


class CampusLandmark(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.name


class ItemReport(models.Model):
    class ReportType(models.TextChoices):
        LOST = 'LOST', 'Lost'
        FOUND = 'FOUND', 'Found'

    class Status(models.TextChoices):
        OPEN = 'OPEN', 'Open'
        CLAIM_PENDING = 'CLAIM_PENDING', 'Claim Pending'
        RESOLVED = 'RESOLVED', 'Resolved'

    class TimeFrame(models.TextChoices):
        MORNING = 'MORNING', 'Morning (06:00 - 12:00)'
        AFTERNOON = 'AFTERNOON', 'Afternoon (12:00 - 17:00)'
        EVENING = 'EVENING', 'Evening / Night (17:00+)'
        UNSURE = 'UNSURE', 'Unsure / Unknown'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    item_ref = models.CharField(max_length=20, unique=True, editable=False, null=True, blank=True)
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reports')
    report_type = models.CharField(max_length=5, choices=ReportType.choices, default=ReportType.LOST)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.OPEN)

    # Basic Details
    title = models.CharField(max_length=255)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='items')
    description = models.TextField()
    brand = models.CharField(max_length=100, blank=True, null=True)
    primary_colour = models.CharField(max_length=50, blank=True, null=True)
    distinguishing_features = models.TextField(blank=True, null=True)

    # Location Details
    campus_landmark = models.ForeignKey(CampusLandmark, on_delete=models.SET_NULL, null=True, related_name='items')
    specific_location_details = models.TextField()

    # Time Details
    date_lost = models.DateField()
    estimated_time = models.TimeField(blank=True, null=True)
    time_frame = models.CharField(max_length=20, choices=TimeFrame.choices, default=TimeFrame.UNSURE)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.item_ref:
            year = timezone.now().year
            rand_code = f"{random.randint(1000, 9999)}"
            self.item_ref = f"#OAU-{year}-{rand_code}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.item_ref} - {self.title}"


class ItemImage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    item = models.ForeignKey(ItemReport, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='item_images/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

class Claim(models.Model):
    class ClaimStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending Review'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        CANCELLED = 'CANCELLED', 'Cancelled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    item = models.ForeignKey(ItemReport, on_delete=models.CASCADE, related_name='claims')
    claimant = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='claims_submitted')
    
    # Verification details from UI
    verification_reason = models.TextField(
        max_length=1000,
        help_text="Describe private, distinguishing marks or contents not visible in public photos."
    )
    status = models.CharField(max_length=15, choices=ClaimStatus.choices, default=ClaimStatus.PENDING)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('item', 'claimant')  # Prevents duplicate active claims by same user

    def __str__(self):
        return f"Claim by {self.claimant.full_name} for {self.item.item_ref}"


class ClaimProof(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    claim = models.ForeignKey(Claim, on_delete=models.CASCADE, related_name='proof_documents')
    file = models.FileField(upload_to='claim_proofs/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Proof document for Claim {self.claim.id}"