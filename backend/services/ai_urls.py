from rest_framework.routers import DefaultRouter
from django.urls import include, path
from .ai_views import AIConfigurationViewSet, DocumentParsingView, AIChatView

router = DefaultRouter()
router.register(r"ai-config", AIConfigurationViewSet, basename="ai-config")

urlpatterns = [
    path("", include(router.urls)),
    path("parse-document/", DocumentParsingView.as_view(), name="parse_document"),
    path("chat/", AIChatView.as_view(), name="ai_chat"),
]
