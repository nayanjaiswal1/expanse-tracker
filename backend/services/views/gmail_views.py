"""
Views for services app - Gmail OAuth and account management.
"""

import os
import logging
from rest_framework import views, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.conf import settings
from django.shortcuts import redirect
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from ..models import GmailAccount
from ..serializers import GoogleAccountSerializer
from ..services.currency_service import CurrencyService
from ..constants import SUPPORTED_CURRENCIES

logger = logging.getLogger(__name__)

# Allow insecure transport for development (OAuth over HTTP)
if settings.DEBUG:
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'


class GmailConnectView(views.APIView):
    """Initiate Gmail OAuth flow"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Log the redirect URI being used (debug level)
        logger.debug(f"Using redirect URI: {settings.GOOGLE_OAUTH_REDIRECT_URI}")

        # Create flow instance to manage OAuth 2.0 Authorization Grant Flow steps.
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
                    "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [settings.GOOGLE_OAUTH_REDIRECT_URI],
                }
            },
                       scopes=[
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/userinfo.profile",
                "https://www.googleapis.com/auth/gmail.readonly",
                "openid"
            ],
            redirect_uri=settings.GOOGLE_OAUTH_REDIRECT_URI,
        )

        # Store user ID in session for callback
        request.session["gmail_oauth_user_id"] = request.user.id

        authorization_url, state = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            prompt="consent"  # Force consent screen to get refresh token
        )

        # Log the generated authorization URL
        logger.debug(f"Generated authorization URL: {authorization_url}")

        # Store state in session for verification
        request.session["gmail_oauth_state"] = state

        return Response({"authorization_url": authorization_url, "state": state})


class GmailCallbackView(views.APIView):
    """Handle Gmail OAuth callback"""

    permission_classes = [
        permissions.AllowAny
    ]  # Allow unauthenticated for OAuth callback

    def get(self, request):
        # Verify state parameter
        state = request.GET.get("state")
        stored_state = request.session.get("gmail_oauth_state")

        # Debug logging for OAuth state verification
        logger.debug(f"Received state: {state}")
        logger.debug(f"Stored state: {stored_state}")
        logger.debug(f"Session keys: {list(request.session.keys())}")

        if state != stored_state:
            return Response(
                {
                    "error": "Invalid state parameter",
                    "received_state": state,
                    "stored_state": stored_state,
                    "session_keys": list(request.session.keys())
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get user ID from session
        user_id = request.session.get("gmail_oauth_user_id")
        if not user_id:
            return Response(
                {"error": "User ID not found in session"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Exchange authorization code for tokens
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
                    "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [settings.GOOGLE_OAUTH_REDIRECT_URI],
                }
            },
            scopes= [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "openid"
        ],
            redirect_uri=settings.GOOGLE_OAUTH_REDIRECT_URI,
            state=state,
        )

        authorization_response = request.build_absolute_uri()
        flow.fetch_token(authorization_response=authorization_response)

        # Get user info from Google
        service = build("gmail", "v1", credentials=flow.credentials)
        profile = service.users().getProfile(userId="me").execute()

        # Save or update GoogleAccount
        try:
            from django.contrib.auth import get_user_model

            User = get_user_model()
            user = User.objects.get(id=user_id)

            # Warn if no refresh token (shouldn't happen with prompt=consent)
            if not flow.credentials.refresh_token:
                logger.warning(f"No refresh token received for {profile['emailAddress']}. "
                              "This will prevent automatic email syncing. User may need to reconnect.")

            gmail_account, created = GmailAccount.objects.update_or_create(
                user=user,
                email=profile["emailAddress"],
                defaults={
                    "name": f"Gmail ({profile['emailAddress']})",
                    "access_token": flow.credentials.token,
                    "refresh_token": flow.credentials.refresh_token or "",
                    "expires_at": flow.credentials.expiry,
                },
            )

            # Store email in session for frontend to retrieve
            request.session['gmail_connected_email'] = profile['emailAddress']
            request.session['gmail_connection_success'] = True

            # Clean up OAuth session data
            del request.session["gmail_oauth_user_id"]
            del request.session["gmail_oauth_state"]

            # Redirect to frontend Gmail callback page (don't expose email in URL)
            frontend_url = getattr(settings, 'FRONTEND_URL', settings.CORS_ALLOWED_ORIGINS[0] if settings.CORS_ALLOWED_ORIGINS else 'http://localhost:5175')
            return redirect(f"{frontend_url}/gmail-callback?success=true")

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class GmailConnectionStatusView(views.APIView):
    """Get Gmail connection status from session after OAuth redirect"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        Retrieve connection status and email from session.
        Frontend should call this after OAuth redirect.
        """
        success = request.session.pop('gmail_connection_success', False)
        email = request.session.pop('gmail_connected_email', None)

        if success and email:
            return Response({
                'success': True,
                'email': email,
                'message': f'Successfully connected {email}'
            })
        else:
            return Response({
                'success': False,
                'message': 'No recent connection'
            })


class GmailAccountListView(views.APIView):
    """List and manage Gmail accounts"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get all Gmail accounts for user"""
        gmail_accounts = GmailAccount.objects.filter(user=request.user)
        serializer = GoogleAccountSerializer(gmail_accounts, many=True)
        return Response({"accounts": serializer.data, "count": len(gmail_accounts)})


class GmailAccountDetailView(views.APIView):
    """Manage individual Gmail account"""

    permission_classes = [permissions.IsAuthenticated]

    def get_account(self, request, account_id):
        """Get specific Gmail account"""
        try:
            return GmailAccount.objects.get(id=account_id, user=request.user)
        except GmailAccount.DoesNotExist:
            return None

    def get(self, request, account_id):
        """Get specific Gmail account details"""
        account = self.get_account(request, account_id)
        if not account:
            return Response(
                {"error": "Gmail account not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = GoogleAccountSerializer(account)
        return Response(serializer.data)

    def patch(self, request, account_id):
        """Update Gmail account settings"""
        account = self.get_account(request, account_id)
        if not account:
            return Response(
                {"error": "Gmail account not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Update account settings
        if "name" in request.data:
            account.name = request.data["name"]
        if "transaction_tag" in request.data:
            account.transaction_tag = request.data["transaction_tag"]
        if "sender_filters" in request.data:
            account.sender_filters = request.data["sender_filters"]
        if "keyword_filters" in request.data:
            account.keyword_filters = request.data["keyword_filters"]
        if "is_active" in request.data:
            account.is_active = request.data["is_active"]

        account.save()

        serializer = GoogleAccountSerializer(account)
        return Response(serializer.data)

    def delete(self, request, account_id):
        """Delete Gmail account"""
        account = self.get_account(request, account_id)
        if not account:
            return Response(
                {"error": "Gmail account not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        account.delete()
        return Response({"message": "Gmail account deleted successfully"})


class GmailSyncView(views.APIView):
    """Manually trigger email sync for Gmail accounts"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, account_id=None):
        """Manually trigger email sync"""
        try:
            from ..tasks import sync_gmail_account

            if account_id:
                # Sync specific account
                account = GmailAccount.objects.get(id=account_id, user=request.user)
                result = sync_gmail_account.delay(account.id)
                return Response({
                    "message": f"Email sync started for account {account.email}",
                    "task_id": result.id
                })
            else:
                # Sync all user's accounts
                user_accounts = GmailAccount.objects.filter(user=request.user, is_active=True)
                if not user_accounts.exists():
                    return Response(
                        {"error": "No active Gmail accounts found"},
                        status=status.HTTP_404_NOT_FOUND
                    )

                task_ids = []
                for account in user_accounts:
                    result = sync_gmail_account.delay(account.id)
                    task_ids.append({"account_id": account.id, "task_id": result.id})

                return Response({
                    "message": f"Email sync started for {len(task_ids)} accounts",
                    "tasks": task_ids
                })

        except GmailAccount.DoesNotExist:
            return Response(
                {"error": "Gmail account not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class GmailConnectionTestView(views.APIView):
    """Test Gmail API connection"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Test Gmail API connection and return status"""
        try:
            from .services.gmail_service import GmailService

            gmail_service = GmailService(request.user)
            result = gmail_service.test_connection()

            if "error" in result:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response(result)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_supported_currencies(request):
    """Get list of supported currencies with their symbols and names."""
    return Response({
        'currencies': SUPPORTED_CURRENCIES,
        'count': len(SUPPORTED_CURRENCIES)
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_exchange_rates(request):
    """Get current exchange rates for a base currency."""
    base_currency = request.query_params.get('base', 'USD')

    currency_service = CurrencyService()
    rates = currency_service.get_all_rates(base_currency)

    if rates:
        return Response({
            'base_currency': base_currency,
            'rates': rates,
        }, status=status.HTTP_200_OK)
    else:
        return Response({
            'error': f'Unable to fetch exchange rates for {base_currency}'
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def convert_currency(request):
    """Convert amount between currencies."""
    data = request.data

    from_currency = data.get('from_currency')
    to_currency = data.get('to_currency')
    amount = data.get('amount')

    if not all([from_currency, to_currency, amount]):
        return Response({
            'error': 'from_currency, to_currency, and amount are required'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        amount = float(amount)
    except (ValueError, TypeError):
        return Response({
            'error': 'Amount must be a valid number'
        }, status=status.HTTP_400_BAD_REQUEST)

    currency_service = CurrencyService()
    from decimal import Decimal
    converted_amount = currency_service.convert_amount(
        Decimal(str(amount)), from_currency, to_currency
    )

    if converted_amount is not None:
        exchange_rate = currency_service.get_exchange_rate(from_currency, to_currency)
        return Response({
            'from_currency': from_currency,
            'to_currency': to_currency,
            'original_amount': amount,
            'converted_amount': float(converted_amount),
            'exchange_rate': float(exchange_rate) if exchange_rate else None,
        }, status=status.HTTP_200_OK)
    else:
        return Response({
            'error': f'Unable to convert from {from_currency} to {to_currency}'
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
