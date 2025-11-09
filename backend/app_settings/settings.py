"""
Django settings for app_settings project.
"""

import os
from pathlib import Path
from decouple import config
from datetime import timedelta
from celery.schedules import crontab

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config("DEBUG", default=False, cast=bool)

# SECURITY WARNING: keep the secret key used in production secret!
if not DEBUG:
    # In production, SECRET_KEY MUST be set in environment
    SECRET_KEY = config("SECRET_KEY")
else:
    # In development, allow default but warn
    SECRET_KEY = config("SECRET_KEY", default="dev-insecure-secret-key-change-me-in-production")
    if SECRET_KEY == "dev-insecure-secret-key-change-me-in-production":
        import warnings
        warnings.warn("Using default SECRET_KEY in development. Set SECRET_KEY in .env for production!")

ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="127.0.0.1,localhost").split(",")

# Application definition
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",  # Added for django-allauth
    "allauth",  # Added for django-allauth
    "allauth.account",  # Added for django-allauth
    "allauth.socialaccount",  # Added for django-allauth
    "allauth.socialaccount.providers.google",  # Google OAuth provider
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "django_celery_beat",
    "finance",
    "finance_v2",
    "services",
    "users",
    "training.apps.TrainingConfig",
    "reference",  # Reference data (countries, currencies, languages, timezones)
]

SITE_ID = 1  # Added for django-allauth

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "users.middleware.SecurityHeadersMiddleware",
    "users.middleware.RequestResponseLoggingMiddleware",  # Request/Response logging
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    # 'users.middleware.SubscriptionLimitMiddleware',  # Temporarily disabled
    "users.middleware.APILoggingMiddleware",
    "services.middleware.AutoEmailSyncMiddleware",  # Auto-sync emails on page load
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",  # Added for django-allauth
]

ROOT_URLCONF = "app_settings.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "app_settings.wsgi.application"

# Database
# If full Postgres configuration is present, use it; otherwise, fall back to SQLite for development.
_db_name = config("DB_NAME", default="")
_db_user = config("DB_USER", default="")
_db_password = config("DB_PASSWORD", default="")
_db_host = config("DB_HOST", default="")
_db_port = config("DB_PORT", default="")

if (not DEBUG) and all([_db_name, _db_user, _db_password]):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql_psycopg2",
            "NAME": _db_name,
            "USER": _db_user,
            "PASSWORD": _db_password,
            "HOST": _db_host or "localhost",
            "PORT": int(_db_port) if _db_port else 5432,
        }
    }
else:
    # SQLite fallback for local dev
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")

# Media files
MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

# Custom media URL for production
CUSTOM_MEDIA_URL = config("CUSTOM_MEDIA_URL", default="")

if not DEBUG and CUSTOM_MEDIA_URL:
    MEDIA_URL = CUSTOM_MEDIA_URL

# ============================================================================
# Storage Configuration (S3 or Local)
# ============================================================================

# Storage backend: 'local' or 's3'
STORAGE_BACKEND = config("STORAGE_BACKEND", default="local")

# AWS S3 Configuration
AWS_ACCESS_KEY_ID = config("AWS_ACCESS_KEY_ID", default="")
AWS_SECRET_ACCESS_KEY = config("AWS_SECRET_ACCESS_KEY", default="")
AWS_STORAGE_BUCKET_NAME = config("AWS_STORAGE_BUCKET_NAME", default="")
AWS_S3_REGION_NAME = config("AWS_S3_REGION_NAME", default="us-east-1")
AWS_S3_CUSTOM_DOMAIN = config("AWS_S3_CUSTOM_DOMAIN", default="")
AWS_S3_OBJECT_PARAMETERS = {
    "CacheControl": "max-age=86400",
}
AWS_DEFAULT_ACL = None
AWS_S3_FILE_OVERWRITE = False
AWS_QUERYSTRING_AUTH = True
AWS_S3_SIGNATURE_VERSION = "s3v4"

# If using S3, configure django-storages
if STORAGE_BACKEND == "s3" and AWS_STORAGE_BUCKET_NAME:
    DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"
    if AWS_S3_CUSTOM_DOMAIN:
        MEDIA_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/"
    else:
        MEDIA_URL = f"https://{AWS_STORAGE_BUCKET_NAME}.s3.{AWS_S3_REGION_NAME}.amazonaws.com/"

# Default primary key field type
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Custom user model
# AUTH_USER_MODEL = 'core.User'  # Using default Django User model

# Authentication backends
AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",  # Default backend
    "allauth.account.auth_backends.AuthenticationBackend",  # Added for django-allauth
    "users.authentication.MultiFieldBackend",  # Custom multi-field backend (email/username/phone)
]

# django-allauth settings
ACCOUNT_LOGIN_METHODS = ["email"]
ACCOUNT_SIGNUP_FIELDS = ["email*", "password1*", "password2*"]
ACCOUNT_SESSION_REMEMBER = True
LOGIN_REDIRECT_URL = "/"
LOGOUT_REDIRECT_URL = "/"

# REST Framework configuration
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "users.auth_backends.CookieJWTAuthentication",  # Our custom cookie-based auth
        "rest_framework_simplejwt.authentication.JWTAuthentication",  # Fallback for API tokens
    ),
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "users.pagination.CustomPageNumberPagination",
    "PAGE_SIZE": 50,
    "EXCEPTION_HANDLER": "users.error_handlers.custom_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": [
        # Temporarily disabled for development
        # "users.throttling.BurstRateThrottle",
        # "users.throttling.SustainedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "burst": "200/min",        # 200 requests per minute (increased for dev)
        "sustained": "10000/day",  # 10000 requests per day (increased for dev)
        "analytics": "100/hour",   # Analytics endpoints
        "document_upload": "20/hour",  # Document uploads
        "ml_export": "10/hour",    # ML data exports
    },
}

# JWT Configuration

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": True,
}

# CORS settings - Allow all localhost origins for development
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:8080",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:5176",
    "http://127.0.0.1:8080",
]

# For development, also allow regex pattern for localhost
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://localhost:\d+$",
    r"^http://127\.0\.0\.1:\d+$",
]

CORS_ALLOW_CREDENTIALS = True

# CSRF trusted origins for cross-site POSTs from local dev UIs
CSRF_TRUSTED_ORIGINS = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:8080",
    "http://127.0.0.1",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:5176",
    "http://127.0.0.1:8080",
]

# File upload settings
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB

# AI Configuration
AI_ENCRYPTION_KEY = config(
    "AI_ENCRYPTION_KEY", default="your-encryption-key-here-change-in-production"
)
OPENAI_API_KEY = config("OPENAI_API_KEY", default="")
OLLAMA_ENDPOINT = config("OLLAMA_ENDPOINT", default="http://localhost:11434")

# Enhanced Document Parsing Configuration
OLLAMA_API_URL = config("OLLAMA_API_URL", default=f"{OLLAMA_ENDPOINT}/api/generate")
OLLAMA_MODEL = config("OLLAMA_MODEL", default="llama3")
USE_LLM_FOR_PARSING = config("USE_LLM_FOR_PARSING", default=True, cast=bool)

AI_PROVIDERS = {
    "openai": {
        "class": "services.ai_providers.OpenAIProvider",
        "model": "gpt-3.5-turbo",
    },
    "ollama": {
        "class": "services.ai_providers.OllamaProvider",
        "model": "llama2",
        "host": OLLAMA_ENDPOINT,
    },
}

# Google OAuth Configuration
GOOGLE_OAUTH_CLIENT_ID = config("GOOGLE_OAUTH_CLIENT_ID", default="")
GOOGLE_OAUTH_CLIENT_SECRET = config("GOOGLE_OAUTH_CLIENT_SECRET", default="")
GOOGLE_OAUTH_REDIRECT_URI = config(
    "GOOGLE_OAUTH_REDIRECT_URI",
    default="http://localhost:8000/api/integrations/gmail-callback/",
)

# django-allauth socialaccount providers
SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "SCOPE": [
            "profile",
            "email",
        ],
        "AUTH_PARAMS": {
            "access_type": "online",
        },
        "OAUTH_PKCE_ENABLED": True,
        "APP": {
            "client_id": GOOGLE_OAUTH_CLIENT_ID,
            "secret": GOOGLE_OAUTH_CLIENT_SECRET,
            "key": "",
        },
    }
}

# Additional allauth settings
SOCIALACCOUNT_LOGIN_ON_GET = True
SOCIALACCOUNT_AUTO_SIGNUP = True
ACCOUNT_EMAIL_VERIFICATION = "none"
SOCIALACCOUNT_EMAIL_VERIFICATION = "none"

# Security Settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

# Cookie settings for JWT tokens
SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=False, cast=bool)
SESSION_COOKIE_SECURE = config("SESSION_COOKIE_SECURE", default=not DEBUG, cast=bool)
CSRF_COOKIE_SECURE = config("CSRF_COOKIE_SECURE", default=not DEBUG, cast=bool)
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"  # Allow cross-site requests for OAuth callbacks
CSRF_COOKIE_SAMESITE = "Lax"
JWT_COOKIE_SECURE = config("JWT_COOKIE_SECURE", default=not DEBUG, cast=bool)

# For local development, use Lax so cookies work without HTTPS; production should use 'none' with Secure for cross-site
JWT_COOKIE_SAMESITE = "Lax" if DEBUG else "none"

# Rate limiting cache
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/1",
    }
}

# Celery Configuration for background tasks
CELERY_BROKER_URL = config("CELERY_BROKER_URL", default="redis://localhost:6379/0")
CELERY_RESULT_BACKEND = config(
    "CELERY_RESULT_BACKEND", default="redis://localhost:6379/0"
)
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "UTC"

# Celery Beat Schedule for periodic tasks



# Email Configuration
EMAIL_BACKEND = config(
    "EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend"
)
EMAIL_HOST = config("EMAIL_HOST", default="")
EMAIL_PORT = config("EMAIL_PORT", default=587, cast=int)
EMAIL_USE_TLS = config("EMAIL_USE_TLS", default=True, cast=bool)
EMAIL_HOST_USER = config("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = "Finance Tracker <noreply@financetracker.com>"

# Email fetch limit for integrations
EMAIL_FETCH_LIMIT = config("EMAIL_FETCH_LIMIT", default=10000, cast=int)

# ============================================================================
# AI / LLM Configuration for Email Labeling & Transaction Extraction
# ============================================================================

# LLM Provider: 'ollama', 'openai', 'anthropic', or 'openai-compatible'
LLM_PROVIDER = config("LLM_PROVIDER", default="ollama")

# LLM API Base URL (for Ollama or OpenAI-compatible endpoints)
LLM_API_BASE = config("LLM_API_BASE", default="http://localhost:11434")

# LLM Model Name
LLM_MODEL = config("LLM_MODEL", default="llama3:latest")

# LLM API Key (optional, for OpenAI/Anthropic)
LLM_API_KEY = config("LLM_API_KEY", default=None)

# LLM Request Timeout (seconds)
LLM_TIMEOUT = config("LLM_TIMEOUT", default=60, cast=int)

# LLM Max Retries
LLM_MAX_RETRIES = config("LLM_MAX_RETRIES", default=3, cast=int)

# AI Prompt Version (v1, v2, etc.)
AI_PROMPT_VERSION = config("AI_PROMPT_VERSION", default="v2")

# Transaction Merge Threshold (0.0-1.0)
TRANSACTION_MERGE_THRESHOLD = config("TRANSACTION_MERGE_THRESHOLD", default=0.75, cast=float)

# Training Data Directory
TRAINING_DATA_DIR = config("TRAINING_DATA_DIR", default=str(BASE_DIR / "training_data"))


# Logging Configuration
from app_settings.logging_config import LOGGING

# Custom User Model
# AUTH_USER_MODEL = 'core.User'  # Using default Django User model
