"""
Clean, minimal Finance app URL configuration.
Only exposes essential endpoints - removes all legacy/unused APIs.

Use this instead of urls.py for a clean API surface.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    BudgetViewSet,
    BudgetCategoryViewSet,
    BudgetTemplateViewSet,
)
from .views.account_views import AccountViewSet
from .views.category_views import CategoryViewSet
from .views.tag_views import TagViewSet

# Create router with only essential viewsets
router = DefaultRouter()

# Core finance models (supporting finance_v2)
router.register(r"accounts", AccountViewSet, basename="account")
router.register(r"categories", CategoryViewSet, basename="category")
router.register(r"tags", TagViewSet, basename="tag")

# Budget management
router.register(r"budgets", BudgetViewSet, basename="budget")
router.register(r"budget-categories", BudgetCategoryViewSet, basename="budget-category")
router.register(r"budget-templates", BudgetTemplateViewSet, basename="budget-template")

app_name = "finance"

urlpatterns = [
    path("", include(router.urls)),
]
