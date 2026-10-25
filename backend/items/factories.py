# items/factories.py
import factory
import factory.fuzzy
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import ItemReport, Category, CampusLandmark, Claim, ClaimProof

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
        django_get_or_create = ('email',)

    full_name = factory.Faker('name')
    email = factory.Faker('email')
    username = factory.LazyAttribute(lambda o: o.email)
    department_or_faculty = factory.fuzzy.FuzzyChoice([
        'Computer Science & Engineering',
        'Faculty of Technology',
        'Accounting / Management & Accounting',
        'Faculty of Law',
        'Health Sciences / Medicine'
    ])
    is_active = True
    is_verified = True


class CategoryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Category
        django_get_or_create = ('name',)

    name = factory.Iterator(['Gadgets & Electronics', 'Stationery & Books', 'Wallets & Identification', 'Bags & Accessories'])
    slug = factory.LazyAttribute(lambda o: o.name.lower().replace(' & ', '-').replace(' ', '-'))


class CampusLandmarkFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = CampusLandmark
        django_get_or_create = ('name',)

    name = factory.Iterator([
        'BOOC Lecture Theatre',
        'Hezekiah Oluwasanmi Library',
        '1000-Seater Lecture Theatre',
        'Amphitheatre',
        'Suburb / Student Union Building (SUB)'
    ])


class ItemReportFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ItemReport

    reporter = factory.SubFactory(UserFactory)
    report_type = factory.fuzzy.FuzzyChoice([ItemReport.ReportType.LOST, ItemReport.ReportType.FOUND])
    status = ItemReport.Status.OPEN
    title = factory.Faker('sentence', nb_words=4)
    category = factory.SubFactory(CategoryFactory)
    description = factory.Faker('paragraph', nb_sentences=3)
    brand = factory.fuzzy.FuzzyChoice(['Apple', 'Casio', 'Samsung', 'Dell', 'Nike'])
    primary_colour = factory.fuzzy.FuzzyChoice(['Matte Black', 'Silver', 'Navy Blue', 'Brown'])
    distinguishing_features = factory.Faker('sentence', nb_words=6)
    campus_landmark = factory.SubFactory(CampusLandmarkFactory)
    specific_location_details = factory.Faker('sentence', nb_words=5)
    date_lost = factory.fuzzy.FuzzyDate(start_date=timezone.now().date())
    time_frame = factory.fuzzy.FuzzyChoice([
        ItemReport.TimeFrame.MORNING,
        ItemReport.TimeFrame.AFTERNOON,
        ItemReport.TimeFrame.EVENING
    ])