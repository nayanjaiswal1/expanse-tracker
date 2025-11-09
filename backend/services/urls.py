"""
URL configuration for services app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    GmailConnectView,
    GmailCallbackView,
    GmailConnectionStatusView,
    GmailAccountListView,
    GmailAccountDetailView,
    GmailSyncView,
    GmailConnectionTestView,
    get_supported_currencies,
    get_exchange_rates,
    convert_currency,
    SplitwiseIntegrationViewSet,
)
from .views.pattern_views import EmailAccountPatternViewSet
# AI views are now imported in ai_urls.py


app_name = "services"

# Router for viewsets
router = DefaultRouter()
router.register(r'splitwise', SplitwiseIntegrationViewSet, basename='splitwise')
router.register(r'email-patterns', EmailAccountPatternViewSet, basename='email-pattern')
# ai-config removed from here - now handled by ai_urls.py

urlpatterns = [
    # Gmail endpoints
    path("gmail-connect/", GmailConnectView.as_view(), name="gmail-connect"),
    path("gmail-callback/", GmailCallbackView.as_view(), name="gmail-callback"),
    path("gmail-connection-status/", GmailConnectionStatusView.as_view(), name="gmail-connection-status"),
    path("gmail-accounts/", GmailAccountListView.as_view(), name="gmail-accounts"),
    path("gmail-accounts/<int:account_id>/", GmailAccountDetailView.as_view(), name="gmail-account-detail"),
    path("gmail-sync/", GmailSyncView.as_view(), name="gmail-sync-all"),
    path("gmail-accounts/<int:account_id>/sync/", GmailSyncView.as_view(), name="gmail-sync-account"),
    path("gmail-test-connection/", GmailConnectionTestView.as_view(), name="gmail-test-connection"),

    # Currency endpoints
    path("currencies/", get_supported_currencies, name="supported-currencies"),
    path("currencies/exchange-rates/", get_exchange_rates, name="exchange-rates"),
    path("currencies/convert/", convert_currency, name="convert-currency"),

    # Router endpoints (Splitwise, Email Patterns)
    # Note: AI endpoints are now in ai_urls.py
    path("", include(router.urls)),
]
