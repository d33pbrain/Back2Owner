# items/serializers.py
from rest_framework import serializers
from .models import ItemReport, ItemImage, Category, CampusLandmark, Claim, ClaimProof

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']


class CampusLandmarkSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampusLandmark
        fields = ['id', 'name']


class ItemImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemImage
        fields = ['id', 'image', 'uploaded_at']


class ItemReportSerializer(serializers.ModelSerializer):
    images = ItemImageSerializer(many=True, read_only=True)
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(max_length=10000000, allow_empty_file=False, use_url=False),
        write_only=True,
        required=False,
        help_text="Upload multiple image files"
    )
    pending_claims_count = serializers.SerializerMethodField()
    stage_description = serializers.SerializerMethodField()

    class Meta:
        model = ItemReport
        fields = [
            'id', 'item_ref', 'reporter', 'report_type', 'status', 'stage_description',
            'title', 'category', 'description', 'brand', 'primary_colour',
            'distinguishing_features', 'campus_landmark', 'specific_location_details',
            'date_lost', 'estimated_time', 'time_frame', 'images', 'uploaded_images',
            'pending_claims_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'item_ref', 'reporter', 'status', 'created_at', 'updated_at']

    def get_pending_claims_count(self, obj):
        return obj.claims.filter(status=Claim.ClaimStatus.PENDING).count()

    def get_stage_description(self, obj):
        if obj.status == ItemReport.Status.OPEN:
            return "Stage 2 of 4: Match Exploration"
        elif obj.status == ItemReport.Status.CLAIM_PENDING:
            return "Stage 3 of 4: Identity Validation"
        elif obj.status == ItemReport.Status.RESOLVED:
            return "Stage 4 of 4: Completed"
        return "Stage 1 of 4: Verification Queued"

    def create(self, validated_data):
        uploaded_images = validated_data.pop('uploaded_images', [])
        validated_data['reporter'] = self.context['request'].user
        item_report = ItemReport.objects.create(**validated_data)

        for image_file in uploaded_images:
            ItemImage.objects.create(item=item_report, image=image_file)

        return item_report


class MyReportsSummarySerializer(serializers.Serializer):
    total_submissions = serializers.IntegerField(help_text="Total items reported by user")
    active_searchable = serializers.IntegerField(help_text="Active open reports listed publicly")
    pending_verification = serializers.IntegerField(help_text="Reports currently under claim verification")
    resolved_handover = serializers.IntegerField(help_text="Reports marked as resolved or returned")


class ClaimProofSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClaimProof
        fields = ['id', 'file', 'uploaded_at']


class ClaimSerializer(serializers.ModelSerializer):
    proof_documents = ClaimProofSerializer(many=True, read_only=True)
    proof_files = serializers.ListField(
        child=serializers.FileField(max_length=10000000, allow_empty_file=False),
        write_only=True,
        required=False,
        max_length=3,
        help_text="Upload up to 3 supporting proof files (PNG, JPG, WEBP)"
    )
    item_ref = serializers.ReadOnlyField(source='item.item_ref')
    item_title = serializers.ReadOnlyField(source='item.title')
    claimant_name = serializers.ReadOnlyField(source='claimant.full_name')

    class Meta:
        model = Claim
        fields = [
            'id', 'item', 'item_ref', 'item_title', 'claimant', 'claimant_name',
            'verification_reason', 'status', 'proof_documents', 'proof_files',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'claimant', 'status', 'created_at', 'updated_at']

    def validate_verification_reason(self, value):
        if len(value.strip()) < 20:
            raise serializers.ValidationError("Please provide a more detailed verification statement (at least 20 characters).")
        return value

    def validate(self, attrs):
        request = self.context.get('request')
        item = attrs.get('item')

        if item.reporter == request.user:
            raise serializers.ValidationError("You cannot submit an ownership claim on an item report you created.")

        if Claim.objects.filter(item=item, claimant=request.user, status=Claim.ClaimStatus.PENDING).exists():
            raise serializers.ValidationError("You already have an active pending claim for this item.")

        return attrs

    def create(self, validated_data):
        proof_files = validated_data.pop('proof_files', [])
        validated_data['claimant'] = self.context['request'].user
        claim = Claim.objects.create(**validated_data)

        for proof_file in proof_files[:3]:
            ClaimProof.objects.create(claim=claim, file=proof_file)

        item = claim.item
        item.status = ItemReport.Status.CLAIM_PENDING
        item.save()

        return claim