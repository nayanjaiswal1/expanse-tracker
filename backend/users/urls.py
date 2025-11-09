from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    RegisterView,
    LogoutView,
    UserViewSet,
    AccountViewSet,
    CategoryViewSet,
    TagViewSet,
    UserPlanAssignmentViewSet,
    GroupExpenseShareViewSet,
    OnboardingViewSet,
    GoogleAuthUrl,
    GoogleLogin,
    UserAccountDeleteView,
)

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="users")
router.register(r"accounts", AccountViewSet, basename="accounts")
router.register(r"categories", CategoryViewSet, basename="categories")
router.register(r"tags", TagViewSet, basename="tags")
router.register(
    r"plan-assignment", UserPlanAssignmentViewSet, basename="plan-assignment"
)
router.register(
    r"group-expense-shares", GroupExpenseShareViewSet, basename="group-expense-shares"
)
router.register(r"onboarding", OnboardingViewSet, basename="onboarding")

urlpatterns = [
    # Auth endpoints
    path("auth/login/", CustomTokenObtainPairView.as_view(), name="auth_login"),
    path("auth/refresh/", CustomTokenRefreshView.as_view(), name="auth_refresh"),
    path("auth/register/", RegisterView.as_view(), name="auth_register"),
    path("auth/logout/", LogoutView.as_view(), name="auth_logout"),
    # Google OAuth endpoints
    path("auth/google_auth_url/", GoogleAuthUrl.as_view(), name="google_auth_url"),
    path("auth/google_login/", GoogleLogin.as_view(), name="google_login"),
    path("auth/google/callback/", GoogleLogin.as_view(), name="google_callback"),
    # User account deletion
    path("auth/user/", UserAccountDeleteView.as_view(), name="user_account_delete"),
]

# Mount viewsets under /api/ (finance_tracker/urls.py includes this module at path("api/", include("users.urls")))
urlpatterns += router.urls
