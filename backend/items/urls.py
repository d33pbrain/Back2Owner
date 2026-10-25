# items/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ItemReportViewSet, CategoryViewSet, CampusLandmarkViewSet, ClaimViewSet

router = DefaultRouter()
router.register(r'reports', ItemReportViewSet, basename='item-reports')
router.register(r'categories', CategoryViewSet, basename='categories')
router.register(r'landmarks', CampusLandmarkViewSet, basename='landmarks')
router.register(r'claims', ClaimViewSet, basename='claims')

urlpatterns = [
    path('', include(router.urls)),
]