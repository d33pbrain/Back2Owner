"""
Django settings for Back2Owner project.

Configured for Render Deployment & Supabase PostgreSQL Database.
"""

import os
from datetime import timedelta
from pathlib import Path
from dotenv import load_dotenv
import dj_database_url

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file
load_dotenv(BASE_DIR / '.env')


# Quick-start development settings - unsuitable for production
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-fallback-key')

DEBUG = os.getenv('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '*').split(',')


# Application definition

INSTALLED_APPS = [
    # Django ASGI Server (must be at the top)
    'daphne',

    # Django core apps
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party apps
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt',
    'drf_spectacular',
    'channels',

    # Local Back2Owner apps
    'users',
    'items',
    'chat',
    'notifications',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Serves static files on Render
    'corsheaders.middleware.CorsMiddleware',      # Enables CORS for frontend requests
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

# ASGI Application for Channels/WebSockets
ASGI_APPLICATION = 'core.asgi.application'

# Channel Layer Configuration
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}


# Custom User Model
AUTH_USER_MODEL = 'users.User'


# Supabase PostgreSQL Database Configuration
DATABASES = {
    'default': dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=600,
        ssl_require=True if os.getenv('DATABASE_URL') else False
    )
}


# CORS Configuration
CORS_ALLOW_ALL_ORIGINS = True  # Set to False and specify CORS_ALLOWED_ORIGINS in production if needed
CORS_ALLOW_CREDENTIALS = True


# Django REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}


# Simple JWT Configuration
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}


# DRF Spectacular / Swagger Settings
SPECTACULAR_SETTINGS = {
    'TITLE': 'Back2Owner API',
    'DESCRIPTION': 'Backend API service for managing lost and found item reports, claims, and chat across campus.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}


# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media files (Uploaded images & avatars)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'


# Resend API & Email Configuration
RESEND_API_KEY = os.getenv('RESEND_API_KEY', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'Back2Owner <onboarding@resend.dev>')