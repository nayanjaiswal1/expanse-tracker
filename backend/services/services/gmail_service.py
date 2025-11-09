import datetime
import logging

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from django.conf import settings
from django.utils import timezone

from .retry_utils import retry_with_backoff, ServiceUnavailableError

logger = logging.getLogger(__name__)


class GmailService:
    SCOPES = [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "openid"
    ]

    def __init__(self, gmail_account=None, user=None):
        if gmail_account:
            self.gmail_account = gmail_account
            self.user = gmail_account.user
        elif user:
            self.user = user
            # Get first active account for backward compatibility
            from ..models import GmailAccount
            self.gmail_account = GmailAccount.objects.filter(
                user=user, is_active=True
            ).first()
        else:
            raise ValueError("Either gmail_account or user must be provided")

        self.creds = self._get_credentials()

    def _get_credentials(self):
        """Retrieve and refresh Google OAuth credentials from the database."""
        if not self.gmail_account:
            print(f"No Gmail account available for user {self.user.id}")
            return None

        gmail_account = self.gmail_account

        # Check if we have necessary tokens
        if not gmail_account.refresh_token:
            print(f"No valid refresh token for user {self.user.id}")
            return None

        # Create credentials object from stored tokens
        creds = Credentials(
            token=gmail_account.access_token,
            refresh_token=gmail_account.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_OAUTH_CLIENT_ID,
            client_secret=settings.GOOGLE_OAUTH_CLIENT_SECRET,
            scopes=self.SCOPES,
        )

        # Set expiry if available (ensure timezone awareness)
        if gmail_account.expires_at:
            # Convert to UTC timezone-aware datetime for Google OAuth library compatibility
            if timezone.is_naive(gmail_account.expires_at):
                expiry_aware = timezone.make_aware(gmail_account.expires_at)
            else:
                expiry_aware = gmail_account.expires_at

            # Convert to UTC and make timezone-naive for Google OAuth library
            # The Google library expects timezone-naive UTC datetimes
            creds.expiry = expiry_aware.astimezone(datetime.timezone.utc).replace(tzinfo=None)

        # Refresh token if expired
        if not creds.valid:
            if creds.expired and creds.refresh_token:
                try:
                    creds.refresh(Request())

                    # Update stored tokens in database
                    gmail_account.access_token = creds.token
                    if creds.expiry:
                        # Google OAuth library returns timezone-naive UTC datetime
                        # Convert to timezone-aware UTC for Django model
                        if timezone.is_naive(creds.expiry):
                            # Assume UTC timezone for naive datetime from Google
                            expiry_utc = creds.expiry.replace(tzinfo=datetime.timezone.utc)
                            gmail_account.expires_at = expiry_utc
                        else:
                            gmail_account.expires_at = creds.expiry
                    gmail_account.save()

                    print(f"Refreshed OAuth tokens for user {self.user.id}")
                except Exception as e:
                    print(f"Failed to refresh OAuth tokens for user {self.user.id}: {e}")
                    # Mark account as needing re-authorization
                    from ..models import GmailAccount
                    try:
                        gmail_account = GmailAccount.objects.get(user=self.user, is_active=True)
                        gmail_account.access_token = ""
                        gmail_account.save()
                    except Exception:
                        pass
                    return None
            else:
                print(f"No valid refresh token for user {self.user.id}")
                return None

        return creds

    @retry_with_backoff(max_retries=3, base_delay=2.0, max_delay=30.0)
    def list_messages(self, query="in:inbox", max_results=10, page_token=None):
        if not self.creds:
            logger.error("Attempted to list messages without valid credentials for user %s", getattr(self.user, "id", None))
            raise Exception("Google credentials not available for user.")

        service = build("gmail", "v1", credentials=self.creds, cache_discovery=False)
        logger.debug("Listing Gmail messages for user %s with query='%s' max_results=%s page_token=%s", getattr(self.user, "id", None), query, max_results, page_token)
        results = (
            service.users()
            .messages()
            .list(userId="me", q=query, maxResults=max_results, pageToken=page_token)
            .execute()
        )
        messages = results.get("messages", [])
        logger.info("Fetched %s message headers for user %s (query='%s')", len(messages), getattr(self.user, "id", None), query)
        next_page_token = results.get("nextPageToken")
        return messages, next_page_token

    @retry_with_backoff(max_retries=3, base_delay=2.0, max_delay=30.0)
    def get_message(self, msg_id):
        if not self.creds:
            logger.error("Attempted to fetch message %s without valid credentials for user %s", msg_id, getattr(self.user, "id", None))
            raise Exception("Google credentials not available for user.")

        service = build("gmail", "v1", credentials=self.creds, cache_discovery=False)
        logger.debug("Retrieving Gmail message %s for user %s", msg_id, getattr(self.user, "id", None))
        msg = (
            service.users()
            .messages()
            .get(userId="me", id=msg_id, format="full")
            .execute()
        )
        return msg

    @retry_with_backoff(max_retries=3, base_delay=2.0, max_delay=30.0)
    def get_attachment(self, msg_id: str, attachment_id: str) -> dict:
        """Fetch a specific attachment payload for a message."""
        if not self.creds:
            logger.error(
                "Attempted to fetch attachment %s for message %s without valid credentials (user %s)",
                attachment_id,
                msg_id,
                getattr(self.user, "id", None),
            )
            raise Exception("Google credentials not available for user.")

        service = build("gmail", "v1", credentials=self.creds, cache_discovery=False)
        logger.debug(
            "Downloading attachment %s for message %s (user %s)",
            attachment_id,
            msg_id,
            getattr(self.user, "id", None),
        )
        attachment = (
            service.users()
            .messages()
            .attachments()
            .get(userId="me", messageId=msg_id, id=attachment_id)
            .execute()
        )
        return attachment

    @retry_with_backoff(max_retries=2, base_delay=1.0, max_delay=10.0)
    def test_connection(self):
        """Test Gmail API connection and return user profile info."""
        if not self.creds:
            return {"error": "No credentials available"}

        try:
            service = build("gmail", "v1", credentials=self.creds, cache_discovery=False)
            profile = service.users().getProfile(userId="me").execute()
            return {
                "success": True,
                "email": profile.get("emailAddress"),
                "messages_total": profile.get("messagesTotal", 0),
                "threads_total": profile.get("threadsTotal", 0),
                "history_id": profile.get("historyId")
            }
        except Exception as e:
            return {"error": f"Gmail API connection failed: {str(e)}"}
