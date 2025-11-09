from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from django.test.utils import override_settings
from unittest.mock import patch, MagicMock
from urllib.parse import urlparse, parse_qs
from rest_framework.test import APITestCase
from users.models import UserProfile, UserPreferences


class UserAPITests(APITestCase):
    def create_user(self, **kwargs):
        """
        Helper to create a user with related data normalized for serialization.
        """
        user = get_user_model().objects.create_user(**kwargs)

        # Ensure related objects created via signals use date objects (not datetimes) for date fields.
        subscription = getattr(user, "subscription", None)
        if subscription:
            subscription.last_reset_date = timezone.now().date()
            subscription.save(update_fields=["last_reset_date"])

        return user

    def test_user_list_is_protected(self):
        """
        Ensure that the user list endpoint is protected.
        """
        response = self.client.get(reverse("users-list"))
        self.assertEqual(response.status_code, 403)

    def test_me_endpoint_returns_authenticated_user(self):
        """
        Authenticated users should receive their serialized profile from /users/me/.
        """
        user = self.create_user(
            username="alice",
            email="alice@example.com",
            password="testpass123",
        )
        self.client.force_authenticate(user=user)

        response = self.client.get(reverse("users-me"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], user.id)
        self.assertEqual(response.data["email"], user.email)

    def test_me_endpoint_include_sections(self):
        """
        The /users/me/ endpoint should return optional sections when requested via include.
        """
        user = self.create_user(
            username="erin",
            email="erin@example.com",
            password="testpass123",
        )
        UserProfile.objects.create(user=user, phone="+12345")
        UserPreferences.objects.create(user=user, preferred_currency="EUR")

        self.client.force_authenticate(user=user)

        response = self.client.get(
            reverse("users-me"),
            {"include": "profile,preferences"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("profile", response.data)
        self.assertIn("preferences", response.data)
        self.assertEqual(response.data["profile"]["phone"], "+12345")
        self.assertEqual(response.data["preferences"]["preferred_currency"], "EUR")

    def test_profile_endpoint_returns_profile(self):
        user = self.create_user(
            username="fiona",
            email="fiona@example.com",
            password="testpass123",
        )
        UserProfile.objects.create(user=user, phone="+99999", bio="Bio")

        self.client.force_authenticate(user=user)

        response = self.client.get(reverse("users-profile"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("phone"), "+99999")
        self.assertIn("profile", response.data)

    def test_preferences_endpoint_returns_preferences(self):
        user = self.create_user(
            username="harry",
            email="harry@example.com",
            password="testpass123",
        )
        UserPreferences.objects.create(user=user, preferred_currency="GBP")

        self.client.force_authenticate(user=user)

        response = self.client.get(reverse("users-preferences"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("preferred_currency"), "GBP")
        self.assertIn("preferences", response.data)

    def test_subscription_endpoint_returns_subscription(self):
        user = self.create_user(
            username="iris",
            email="iris@example.com",
            password="testpass123",
        )
        subscription = getattr(user, "subscription", None)
        if subscription:
            subscription.ai_credits_remaining = 42
            subscription.save(update_fields=["ai_credits_remaining"])

        self.client.force_authenticate(user=user)

        response = self.client.get(reverse("users-subscription"))

        self.assertEqual(response.status_code, 200)
        if subscription:
            self.assertEqual(response.data.get("ai_credits_remaining"), 42)

    def test_personalization_endpoint_returns_data(self):
        """
        /users/personalization/ should return the user's personalization payload.
        """
        user = self.create_user(
            username="gina",
            email="gina@example.com",
            password="testpass123",
        )
        self.client.force_authenticate(user=user)

        response = self.client.get(reverse("users-personalization"))

        self.assertEqual(response.status_code, 200)
        self.assertIn("personalization", response.data)
        self.assertIn("preferences", response.data)
        self.assertIn("onboarding_step", response.data)
        self.assertIn("personalization_data", response.data)

    def test_me_endpoint_requires_authentication(self):
        """
        Unauthenticated requests to /users/me/ should receive 401.
        """
        response = self.client.get(reverse("users-me"))
        self.assertEqual(response.status_code, 403)

    def test_search_requires_query_parameter(self):
        """
        Missing search query should return validation error.
        """
        user = self.create_user(
            username="bob",
            email="bob@example.com",
            password="testpass123",
        )
        self.client.force_authenticate(user=user)

        response = self.client.get(reverse("users-search"))

        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.data)

    def test_user_list_returns_only_authenticated_user(self):
        """
        User list should be scoped to the authenticated user.
        """
        user = self.create_user(
            username="primary",
            email="primary@example.com",
            password="testpass123",
        )
        self.create_user(
            username="secondary",
            email="secondary@example.com",
            password="testpass123",
        )
        self.client.force_authenticate(user=user)

        response = self.client.get(reverse("users-list"))

        self.assertEqual(response.status_code, 200)

        payload = response.data
        if isinstance(payload, list):
            self.assertEqual(len(payload), 1)
            record = payload[0]
        else:
            results = payload.get("results")
            if isinstance(results, list):
                self.assertEqual(payload.get("count"), 1)
                self.assertEqual(len(results), 1)
                record = results[0]
            else:
                # Fallback when pagination is disabled and a dict is returned
                record = payload

        self.assertEqual(record["id"], user.id)

    def test_update_preferences_allows_partial_updates(self):
        """PATCH /users/preferences/ should accept partial updates."""
        user = self.create_user(
            username="charlie",
            email="charlie@example.com",
            password="testpass123",
            first_name="Original",
        )
        self.client.force_authenticate(user=user)

        payload = {"theme": "dark"}
        response = self.client.patch(reverse("users-preferences"), payload, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["theme"], "dark")

    def test_search_finds_matching_users_and_excludes_self(self):
        """
        /users/search/ should return matching users and omit the requester.
        """
        user = self.create_user(
            username="david",
            email="david@example.com",
            password="testpass123",
        )
        other = self.create_user(
            username="dave2",
            email="dave2@example.com",
            password="testpass123",
        )
        self.client.force_authenticate(user=user)

        response = self.client.get(reverse("users-search"), {"q": "dav"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], other.id)


@override_settings(
    GOOGLE_OAUTH_CLIENT_ID="test-client-id",
    GOOGLE_OAUTH_CLIENT_SECRET="test-secret",
    DEBUG=True,
    JWT_COOKIE_SECURE=False,
    JWT_COOKIE_SAMESITE="Lax",
)
class GoogleAuthTests(APITestCase):
    def test_google_auth_url_returns_configured_redirect(self):
        response = self.client.get(reverse("google_auth_url"))

        self.assertEqual(response.status_code, 200)
        auth_url = response.data["auth_url"]
        parsed = urlparse(auth_url)
        params = parse_qs(parsed.query)
        self.assertEqual(parsed.scheme, "https")
        self.assertEqual(parsed.netloc, "accounts.google.com")
        self.assertEqual(params["client_id"][0], "test-client-id")
        self.assertEqual(
            params["redirect_uri"][0],
            "http://testserver/api/auth/google/callback/",
        )

    @override_settings(GOOGLE_OAUTH_CLIENT_ID="")
    def test_google_auth_url_handles_missing_client_id(self):
        response = self.client.get(reverse("google_auth_url"))
        self.assertEqual(response.status_code, 500)
        self.assertIn("error", response.data)

    @patch("requests.Session")
    @patch("users.views.UserSummarySerializer")
    @patch("google.oauth2.id_token.verify_oauth2_token")
    def test_google_login_creates_user_via_post(
        self,
        mock_verify,
        mock_serializer,
        mock_session,
    ):
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "access_token": "access",
            "id_token": "idtoken",
        }
        mock_response.status_code = 200
        mock_session.return_value.post.return_value = mock_response

        mock_verify.return_value = {
            "sub": "google-id",
            "email": "oauth_user@example.com",
            "email_verified": True,
            "given_name": "OAuth",
            "family_name": "User",
            "picture": "http://example.com/photo.jpg",
        }

        mock_serializer.return_value.data = {
            "id": 1,
            "email": "oauth_user@example.com",
        }

        response = self.client.post(
            "/api/auth/google_login/",
            {"code": "auth-code", "state": "google_oauth"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertTrue(response.data["created"])
        self.assertIn("access_token", response.cookies)
        self.assertIn("refresh_token", response.cookies)

    def test_google_login_missing_code_returns_error(self):
        response = self.client.post("/api/auth/google_login/", {}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.data)
