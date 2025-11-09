from django.urls import path
from .ai_views import StripeWebhookView

urlpatterns = [
    path("", StripeWebhookView.as_view(), name="stripe-webhook"),
]
