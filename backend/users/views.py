# users/views.py
import resend
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiResponse
from .models import OTPVerification
from .serializers import (
    UserRegisterSerializer,
    VerifyOTPSerializer,
    ResendOTPSerializer,
    UserProfileSerializer,
    LoginSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
)

User = get_user_model()


def send_otp_email(user, otp_code, title="Verify Your Email"):
    """Sends OTP verification code via Resend API."""
    resend.api_key = getattr(settings, 'RESEND_API_KEY', '')

    print("\n==================================================")
    print(f" [BACK2OWNER OTP LOG] Purpose: {title}")
    print(f" [BACK2OWNER OTP LOG] Target Email: {user.email}")
    print(f" [BACK2OWNER OTP LOG] Code: {otp_code}")
    print("==================================================\n")

    params = {
        "from": getattr(settings, 'DEFAULT_FROM_EMAIL', 'Back2Owner <onboarding@resend.dev>'),
        "to": [user.email],
        "subject": f"Back2Owner - {title}",
        "html": f"""
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <h2 style="color: #2563eb; text-align: center;">Back2Owner Campus Network</h2>
                <p>Hello <strong>{user.full_name}</strong>,</p>
                <p>Your OTP code for <strong>{title}</strong> is:</p>
                <div style="background-color: #f3f4f6; text-align: center; padding: 15px; font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #1e293b; border-radius: 6px; margin: 20px 0;">
                    {otp_code}
                </div>
                <p style="color: #64748b; font-size: 14px;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
            </div>
        """,
    }

    try:
        response = resend.Emails.send(params)
        print(f"[RESEND SUCCESS] Sent! Response: {response}")
    except Exception as e:
        print(f"[RESEND ERROR] Failed to deliver email to {user.email}. Error Details: {e}\n")


@extend_schema_view(
    post=extend_schema(
        summary="Register User Account",
        description="Creates a new unverified user account and sends a 6-digit verification OTP email.",
        request=UserRegisterSerializer,
        responses={201: OpenApiResponse(description="Registration successful. OTP sent.")}
    )
)
class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            otp = OTPVerification.objects.create(user=user)
            send_otp_email(user, otp.code, title="Verify Your Email")
            return Response(
                {"message": "Registration successful. Please verify the OTP sent to your email."},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema_view(
    post=extend_schema(
        summary="Verify Account via OTP",
        description="Verifies user email with the 6-digit OTP code. Activates account and returns JWT tokens.",
        request=VerifyOTPSerializer,
        responses={200: OpenApiResponse(description="Account verified successfully.")}
    )
)
class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        otp_code = serializer.validated_data['otp_code']

        try:
            user = User.objects.get(email=email)
            otp_record = OTPVerification.objects.filter(
                user=user, code=otp_code, is_used=False
            ).latest('created_at')

            if not otp_record.is_valid():
                return Response({"error": "OTP has expired or is invalid."}, status=status.HTTP_400_BAD_REQUEST)

            otp_record.is_used = True
            otp_record.save()

            user.is_active = True
            user.is_verified = True
            user.save()

            refresh = RefreshToken.for_user(user)
            return Response({
                "message": "Account verified successfully.",
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
                "user": UserProfileSerializer(user).data
            }, status=status.HTTP_200_OK)

        except (User.DoesNotExist, OTPVerification.DoesNotExist):
            return Response({"error": "Invalid email or OTP code."}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema_view(
    post=extend_schema(
        summary="Resend Verification OTP",
        description="Generates and dispatches a new 6-digit verification code to user email.",
        request=ResendOTPSerializer,
        responses={200: OpenApiResponse(description="New OTP code dispatched.")}
    )
)
class ResendOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResendOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        try:
            user = User.objects.get(email=email)
            otp = OTPVerification.objects.create(user=user)
            send_otp_email(user, otp.code, title="New Verification Code")
            return Response({"message": "A new OTP has been sent to your email."}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User with this email does not exist."}, status=status.HTTP_404_NOT_FOUND)


@extend_schema_view(
    post=extend_schema(
        summary="User Login",
        description="Authenticates active campus user credentials (email & password) and returns JWT access and refresh tokens.",
        request=LoginSerializer,
        responses={200: OpenApiResponse(description="Login successful. JWT tokens returned.")}
    )
)
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        password = serializer.validated_data['password']

        user = authenticate(username=email, password=password)
        if user is None:
            return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({"error": "Account is not verified. Please verify your email first."}, status=status.HTTP_403_FORBIDDEN)

        refresh = RefreshToken.for_user(user)
        return Response({
            "tokens": {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            },
            "user": UserProfileSerializer(user).data
        }, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        summary="Request Password Reset OTP",
        description="Generates a 6-digit password reset OTP and emails it to the user.",
        request=ForgotPasswordSerializer,
        responses={200: OpenApiResponse(description="Password reset OTP sent.")}
    )
)
class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        user = User.objects.get(email=email)

        otp = OTPVerification.objects.create(user=user)
        send_otp_email(user, otp.code, title="Reset Password Code")

        return Response(
            {"message": "Password reset code sent to your email address."},
            status=status.HTTP_200_OK
        )


@extend_schema_view(
    post=extend_schema(
        summary="Confirm Password Reset with OTP",
        description="Verifies the OTP code and sets the new password.",
        request=ResetPasswordSerializer,
        responses={200: OpenApiResponse(description="Password reset successful.")}
    )
)
class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email'].lower().strip()
        otp_code = serializer.validated_data['otp_code']
        new_password = serializer.validated_data['new_password']

        try:
            user = User.objects.get(email=email)
            otp_record = OTPVerification.objects.filter(
                user=user, code=otp_code, is_used=False
            ).latest('created_at')

            if not otp_record.is_valid():
                return Response({"error": "OTP has expired or is invalid."}, status=status.HTTP_400_BAD_REQUEST)

            otp_record.is_used = True
            otp_record.save()

            user.set_password(new_password)
            user.save()

            return Response(
                {"message": "Password has been reset successfully. You can now log in with your new password."},
                status=status.HTTP_200_OK
            )

        except (User.DoesNotExist, OTPVerification.DoesNotExist):
            return Response({"error": "Invalid email or verification code."}, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer

    def get_object(self):
        return self.request.user