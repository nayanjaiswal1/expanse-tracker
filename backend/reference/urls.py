"""
URL configuration for reference data endpoints.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReferenceDataViewSet

router = DefaultRouter()
router.register(r'', ReferenceDataViewSet, basename='reference')

urlpatterns = [
    path('', include(router.urls)),
]
