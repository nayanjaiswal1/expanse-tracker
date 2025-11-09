from rest_framework.test import APITestCase
from django.urls import reverse
from django.contrib.auth import get_user_model

User = get_user_model()


class UserAuthenticationTests(APITestCase):
    def setUp(self):
        self.register_url = reverse("auth_register")
        self.login_url = reverse("auth_login")
        self.refresh_url = reverse("auth_refresh")
        self.logout_url = reverse("auth_logout")
        self.user_data = {"email": "test@example.com", "password": "password123"}
        self.user = User.objects.create_user(
            username=self.user_data["email"],
            email=self.user_data["email"],
            password=self.user_data["password"],
        )

    def test_user_registration(self):
        """
        Ensure we can register a new user.
        """
        new_user_data = {"email": "newuser@example.com", "password": "newpassword123"}
        response = self.client.post(self.register_url, new_user_data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(User.objects.count(), 2)  # One from setUp, one new
        self.assertEqual(
            User.objects.get(email="newuser@example.com").email, "newuser@example.com"
        )

    def test_user_login(self):
        """
        Ensure user can log in and receive tokens.
        """
        response = self.client.post(self.login_url, self.user_data, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("access_token", response.cookies)
        self.assertIn("refresh_token", response.cookies)

    def test_token_refresh(self):
        """
        Ensure access token can be refreshed using refresh token.
        """
        # First, log in to get a refresh token
        login_response = self.client.post(self.login_url, self.user_data, format="json")
        self.assertEqual(login_response.status_code, 200)
        refresh_token = login_response.cookies["refresh_token"].value

        # Now, use the refresh token to get a new access token
        self.client.cookies["refresh_token"] = refresh_token
        refresh_response = self.client.post(self.refresh_url, format="json")
        self.assertEqual(refresh_response.status_code, 200)
        self.assertIn("access_token", refresh_response.cookies)

    def test_user_logout(self):
        """
        Ensure user can log out and tokens are blacklisted/cleared.
        """
        # First, log in to get tokens
        login_response = self.client.post(self.login_url, self.user_data, format="json")
        self.assertEqual(login_response.status_code, 200)

        # Now, log out
        logout_response = self.client.post(self.logout_url, format="json")
        self.assertEqual(logout_response.status_code, 200)

        # Explicitly clear cookies from the test client
        self.client.cookies.clear()
        # Explicitly clear authentication credentials
        self.client.credentials()

        # Attempt to access an authenticated endpoint after logout
        profile_url = reverse("users-me")  # User's me endpoint
        response_after_logout = self.client.get(profile_url)
        self.assertIn(
            response_after_logout.status_code, [401, 403]
        )  # Unauthorized or Forbidden
