"""
URL configuration for app_settings project.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# Configure admin site
admin.site.site_header = "App Settings Administration"
admin.site.site_title = "App Settings Admin"
admin.site.index_title = "Welcome to App Settings Administration"


urlpatterns = [
    path("admin/", admin.site.urls),
    # Users (auth and user-related APIs) first to guarantee /api/auth/* resolves
    path("api/", include("users.urls")),
    path("api/", include("finance.urls")),
    path("api/v2/finance/", include("finance_v2.urls")),
    path("api/integrations/", include("services.urls")),
    path("api/", include("services.ai_urls")),  # Changed from /api/ai/ to /api/ so ai-config/* works
    path("accounts/", include("allauth.urls")),  # Added for django-allauth
]

# users.urls is part of INSTALLED_APPS; optional include logic removed for clarity

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
