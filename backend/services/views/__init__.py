"""
Views package for services app
"""
from .gmail_views import (
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
)
from .splitwise_views import SplitwiseIntegrationViewSet
from .pattern_views import EmailAccountPatternViewSet

__all__ = [
    'GmailConnectView',
    'GmailCallbackView',
    'GmailConnectionStatusView',
    'GmailAccountListView',
    'GmailAccountDetailView',
    'GmailSyncView',
    'GmailConnectionTestView',
    'get_supported_currencies',
    'get_exchange_rates',
    'convert_currency',
    'SplitwiseIntegrationViewSet',
    'EmailAccountPatternViewSet',
]
