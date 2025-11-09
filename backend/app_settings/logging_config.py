"""
Industry-level logging configuration with rotation support
Includes separate logs for: requests, authentication, errors, security, and application logs
Automatically adjusts logging levels based on environment (DEBUG vs PRODUCTION)
"""

import os
from pathlib import Path
from decouple import config

# Build paths
BASE_DIR = Path(__file__).resolve().parent.parent
LOGS_DIR = BASE_DIR / "logs"

# Ensure logs directories exist
LOGS_DIR.mkdir(exist_ok=True)
(LOGS_DIR / "django").mkdir(exist_ok=True)

# Get environment configuration
DEBUG = config("DEBUG", default=False, cast=bool)
ENVIRONMENT = config("ENVIRONMENT", default="development")  # development, staging, production

# Set log levels based on environment
if DEBUG or ENVIRONMENT == "development":
    # Development: More verbose logging
    CONSOLE_LEVEL = "DEBUG"
    APP_LEVEL = "DEBUG"
    DJANGO_LEVEL = "INFO"
    DATABASE_LEVEL = "DEBUG"
else:
    # Production: Less verbose, only important information
    CONSOLE_LEVEL = "INFO"
    APP_LEVEL = "INFO"
    DJANGO_LEVEL = "WARNING"
    DATABASE_LEVEL = "WARNING"  # Disable database query logging in production

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
        "detailed": {
            "format": "[{levelname}] {asctime} [{name}:{lineno}] [PID:{process:d} TID:{thread:d}] - {message}",
            "style": "{",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
        "simple": {
            "format": "{levelname} {asctime} - {message}",
            "style": "{",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
        "json": {
            "format": '{"level": "%(levelname)s", "time": "%(asctime)s", "module": "%(module)s", "process": %(process)d, "thread": %(thread)d, "message": "%(message)s"}',
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
        "request": {
            "format": "{asctime} | {levelname} | {message}",
            "style": "{",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "level": CONSOLE_LEVEL,
            "class": "logging.StreamHandler",
            "formatter": "simple",
        },
        "file_debug": {
            "level": "DEBUG",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": LOGS_DIR / "django" / "debug.log",
            "maxBytes": 20 * 1024 * 1024,  # 20MB
            "backupCount": 10,
            "formatter": "detailed",
            "encoding": "utf-8",
        },
        "file_info": {
            "level": "INFO",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": LOGS_DIR / "django" / "info.log",
            "maxBytes": 20 * 1024 * 1024,  # 20MB
            "backupCount": 10,
            "formatter": "verbose",
            "encoding": "utf-8",
        },
        "file_error": {
            "level": "ERROR",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": LOGS_DIR / "django" / "error.log",
            "maxBytes": 20 * 1024 * 1024,  # 20MB
            "backupCount": 15,
            "formatter": "detailed",
            "encoding": "utf-8",
        },
        "file_security": {
            "level": "INFO",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": LOGS_DIR / "django" / "security.log",
            "maxBytes": 20 * 1024 * 1024,  # 20MB
            "backupCount": 20,
            "formatter": "json",
            "encoding": "utf-8",
        },
        "file_auth": {
            "level": "INFO",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": LOGS_DIR / "django" / "auth.log",
            "maxBytes": 20 * 1024 * 1024,  # 20MB
            "backupCount": 15,
            "formatter": "detailed",
            "encoding": "utf-8",
        },
        "file_request": {
            "level": "INFO",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": LOGS_DIR / "django" / "requests.log",
            "maxBytes": 50 * 1024 * 1024,  # 50MB for high-traffic logs
            "backupCount": 10,
            "formatter": "request",
            "encoding": "utf-8",
        },
        "file_database": {
            "level": "DEBUG",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": LOGS_DIR / "django" / "database.log",
            "maxBytes": 0,  # Disable rotation to avoid permission errors on some environments
            "backupCount": 5,
            "formatter": "detailed",
            "encoding": "utf-8",
        },
        "file_celery": {
            "level": "INFO",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": LOGS_DIR / "django" / "celery.log",
            "maxBytes": 20 * 1024 * 1024,  # 20MB
            "backupCount": 10,
            "formatter": "detailed",
            "encoding": "utf-8",
        },
    },
    "loggers": {
        # Django core loggers
        "django": {
            "handlers": ["console", "file_info", "file_error"],
            "level": DJANGO_LEVEL,
            "propagate": False,
        },
        "django.request": {
            "handlers": ["console", "file_request", "file_error"],
            "level": "INFO",
            "propagate": False,
        },
        "django.server": {
            "handlers": ["console", "file_request"],
            "level": "INFO",
            "propagate": False,
        },
        "django.security": {
            "handlers": ["file_security", "file_error"],
            "level": "INFO",
            "propagate": False,
        },
        "django.db.backends": {
            "handlers": ["file_database"],
            "level": DATABASE_LEVEL,
            "propagate": False,
        },
        # Application loggers
        "app_settings": {
            "handlers": ["console", "file_debug", "file_info", "file_error"],
            "level": APP_LEVEL,
            "propagate": False,
        },
        "users": {
            "handlers": ["console", "file_info", "file_error"],
            "level": APP_LEVEL,
            "propagate": False,
        },
        "users.auth": {
            "handlers": ["console", "file_auth", "file_error"],
            "level": "INFO",  # Always log authentication events
            "propagate": False,
        },
        "finance": {
            "handlers": ["console", "file_info", "file_error"],
            "level": APP_LEVEL,
            "propagate": False,
        },
        "services": {
            "handlers": ["console", "file_info", "file_error"],
            "level": APP_LEVEL,
            "propagate": False,
        },
        "ai": {
            "handlers": ["console", "file_info", "file_error"],
            "level": "INFO",
            "propagate": False,
        },
        "core": {
            "handlers": ["console", "file_info", "file_error"],
            "level": APP_LEVEL,
            "propagate": False,
        },
        # Celery logger
        "celery": {
            "handlers": ["console", "file_celery", "file_error"],
            "level": "INFO",
            "propagate": False,
        },
        "celery.task": {
            "handlers": ["console", "file_celery", "file_error"],
            "level": "INFO",
            "propagate": False,
        },
    },
    "root": {
        "handlers": ["console", "file_info", "file_error"],
        "level": "INFO",
    },
}
