# items/views.py
from django.db import models
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter, OpenApiResponse, OpenApiTypes
from chat.models import Conversation, Message
from notifications.models import Notification
from .models import ItemReport, Category, CampusLandmark, Claim
from .serializers import (
    ItemReportSerializer,
    CategorySerializer,
    CampusLandmarkSerializer,
    ClaimSerializer,
    MyReportsSummarySerializer,
)


@extend_schema_view(
    list=extend_schema(summary="List Categories", description="Retrieve all item categories."),
    retrieve=extend_schema(summary="Get Category Details", description="Retrieve specific category details by UUID.")
)
class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]


@extend_schema_view(
    list=extend_schema(summary="List Campus Landmarks", description="Retrieve all campus landmark locations."),
    retrieve=extend_schema(summary="Get Landmark Details", description="Retrieve specific landmark details by UUID.")
)
class CampusLandmarkViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CampusLandmark.objects.all()
    serializer_class = CampusLandmarkSerializer
    permission_classes = [permissions.AllowAny]


@extend_schema_view(
    list=extend_schema(
        summary="List Item Reports",
        description="Retrieve item reports. Pass `?my_reports=true` to retrieve only reports created by the authenticated user.",
        parameters=[
            OpenApiParameter(
                name="my_reports",
                type=OpenApiTypes.BOOL,
                location=OpenApiParameter.QUERY,
                description="Filter list to show only reports belonging to the authenticated user."
            )
        ]
    ),
    create=extend_schema(
        summary="Report Lost or Found Item",
        description="Create a new report with optional multi-image file attachments (`multipart/form-data`)."
    ),
    retrieve=extend_schema(
        summary="Get Report Details",
        description="Fetch full details for a specific item report."
    ),
    update=extend_schema(
        summary="Update Item Report",
        description="Update existing item report details."
    ),
    partial_update=extend_schema(
        summary="Partially Update Item Report",
        description="Partially update specific fields of an item report."
    ),
    destroy=extend_schema(
        summary="Delete Item Report",
        description="Permanently delete an item report."
    )
)
class ItemReportViewSet(viewsets.ModelViewSet):
    queryset = ItemReport.objects.all().order_by('-created_at')
    serializer_class = ItemReportSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.query_params.get('my_reports') == 'true' and self.request.user.is_authenticated:
            queryset = queryset.filter(reporter=self.request.user)
        return queryset

    @extend_schema(
        summary="My Reports Summary Metrics",
        description="Calculates top dashboard statistics (Total Submissions, Active, Pending Verification, Resolved) for the authenticated user.",
        responses={200: MyReportsSummarySerializer}
    )
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated], url_path='my-reports-summary')
    def my_reports_summary(self, request):
        user = request.user
        user_reports = ItemReport.objects.filter(reporter=user)

        data = {
            "total_submissions": user_reports.count(),
            "active_searchable": user_reports.filter(status=ItemReport.Status.OPEN).count(),
            "pending_verification": user_reports.filter(status=ItemReport.Status.CLAIM_PENDING).count(),
            "resolved_handover": user_reports.filter(status=ItemReport.Status.RESOLVED).count(),
        }
        serializer = MyReportsSummarySerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Mark Item As Returned / Resolved",
        description="Allows the item reporter to manually resolve an item report.",
        responses={200: OpenApiResponse(description="Item report marked as resolved.")}
    )
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated], url_path='mark-as-returned')
    def mark_as_returned(self, request, pk=None):
        item = self.get_object()
        if item.reporter != request.user:
            return Response({"error": "You do not have permission to modify this report."}, status=status.HTTP_403_FORBIDDEN)

        item.status = ItemReport.Status.RESOLVED
        item.save()

        Claim.objects.filter(item=item, status=Claim.ClaimStatus.PENDING).update(status=Claim.ClaimStatus.REJECTED)

        return Response({"message": "Item report successfully marked as returned and resolved."}, status=status.HTTP_200_OK)


@extend_schema_view(
    list=extend_schema(
        summary="List Claims",
        description="Retrieve claims. Use `?type=submitted` to get claims made by you, or `?type=received` to get claims made on your items.",
        parameters=[
            OpenApiParameter(
                name="type",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description="Filter claims by 'submitted' (claims you submitted) or 'received' (claims on your reported items)."
            )
        ]
    ),
    create=extend_schema(
        summary="Submit Ownership Claim",
        description="Submit verification details and up to 3 optional proof documents (`multipart/form-data`). Automatically opens a chat thread."
    ),
    retrieve=extend_schema(
        summary="Get Claim Details",
        description="Get full verification details and proof files for a specific claim."
    ),
    update=extend_schema(
        summary="Update Claim",
        description="Update an existing claim."
    ),
    partial_update=extend_schema(
        summary="Partially Update Claim",
        description="Partially update an existing claim."
    ),
    destroy=extend_schema(
        summary="Delete Claim",
        description="Remove a claim."
    )
)
class ClaimViewSet(viewsets.ModelViewSet):
    serializer_class = ClaimSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user
        queryset = Claim.objects.filter(
            models.Q(claimant=user) | models.Q(item__reporter=user)
        ).distinct()

        claim_type = self.request.query_params.get('type')
        if claim_type == 'submitted':
            return queryset.filter(claimant=user)
        elif claim_type == 'received':
            return queryset.filter(item__reporter=user)

        return queryset

    def perform_create(self, serializer):
        claim = serializer.save()

        conversation, _ = Conversation.objects.get_or_create(item=claim.item)
        conversation.participants.add(claim.claimant, claim.item.reporter)

        Message.objects.create(
            conversation=conversation,
            sender=claim.claimant,
            content=f"Hello! I have submitted an ownership claim for '{claim.item.title}' ({claim.item.item_ref}). Verification details: {claim.verification_reason}"
        )

        Notification.objects.create(
            recipient=claim.item.reporter,
            title="New Ownership Claim Received",
            message=f"{claim.claimant.full_name} submitted a claim for '{claim.item.title}'.",
            notification_type=Notification.NotificationType.CLAIM,
            target_id=claim.id
        )

    @extend_schema(
        summary="Review Ownership Claim",
        description="Allows the item reporter to accept ('approve') or decline ('reject') a pending claim.",
        responses={200: OpenApiResponse(description="Claim review status updated successfully.")}
    )
    @action(detail=True, methods=['post'], url_path='review-claim')
    def review_claim(self, request, pk=None):
        claim = self.get_object()

        if claim.item.reporter != request.user:
            return Response({"error": "Only the item reporter can review this claim."}, status=status.HTTP_403_FORBIDDEN)

        action_type = request.data.get('action')

        if action_type == 'approve':
            claim.status = Claim.ClaimStatus.APPROVED
            claim.item.status = ItemReport.Status.RESOLVED
            claim.item.save()
            claim.save()

            Claim.objects.filter(item=claim.item, status=Claim.ClaimStatus.PENDING).exclude(id=claim.id).update(
                status=Claim.ClaimStatus.REJECTED
            )

            Notification.objects.create(
                recipient=claim.claimant,
                title="Claim Approved!",
                message=f"Your claim for '{claim.item.title}' was approved by the finder.",
                notification_type=Notification.NotificationType.STATUS_UPDATE,
                target_id=claim.item.id
            )
            return Response({"message": "Claim approved and item marked as resolved."}, status=status.HTTP_200_OK)

        elif action_type == 'reject':
            claim.status = Claim.ClaimStatus.REJECTED
            claim.save()

            if not Claim.objects.filter(item=claim.item, status=Claim.ClaimStatus.PENDING).exists():
                claim.item.status = ItemReport.Status.OPEN
                claim.item.save()

            Notification.objects.create(
                recipient=claim.claimant,
                title="Claim Status Update",
                message=f"Your claim for '{claim.item.title}' was declined.",
                notification_type=Notification.NotificationType.STATUS_UPDATE,
                target_id=claim.item.id
            )
            return Response({"message": "Claim has been rejected."}, status=status.HTTP_200_OK)

        return Response({"error": "Invalid action. Use 'approve' or 'reject'."}, status=status.HTTP_400_BAD_REQUEST)