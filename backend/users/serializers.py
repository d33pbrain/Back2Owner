# users/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['id', 'full_name', 'email', 'department_or_faculty', 'password']

    def create(self, validated_data):
        # Set username to email by default
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            full_name=validated_data['full_name'],
            department_or_faculty=validated_data['department_or_faculty'],
            password=validated_data['password'],
            is_active=False  # User disabled until OTP is verified
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6)


class ResendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'full_name', 'email', 'department_or_faculty', 'avatar', 'is_verified']