# items/management/commands/seed_data.py
import random
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from items.models import ItemReport, Category, CampusLandmark, Claim
from chat.models import Conversation, Message
from notifications.models import Notification

User = get_user_model()


class Command(BaseCommand):
    help = "Seeds the database with campus chat data and notifications for deepbrain77@gmail.com."

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Starting database seeding process..."))

        # 1. Create Core Categories
        categories_data = [
            ("Gadgets & Electronics", "gadgets-electronics"),
            ("Stationery & Books", "stationery-books"),
            ("Wallets & Identification", "wallets-identification"),
            ("Bags & Accessories", "bags-accessories"),
        ]
        categories = []
        for name, slug in categories_data:
            cat, _ = Category.objects.get_or_create(name=name, slug=slug)
            categories.append(cat)
        self.stdout.write(self.style.SUCCESS(f"✓ Created {len(categories)} categories"))

        # 2. Create Campus Landmarks
        landmarks_data = [
            "BOOC Lecture Theatre",
            "Hezekiah Oluwasanmi Library",
            "1000-Seater Lecture Theatre",
            "Amphitheatre",
            "Student Union Building (SUB)",
            "Health Center",
            "Oduduwa Hall"
        ]
        landmarks = []
        for name in landmarks_data:
            lm, _ = CampusLandmark.objects.get_or_create(name=name)
            landmarks.append(lm)
        self.stdout.write(self.style.SUCCESS(f"✓ Created {len(landmarks)} campus landmarks"))

        # 3. Retrieve or Create Primary User (deepbrain77@gmail.com)
        main_user, created = User.objects.get_or_create(
            email="deepbrain77@gmail.com",
            defaults={
                "username": "deepbrain77@gmail.com",
                "full_name": "Alex Olawale",
                "department_or_faculty": "Faculty of Technology [Mech Eng]",
                "is_active": True,
                "is_verified": True,
            }
        )
        main_user.set_password("Daniel@07")
        main_user.is_active = True
        main_user.is_verified = True
        main_user.save()

        # Create Counterpart Users matching UI designs
        olawale, _ = User.objects.get_or_create(
            email="olawale.a@oauife.edu.ng",
            defaults={
                "username": "olawale.a@oauife.edu.ng",
                "full_name": "Olawale A.",
                "department_or_faculty": "Faculty of Technology [Mech Eng]",
                "is_active": True,
                "is_verified": True,
            }
        )
        folashade, _ = User.objects.get_or_create(
            email="folashade.b@oauife.edu.ng",
            defaults={
                "username": "folashade.b@oauife.edu.ng",
                "full_name": "Folashade B.",
                "department_or_faculty": "Faculty of Law",
                "is_active": True,
                "is_verified": True,
            }
        )
        tunde, _ = User.objects.get_or_create(
            email="tunde.o@oauife.edu.ng",
            defaults={
                "username": "tunde.o@oauife.edu.ng",
                "full_name": "Tunde O.",
                "department_or_faculty": "Computer Science & Engineering",
                "is_active": True,
                "is_verified": True,
            }
        )

        self.stdout.write(self.style.SUCCESS("✓ Configured core user accounts (Target Account: deepbrain77@gmail.com)"))

        # 4. Create Item Reports
        today = timezone.now().date()

        item1, _ = ItemReport.objects.get_or_create(
            item_ref="#FND-2024-0980",
            defaults={
                "reporter": main_user,
                "report_type": ItemReport.ReportType.FOUND,
                "status": ItemReport.Status.CLAIM_PENDING,
                "title": "Casio fx-991ES Plus 2nd Edition Scientific Calculator",
                "category": categories[1],
                "brand": "Casio",
                "primary_colour": "Matte Black",
                "distinguishing_features": "Blue ink smear on battery cover clasp",
                "campus_landmark": landmarks[0],
                "specific_location_details": "BOOC Lecture Theatre (Row 4, Seat 18)",
                "date_lost": today,
            }
        )

        item2, _ = ItemReport.objects.get_or_create(
            item_ref="#REP-2024-0842",
            defaults={
                "reporter": folashade,
                "report_type": ItemReport.ReportType.LOST,
                "status": ItemReport.Status.CLAIM_PENDING,
                "title": "Black Leather Bi-Fold Wallet (Contains ATM & Student ID)",
                "category": categories[2],
                "brand": "LeatherCraft",
                "primary_colour": "Black",
                "distinguishing_features": "Contains OAU Student ID & ATM card",
                "campus_landmark": landmarks[1],
                "specific_location_details": "Ground floor reading area",
                "date_lost": today,
            }
        )

        item3, _ = ItemReport.objects.get_or_create(
            item_ref="#FND-2024-0715",
            defaults={
                "reporter": main_user,
                "report_type": ItemReport.ReportType.LOST,
                "status": ItemReport.Status.OPEN,
                "title": "Blue HP Pavilion 65W Laptop Charger & Cord",
                "category": categories[0],
                "brand": "HP",
                "primary_colour": "Black",
                "distinguishing_features": "Yellow sticker near power brick stem",
                "campus_landmark": landmarks[2],
                "specific_location_details": "Row 8 middle aisle",
                "date_lost": today,
            }
        )

        self.stdout.write(self.style.SUCCESS("✓ Created item reports matching UI designs"))

        # 5. Seed Claims & Conversations

        # --- Thread 1: Calculator ---
        claim1, _ = Claim.objects.get_or_create(
            item=item1,
            claimant=olawale,
            defaults={
                "verification_reason": "I left my Casio calculator at BOOC lecture theatre seat 18. It has blue ink on the battery clip.",
                "status": Claim.ClaimStatus.APPROVED
            }
        )
        conv1, _ = Conversation.objects.get_or_create(item=item1)
        conv1.participants.add(main_user, olawale)

        Message.objects.get_or_create(
            conversation=conv1,
            content="Hello! Thank you so much for accepting the claim. I really need this calculator for my test tomorrow. When will you be around BOOC Porter's Lodge?",
            defaults={
                "sender": olawale,
                "is_read": False
            }
        )

        # --- Thread 2: Leather Wallet ---
        claim2, _ = Claim.objects.get_or_create(
            item=item2,
            claimant=main_user,
            defaults={
                "verification_reason": "Lost my black wallet near the library with my Student ID inside.",
                "status": Claim.ClaimStatus.PENDING
            }
        )
        conv2, _ = Conversation.objects.get_or_create(item=item2)
        conv2.participants.add(main_user, folashade)

        # --- Thread 3: Laptop Charger ---
        claim3, _ = Claim.objects.get_or_create(
            item=item3,
            claimant=tunde,
            defaults={
                "verification_reason": "I saw your lost report for the HP charger. I think I found it near 1000-seater.",
                "status": Claim.ClaimStatus.PENDING
            }
        )
        conv3, _ = Conversation.objects.get_or_create(item=item3)
        conv3.participants.add(main_user, tunde)

        # 6. Seed Notifications Matching the UI Design Exactly
        notifications_data = [
            {
                "recipient": main_user,
                "actor": olawale,
                "category": Notification.Category.CLAIM_SUBMITTED,
                "title_prefix": "New Ownership Claim Submitted",
                "item_title": "Casio fx-991ES Plus Calculator",
                "body": "Olawale A. provided 3 identifying verification marks (engraved name initials on battery bay, blue casing sticker) for your review.",
                "target_item_id": item1.id,
                "target_claim_id": claim1.id,
                "is_read": False
            },
            {
                "recipient": main_user,
                "actor": None,  # System match
                "category": Notification.Category.MATCH_FOUND,
                "title_prefix": "Potential Match Found",
                "item_title": "Black Leather Bi-Fold Wallet",
                "body": "An item closely matching your lost report parameters was cataloged at Student Union Building (SUB) Security Checkpoint (Desk 2). System algorithmic match confidence: 88%.",
                "target_item_id": item2.id,
                "is_read": False
            },
            {
                "recipient": main_user,
                "actor": olawale,
                "category": Notification.Category.RECOVERY_PENDING,
                "title_prefix": "Recovery Sign-Off Pending",
                "item_title": "Casio fx-991ES Plus Calculator",
                "body": "Olawale A. provided 3 identifying verification marks (engraved name initials on battery bay, blue casing sticker) for your review.",
                "target_item_id": item1.id,
                "target_claim_id": claim1.id,
                "is_read": False
            },
            {
                "recipient": main_user,
                "actor": folashade,
                "category": Notification.Category.CLAIM_ACCEPTED,
                "title_prefix": "Claim Accepted",
                "item_title": "Dell Latitude 65W AC Adapter & Power Cable",
                "body": "Your ownership claim was authenticated and authorized by Hezekiah Oluwasanmi Library Front Desk. Physical handover code unlocked.",
                "target_item_id": item3.id,
                "is_read": True
            }
        ]

        for notif_kwargs in notifications_data:
            Notification.objects.get_or_create(
                recipient=notif_kwargs["recipient"],
                title_prefix=notif_kwargs["title_prefix"],
                item_title=notif_kwargs["item_title"],
                defaults=notif_kwargs
            )

        self.stdout.write(self.style.SUCCESS("✓ Seeded UI-matched notifications, conversations, and claims."))
        self.stdout.write(self.style.SUCCESS("\nSeeding complete! Log in to deepbrain77@gmail.com (Password: Daniel@07)."))