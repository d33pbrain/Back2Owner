# items/management/commands/seed_db.py
import random
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from items.models import ItemReport, Category, CampusLandmark, Claim, ClaimProof, ItemImage
from chat.models import Conversation, Message
from notifications.models import Notification
from items.factories import UserFactory, CategoryFactory, CampusLandmarkFactory, ItemReportFactory

User = get_user_model()


class Command(BaseCommand):
    help = "Seeds the database with initial realistic campus data for Back2Owner testing."

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

        # 3. Create Default Test Users
        demo_user, created = User.objects.get_or_create(
            email="alex@oauife.edu.ng",
            defaults={
                "username": "alex@oauife.edu.ng",
                "full_name": "Alex Olawale",
                "department_or_faculty": "Computer Science & Engineering",
                "is_active": True,
                "is_verified": True,
            }
        )
        if created:
            demo_user.set_password("password123")
            demo_user.save()

        # Generate 4 additional mock users
        other_users = [UserFactory() for _ in range(4)]
        all_users = [demo_user] + other_users
        self.stdout.write(self.style.SUCCESS(f"✓ Created {len(all_users)} verified test users (Demo user: alex@oauife.edu.ng)"))

        # 4. Seed Item Reports with visual reference data
        reports_data = [
            {
                "title": "Casio fx-991ES Plus 2nd Edition Scientific Calculator",
                "report_type": ItemReport.ReportType.FOUND,
                "status": ItemReport.Status.OPEN,
                "category": categories[1],
                "brand": "Casio",
                "primary_colour": "Matte Black",
                "distinguishing_features": "Blue ink smear on battery cover clasp, scratched initials O.A.",
                "campus_landmark": landmarks[0],
                "specific_location_details": "BOOC Lecture Theatre (Row 4, Seat 18)",
                "reporter": demo_user,
            },
            {
                "title": "Black Leather Bi-Fold Wallet (Contains ATM & Student ID)",
                "report_type": ItemReport.ReportType.LOST,
                "status": ItemReport.Status.CLAIM_PENDING,
                "category": categories[2],
                "brand": "Gucci",
                "primary_colour": "Black",
                "distinguishing_features": "Contains OAU Library card and OPay debit card",
                "campus_landmark": landmarks[1],
                "specific_location_details": "Ground floor reading room table 14",
                "reporter": other_users[0],
            },
            {
                "title": "Dell Latitude 65W AC Adapter & Power Cable",
                "report_type": ItemReport.ReportType.FOUND,
                "status": ItemReport.Status.RESOLVED,
                "category": categories[0],
                "brand": "Dell",
                "primary_colour": "Black",
                "distinguishing_features": "Red electrical tape wrapped around charging connector stem",
                "campus_landmark": landmarks[1],
                "specific_location_details": "Hezekiah Oluwasanmi Library (1st Floor)",
                "reporter": demo_user,
            },
            {
                "title": "Nike Navy Blue Backpack with Departmental Keychain",
                "report_type": ItemReport.ReportType.LOST,
                "status": ItemReport.Status.OPEN,
                "category": categories[3],
                "brand": "Nike",
                "primary_colour": "Navy Blue",
                "distinguishing_features": "NUESA brass metal keychain on front zipper",
                "campus_landmark": landmarks[2],
                "specific_location_details": "Row 8 middle aisle desk",
                "reporter": demo_user,
            }
        ]

        created_reports = []
        for data in reports_data:
            report = ItemReportFactory(
                title=data["title"],
                report_type=data["report_type"],
                status=data["status"],
                category=data["category"],
                brand=data["brand"],
                primary_colour=data["primary_colour"],
                distinguishing_features=data["distinguishing_features"],
                campus_landmark=data["campus_landmark"],
                specific_location_details=data["specific_location_details"],
                reporter=data["reporter"],
            )
            created_reports.append(report)
        self.stdout.write(self.style.SUCCESS(f"✓ Created {len(created_reports)} item reports"))

        # 5. Create Ownership Claim & Message Threads
        pending_report = created_reports[1]  # Wallet report
        claimant = demo_user

        claim = Claim.objects.create(
            item=pending_report,
            claimant=claimant,
            verification_reason=(
                "There is a faint blue ink smear on the battery cover clasp, and my initials 'O.A.' "
                "are scratched lightly inside the sliding cover. In the mode menu, the display contrast "
                "is set to 3 bars from the default position."
            ),
            status=Claim.ClaimStatus.PENDING
        )

        # Create Chat Conversation between claimant and reporter
        conversation = Conversation.objects.create(item=pending_report)
        conversation.participants.add(claimant, pending_report.reporter)

        Message.objects.create(
            conversation=conversation,
            sender=claimant,
            content=f"Hello! I submitted a claim for '{pending_report.title}'. The wallet has my OPay card inside."
        )
        Message.objects.create(
            conversation=conversation,
            sender=pending_report.reporter,
            content="Hi! I have the wallet with security at the library desk. Let's arrange verification."
        )

        # Create Notifications
        Notification.objects.create(
            recipient=pending_report.reporter,
            title="New Ownership Claim Received",
            message=f"{claimant.full_name} submitted an ownership claim for '{pending_report.title}'.",
            notification_type=Notification.NotificationType.CLAIM,
            target_id=claim.id
        )

        Notification.objects.create(
            recipient=demo_user,
            title="Item Status Update",
            message="Your report 'Dell Latitude 65W AC Adapter' was marked as resolved.",
            notification_type=Notification.NotificationType.STATUS_UPDATE,
            target_id=created_reports[2].id
        )

        self.stdout.write(self.style.SUCCESS("✓ Created active claim, conversation thread, messages, and notifications."))
        self.stdout.write(self.style.SUCCESS("\nDatabase successfully seeded! You can now log in with alex@oauife.edu.ng (Password: password123)."))