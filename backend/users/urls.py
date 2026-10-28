# users/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    VerifyOTPView,
    ResendOTPView,
    LoginView,
    ForgotPasswordView,
    ResetPasswordView,
    ProfileView,
)

urlpatterns = [
    # Core Authentication Endpoints
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('auth/verify-email/', VerifyOTPView.as_view(), name='verify-email'),  # Alias for verify-otp
    path('auth/resend-otp/', ResendOTPView.as_view(), name='resend-otp'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    
    # Password Reset Endpoints
    path('auth/forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    
    # Profile Endpoint
    path('profile/', ProfileView.as_view(), name='profile'),
]