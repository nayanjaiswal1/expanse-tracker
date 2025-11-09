# Standard library imports
import logging

# Third-party imports
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import (
    OutstandingToken,
    BlacklistedToken,
)

from django.contrib.auth import get_user_model, login
from django.db.models import F, Q
from django.conf import settings
from django.urls import reverse
from django.utils.http import urlencode
from django.shortcuts import redirect

# Allauth imports
from allauth.socialaccount.models import SocialAccount

# Local application imports
import finance.models as fmodels
from users.serializers_auth import MultiFieldTokenObtainPairSerializer
from users.models import Plan, UserPlanAssignment, UserAddon, ActivityLog, UserProfile
from users.image_utils import ProfilePhotoProcessor, cleanup_old_profile_photos
from finance.models import GroupExpenseShare
from users.serializers import (
    UserSerializer,
    UserSummarySerializer,
    UserProfileSerializer,
    UserSubscriptionSerializer,
    UserPreferencesSerializer,
    AISettingsSerializer,
    UserPersonalizationSerializer,
    UserPlanAssignmentSerializer,
    ActivityLogSerializer,
    OnboardingSerializer,
    CompleteOnboardingSerializer,
    ProfilePhotoSerializer,
    ProfileUpdateSerializer,
    PreferencesUpdateSerializer,
)
from users.models import UserPersonalization
# Lazy loading for finance serializers to avoid circular imports
from django.utils.functional import SimpleLazyObject

def get_finance_serializers():
    from finance.serializers import (
        AccountSerializer,
        BalanceRecordSerializer,
        CategorySerializer,
        TagSerializer,
        GroupExpenseShareSerializer,
    )
    return {
        'AccountSerializer': AccountSerializer,
        'BalanceRecordSerializer': BalanceRecordSerializer,
        'CategorySerializer': CategorySerializer,
        'TagSerializer': TagSerializer,
        'GroupExpenseShareSerializer': GroupExpenseShareSerializer,
    }

finance_serializers = SimpleLazyObject(get_finance_serializers)

logger = logging.getLogger(__name__)
auth_logger = logging.getLogger('users.auth')


def _handle_api_exception(
    e,
    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    message="An unexpected error occurred.",
):
    logger.exception(f"API Exception: {e}")  # Use exception to log traceback
    return Response(
        {"error": message if message != "An unexpected error occurred." else str(e)},
        status=status_code,
    )


User = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom JWT token view that accepts username/email/phone and returns user info with secure httpOnly cookies"""

    serializer_class = MultiFieldTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        username = request.data.get('username', 'Unknown')
        auth_logger.info(f"Login attempt for identifier: {username}")

        response = super().post(request, *args, **kwargs)
        logger.debug(
            f"CustomTokenObtainPairView: Response status: {response.status_code}"
        )
        logger.debug(f"CustomTokenObtainPairView: Response data: {response.data}")

        # Add user info to response
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.user
            response.data["user"] = UserSummarySerializer(
                user, context={'request': request}
            ).data

            # Log successful login
            auth_logger.info(f"Successful login: {user.email} (ID: {user.id})")

            # Keep tokens in response body for frontend localStorage usage
            # Also set secure httpOnly cookies for additional security (optional)
            access_token = response.data.get("access")
            refresh_token = response.data.get("refresh")

            if access_token:
                # Set httpOnly cookie for security
                response.set_cookie(
                    "access_token",
                    access_token,
                    max_age=60 * 60,  # 1 hour
                    httponly=True,
                    secure=settings.JWT_COOKIE_SECURE,
                    samesite=settings.JWT_COOKIE_SAMESITE,
                )

            if refresh_token:
                response.set_cookie(
                    "refresh_token",
                    refresh_token,
                    max_age=60 * 60 * 24 * 7,  # 7 days
                    httponly=True,
                    secure=settings.JWT_COOKIE_SECURE,
                    samesite=settings.JWT_COOKIE_SAMESITE,
                )

            # In production, you may want to remove tokens from response body and rely on httpOnly cookies only
            # For local development (DEBUG=True), keep tokens in body to simplify frontend usage
            if not settings.DEBUG:
                response.data.pop("access", None)
                response.data.pop("refresh", None)
        else:
            # Log failed login
            auth_logger.warning(f"Failed login attempt for identifier: {username} - Invalid credentials")

        return response


class CustomTokenRefreshView(APIView):
    """
    Custom JWT refresh view that uses httpOnly cookies.

    Note: AllowAny permission is correct here because users refreshing tokens
    typically have expired access tokens (that's why they're refreshing).
    Security is enforced by validating the refresh token itself, checking
    blacklist, and verifying token signature.
    """

    permission_classes = [AllowAny]  # Required: users may not have valid access token
    throttle_scope = 'token_refresh'  # Rate limiting to prevent abuse

    def post(self, request, *args, **kwargs):
        # Get refresh token from httpOnly cookie or request body (fallback)
        refresh_token = request.COOKIES.get("refresh_token") or request.data.get(
            "refresh"
        )

        if not refresh_token:
            return Response(
                {"error": "Refresh token not found"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            # Validate and refresh the token (this validates signature and expiry)
            refresh = RefreshToken(refresh_token)

            # Check if the refresh token is blacklisted
            from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken

            jti = refresh.get("jti")
            if BlacklistedToken.objects.filter(token__jti=jti).exists():
                raise TokenError("Token is blacklisted")

            access_token = str(refresh.access_token)
            new_refresh_token = str(refresh)

            # Get user info for response
            user_id = refresh.get("user_id")
            user = User.objects.get(id=user_id)

            # Create response with tokens (in DEBUG mode) and user info
            response_data = {
                "message": "Token refreshed successfully",
                "user": UserSummarySerializer(user, context={'request': request}).data,
            }

            # In DEBUG mode, also include tokens in response body for frontend convenience
            if settings.DEBUG:
                response_data.update(
                    {
                        "access": access_token,
                        "refresh": new_refresh_token,
                    }
                )

            response = Response(response_data)

            # Set new tokens as httpOnly cookies
            response.set_cookie(
                "access_token",
                access_token,
                max_age=60 * 60,  # 1 hour
                httponly=True,
                secure=settings.JWT_COOKIE_SECURE,
                samesite=settings.JWT_COOKIE_SAMESITE,
            )

            response.set_cookie(
                "refresh_token",
                new_refresh_token,
                max_age=60 * 60 * 24 * 7,  # 7 days
                httponly=True,
                secure=settings.JWT_COOKIE_SECURE,
                samesite=settings.JWT_COOKIE_SAMESITE,
            )

            return response

        except TokenError as e:
            response = _handle_api_exception(
                e,
                status_code=status.HTTP_401_UNAUTHORIZED,
                message="Invalid refresh token",
            )
            response.delete_cookie("access_token")
            response.delete_cookie("refresh_token")
            return response
        except User.DoesNotExist:
            return _handle_api_exception(
                None,
                status_code=status.HTTP_401_UNAUTHORIZED,
                message="User not found",
            )


from users.mixins import UserMixin
from users.utils.response_utils import create_response, not_found_response

class UserViewSet(viewsets.ModelViewSet, UserMixin):
    """
    User management endpoints with optimized queries and standardized responses
    """
    serializer_class = UserSummarySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Optimized base queryset with selective related fields
        """
        # Only select fields that exist on the User model
        # Profile fields will be loaded via select_related but not explicitly selected
        return User.objects.filter(id=self.request.user.id).select_related('profile')

    def get_serializer_context(self):
        """Add request to serializer context"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    @action(detail=False, methods=["get"])
    def me(self, request):
        """
        Get current user's basic profile information
        """
        user = self.get_queryset().first()
        if not user:
            return not_found_response("User not found")
            
        serializer = self.get_serializer(user)
        return create_response(data=serializer.data)

    def _get_profile_data(self, profile):
        """Helper method to get profile data with photo URLs"""
        if not profile:
            return {}
            
        serializer = UserProfileSerializer(profile, context=self.get_serializer_context())
        data = serializer.data
        
        # Get absolute URLs for profile photos
        def get_full_url(url):
            if url and not url.startswith(('http://', 'https://')):
                return self.request.build_absolute_uri(url) if self.request else url
            return url
            
        photo_url = get_full_url(profile.profile_photo_url)
        thumbnail_file = getattr(profile, 'profile_photo_thumbnail', None)
        thumbnail_url = get_full_url(getattr(thumbnail_file, 'url', None) if thumbnail_file else None)
        
        return {
            **data,
            'profile_photo_url': photo_url,
            'profile_photo_thumbnail_url': thumbnail_url,
            'profile_picture': photo_url,
            'has_custom_photo': bool(profile.profile_photo),
            'country': getattr(profile, 'country', None) or data.get('location'),
        }
        
    @action(detail=False, methods=["get", "patch"], url_path="profile")
    def profile(self, request):
        """
        Get or update user profile information
        """
        user = self.get_queryset().first()
        if not user:
            return not_found_response("User not found")
            
        profile = self.get_user_profile(user)

        if request.method.lower() == 'patch':
            serializer = ProfileUpdateSerializer(
                user, 
                data=request.data, 
                partial=True,
                context=self.get_serializer_context()
            )
            if not serializer.is_valid():
                return self.handle_validation_error(serializer)
                
            serializer.save()
            user.refresh_from_db()
            profile.refresh_from_db()

        return create_response(data=self._get_profile_data(profile))

    @action(detail=False, methods=["get", "patch"], url_path="preferences")
    def preferences(self, request):
        """Get or update user preferences"""
        user = self.get_queryset().first()
        if not user:
            return Response(status=status.HTTP_404_NOT_FOUND)

        preferences = getattr(user, 'preferences', None)
        if not preferences and request.method == 'GET':
            return Response({})

        if request.method.lower() == 'patch':
            serializer = PreferencesUpdateSerializer(user, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
            serializer.save()
            user.refresh_from_db()
            preferences = getattr(user, 'preferences', {})

        serializer = UserPreferencesSerializer(preferences)
        data = serializer.data
        
        # Add additional fields
        data.update({
            'preferred_currency': data.get('preferred_currency'),
            'default_currency': data.get('preferred_currency'),
            'enable_notifications': data.get('notifications_enabled'),
        })
        
        # Include both nested and flat structure in response
        return Response({
            'user': UserSummarySerializer(user, context={'request': request}).data,
            'preferences': data,
            **data
        })

    @action(detail=False, methods=["get"], url_path="subscription")
    def subscription(self, request):
        """Get user subscription details"""
        user = self.get_queryset().first()
        subscription = getattr(user, 'subscription', None) if user else None
        
        if not subscription:
            return Response({})
            
        data = UserSubscriptionSerializer(subscription).data
        data.update({
            'ai_credits_remaining': subscription.ai_credits_remaining,
            'ai_credits_used_this_month': subscription.ai_credits_used_this_month,
        })
        
        return Response({
            'subscription': data,
            **data
        })

    @action(detail=False, methods=["get"], url_path="ai-settings")
    def ai_settings(self, request):
        """Get user AI settings"""
        user = self.get_queryset().first()
        settings_instance = getattr(user, 'ai_settings', None) if user else None
        
        if not settings_instance:
            return Response({})
            
        data = AISettingsSerializer(settings_instance).data
        return Response({'ai_settings': data, **data})

    @action(detail=False, methods=["get"], url_path="plan-assignment")
    def plan_assignment(self, request):
        """Get user's plan assignment details"""
        user = self.get_queryset().first()
        assignment = getattr(user, 'plan_assignment', None) if user else None
        
        if not assignment:
            return Response({})
            
        data = UserPlanAssignmentSerializer(assignment).data
        return Response({'plan_assignment': data, **data})

    @action(detail=False, methods=["get", "patch"], url_path="personalization")
    def personalization(self, request):
        """Get or update user personalization data"""
        personalization, _ = UserPersonalization.objects.get_or_create(user=request.user)

        if request.method.lower() == 'patch':
            serializer = CompleteOnboardingSerializer(
                request.user,
                data=request.data,
                partial=True,
                context={'request': request},
            )
            
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
            serializer.save()
            request.user.refresh_from_db()
            personalization.refresh_from_db()

        # Common response data
        serializer = UserPersonalizationSerializer(personalization)
        data = serializer.data
        data.update({
            'personalization_data': personalization.preferences,
            'onboarding_step': personalization.onboarding_step,
            'is_onboarded': personalization.is_onboarded,
            'questionnaire_completed': personalization.questionnaire_completed,
        })
        
        # Include both nested and flat structure in response
        response_data = {
            'user': UserSummarySerializer(request.user, context={'request': request}).data,
            'personalization': data,
            **data
        }
        
        return Response(response_data)

    @action(detail=False, methods=["get"])
    def search(self, request):
        """Search users by email or username for group invitations"""
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response(
                {"detail": "Search query cannot be empty"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Search users by email or username (excluding current user)
        users = User.objects.filter(
            Q(email__icontains=query) | Q(username__icontains=query)
        ).exclude(id=request.user.id)[:10]  # Limit to 10 results

        # Return minimal user info for privacy
        results = []
        for user in users:
            results.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
            })

        return Response(results)

    @action(detail=False, methods=["post"])
    def upload_profile_photo(self, request):
        """Upload and process profile photo"""
        try:
            profile, created = UserProfile.objects.get_or_create(user=request.user)

            if 'profile_photo' not in request.FILES:
                return Response(
                    {"error": "No profile photo file provided"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            image_file = request.FILES['profile_photo']

            # Validate image file first
            validation_errors = ProfilePhotoProcessor.validate_image_file(image_file)
            if validation_errors:
                return Response(
                    {"errors": validation_errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Clean up old photos
            cleanup_old_profile_photos(profile)

            # Process image
            main_file, thumbnail_file, processing_errors = ProfilePhotoProcessor.process_profile_photo(
                image_file,
                filename_prefix=f"user_{request.user.id}"
            )

            if processing_errors:
                return Response(
                    {"errors": processing_errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Save processed images to profile
            profile.profile_photo.save(main_file.name, main_file, save=False)
            profile.profile_photo_thumbnail.save(thumbnail_file.name, thumbnail_file, save=False)
            profile.save()

            # Return updated profile photo info
            serializer = ProfilePhotoSerializer(profile)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return _handle_api_exception(e, message="Failed to upload profile photo")

    @action(detail=False, methods=["delete"])
    def delete_profile_photo(self, request):
        """Delete custom profile photo"""
        try:
            profile = request.user.profile

            if not profile.profile_photo:
                return Response(
                    {"error": "No custom profile photo to delete"},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Delete profile photos
            profile.delete_profile_photo()

            # Return updated profile photo info (will fall back to Google photo if available)
            serializer = ProfilePhotoSerializer(profile)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except UserProfile.DoesNotExist:
            return _handle_api_exception(
                None,
                status_code=status.HTTP_404_NOT_FOUND,
                message="User profile not found",
            )
        except Exception as e:
            return _handle_api_exception(e, message="Failed to delete profile photo")

    @action(detail=False, methods=["get"])
    def profile_photo_info(self, request):
        """Get current profile photo information"""
        try:
            profile = request.user.profile
            serializer = ProfilePhotoSerializer(profile)
            return Response(serializer.data)
        except UserProfile.DoesNotExist:
            return _handle_api_exception(
                None,
                status_code=status.HTTP_404_NOT_FOUND,
                message="User profile not found",
            )


class AccountViewSet(viewsets.ModelViewSet):
    @property
    def serializer_class(self):
        return finance_serializers['AccountSerializer']
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return fmodels.Account.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['get'])
    def balance_records(self, request, pk=None):
        """Get balance records for a specific account"""
        account = self.get_object()
        records = fmodels.BalanceRecord.objects.filter(
            account=account,
            user=request.user
        ).order_by('-date')

        serializer = BalanceRecordSerializer(records, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_balance_record(self, request, pk=None):
        """Add or update a balance record for a specific account"""
        account = self.get_object()

        # Get the required fields for uniqueness check
        date = request.data.get('date')
        entry_type = request.data.get('entry_type')

        if not date or not entry_type:
            return Response(
                {'error': 'Date and entry_type are required fields'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Prepare the data for update_or_create
        defaults = {
            'balance': request.data.get('balance'),
            'notes': request.data.get('notes', ''),
            'source': request.data.get('source', 'manual'),
            'is_month_end': request.data.get('is_month_end', False),
            'reconciliation_status': request.data.get('reconciliation_status', 'pending'),
            'statement_balance': request.data.get('statement_balance'),
            'total_income': request.data.get('total_income'),
            'total_expenses': request.data.get('total_expenses'),
            'calculated_change': request.data.get('calculated_change'),
            'actual_change': request.data.get('actual_change'),
            'missing_transactions': request.data.get('missing_transactions'),
            'period_start': request.data.get('period_start'),
            'period_end': request.data.get('period_end'),
            'confidence_score': request.data.get('confidence_score'),
            'metadata': request.data.get('metadata', {}),
            'user': request.user,
        }

        # Remove None values
        defaults = {k: v for k, v in defaults.items() if v is not None}

        try:
            # Use update_or_create to handle duplicates
            balance_record, created = fmodels.BalanceRecord.objects.update_or_create(
                account=account,
                date=date,
                entry_type=entry_type,
                user=request.user,
                defaults=defaults
            )

            # Serialize the result
            serializer = BalanceRecordSerializer(balance_record)

            # Return appropriate status code
            status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
            return Response(serializer.data, status=status_code)

        except Exception as e:
            return _handle_api_exception(e, status_code=status.HTTP_400_BAD_REQUEST, message="Failed to save balance record")

    @action(detail=True, methods=['get'])
    def monthly_balances(self, request, pk=None):
        """Get monthly balance records for a specific account"""
        account = self.get_object()
        monthly_records = fmodels.BalanceRecord.objects.filter(
            account=account,
            user=request.user,
            entry_type='monthly'
        ).order_by('-date')

        serializer = BalanceRecordSerializer(monthly_records, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='merge')
    def merge_accounts(self, request):
        """
        Merge source account into target account
        Payload: {
            "source_account_id": 123,
            "target_account_id": 456,
            "merge_strategy": "keep_target" | "sum_balances"
        }
        """
        from django.db import transaction as db_transaction

        source_id = request.data.get('source_account_id')
        target_id = request.data.get('target_account_id')
        merge_strategy = request.data.get('merge_strategy', 'keep_target')

        if not source_id or not target_id:
            return Response(
                {'error': 'Both source_account_id and target_account_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if source_id == target_id:
            return Response(
                {'error': 'Source and target accounts must be different'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Get both accounts
            source_account = fmodels.Account.objects.get(id=source_id, user=request.user)
            target_account = fmodels.Account.objects.get(id=target_id, user=request.user)

            with db_transaction.atomic():
                # Merge transactions
                transactions_updated = fmodels.Transaction.objects.filter(
                    user=request.user,
                    account=source_account
                ).update(account=target_account)

                # Merge balance records
                balance_records_updated = fmodels.BalanceRecord.objects.filter(
                    user=request.user,
                    account=source_account
                ).update(account=target_account)

                # Handle balance merging strategy
                if merge_strategy == 'sum_balances':
                    target_account.balance += source_account.balance
                    if source_account.available_balance and target_account.available_balance:
                        target_account.available_balance += source_account.available_balance
                # else: keep_target balance unchanged

                # Merge metadata if needed
                if source_account.metadata and target_account.metadata:
                    merged_metadata = {**target_account.metadata, **source_account.metadata}
                    target_account.metadata = merged_metadata

                target_account.save()

                # Mark source account as inactive/closed
                source_account.is_active = False
                source_account.status = 'closed'
                source_account.closed_date = timezone.now().date()
                source_account.save()

                return Response({
                    'message': 'Accounts merged successfully',
                    'source_account_id': source_id,
                    'target_account_id': target_id,
                    'transactions_moved': transactions_updated,
                    'balance_records_moved': balance_records_updated,
                    'target_account': AccountSerializer(target_account).data
                })

        except fmodels.Account.DoesNotExist:
            return _handle_api_exception(
                None,
                status_code=status.HTTP_404_NOT_FOUND,
                message="One or both accounts not found or do not belong to you",
            )
        except Exception as e:
            return _handle_api_exception(e, message="Failed to merge accounts")

    @action(detail=True, methods=['post'])
    def add_monthly_balance(self, request, pk=None):
        """Add a monthly balance record for a specific account"""
        account = self.get_object()

        # Add account to the request data and set entry type
        data = request.data.copy()
        data['account'] = account.id
        data['entry_type'] = 'monthly'
        data['is_month_end'] = True

        serializer = BalanceRecordSerializer(data=data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def monthly_balances_all(self, request):
        """Get all monthly balance records for all user accounts"""
        monthly_records = fmodels.BalanceRecord.objects.filter(
            user=request.user,
            entry_type='monthly'
        ).order_by('-date', 'account__name')

        serializer = BalanceRecordSerializer(monthly_records, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def discrepancies(self, request):
        """Get balance records with discrepancies"""
        balance_records = fmodels.BalanceRecord.objects.filter(
            user=request.user
        ).exclude(
            difference=0,
            missing_transactions=0
        ).order_by('-date')

        serializer = BalanceRecordSerializer(balance_records, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def balance_types(self, request):
        """Get balance records filtered by type"""
        entry_type = request.query_params.get('type', 'all')

        queryset = fmodels.BalanceRecord.objects.filter(user=request.user)

        if entry_type != 'all':
            queryset = queryset.filter(entry_type=entry_type)

        balance_records = queryset.order_by('-date')
        serializer = BalanceRecordSerializer(balance_records, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def bulk_monthly_balance_update(self, request):
        """Bulk update monthly balances for multiple accounts"""
        from datetime import datetime, date
        from django.db import transaction

        updates = request.data.get('updates', [])
        if not updates:
            return Response({'error': 'No updates provided'}, status=status.HTTP_400_BAD_REQUEST)

        update_date = request.data.get('date')
        if not update_date:
            # Default to today if no date provided
            update_date = date.today().strftime('%Y-%m-%d')

        created_records = []
        errors = []

        with transaction.atomic():
            for update in updates:
                account_id = update.get('account_id')
                balance = update.get('balance')
                notes = update.get('notes', '')

                if not account_id or balance is None:
                    errors.append(f"Account ID and balance required for update: {update}")
                    continue

                try:
                    # Get account and verify ownership
                    account = fmodels.Account.objects.get(id=account_id, user=request.user)

                    # Check if monthly balance already exists for this date
                    existing_record = fmodels.BalanceRecord.objects.filter(
                        account=account,
                        date=update_date,
                        entry_type='monthly'
                    ).first()

                    if existing_record:
                        # Update existing record
                        existing_record.balance = balance
                        existing_record.notes = notes
                        existing_record.save()
                        created_records.append(BalanceRecordSerializer(existing_record).data)
                    else:
                        # Create new monthly balance record
                        data = {
                            'account': account.id,
                            'balance': balance,
                            'date': update_date,
                            'entry_type': 'monthly',
                            'is_month_end': True,
                            'notes': notes,
                            'source': 'bulk_update'
                        }

                        serializer = BalanceRecordSerializer(data=data)
                        if serializer.is_valid():
                            record = serializer.save(user=request.user)
                            created_records.append(BalanceRecordSerializer(record).data)
                        else:
                            errors.append(f"Validation error for account {account_id}: {serializer.errors}")

                except fmodels.Account.DoesNotExist:
                    errors.append(f"Account with ID {account_id} not found or not owned by user")
                except Exception as e:
                    errors.append(f"Error updating account {account_id}: {str(e)}")

        response_data = {
            'created_records': created_records,
            'total_updated': len(created_records),
            'errors': errors
        }

        if errors:
            return Response(response_data, status=status.HTTP_207_MULTI_STATUS)
        else:
            return Response(response_data, status=status.HTTP_201_CREATED)




    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get accounts summary statistics"""
        accounts = self.get_queryset()

        total_balance = sum(float(a.balance) for a in accounts)
        active_accounts = accounts.filter(is_active=True).count()
        account_types = accounts.values('account_type').distinct().count()

        return Response({
            'total_accounts': accounts.count(),
            'total_balance': total_balance,
            'active_accounts': active_accounts,
            'account_types': account_types,
        }, status=status.HTTP_200_OK)


class CategoryViewSet(viewsets.ModelViewSet):
    @property
    def serializer_class(self):
        return finance_serializers['CategorySerializer']
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return fmodels.Category.objects.filter(user=self.request.user)


class TagViewSet(viewsets.ModelViewSet):
    @property
    def serializer_class(self):
        return finance_serializers['TagSerializer']
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return fmodels.Tag.objects.filter(user=self.request.user)


class UserPlanAssignmentViewSet(viewsets.ModelViewSet):
    @property
    def serializer_class(self):
        return finance_serializers['UserPlanAssignmentSerializer']
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserPlanAssignment.objects.filter(user=self.request.user)

    @action(detail=False, methods=["post"])
    def assign_plan(self, request):
        plan_id = request.data.get("plan_id")
        if not plan_id:
            return Response(
                {"error": "Plan ID is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            plan = Plan.objects.get(id=plan_id, plan_type="base", is_active=True)
        except Plan.DoesNotExist:
            return Response(
                {"error": "Base plan not found or not active"},
                status=status.HTTP_404_NOT_FOUND,
            )

        assignment, created = UserPlanAssignment.objects.get_or_create(
            user=request.user, defaults={"base_plan": plan}
        )
        if not created:
            assignment.base_plan = plan
            assignment.save()

        assignment.calculate_totals()
        serializer = self.get_serializer(assignment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def add_addon(self, request, pk=None):
        assignment = self.get_object()
        addon_id = request.data.get("addon_id")
        quantity = request.data.get("quantity", 1)

        try:
            addon = Plan.objects.get(id=addon_id, plan_type="addon", is_active=True)
        except Plan.DoesNotExist:
            return Response(
                {"error": "Addon not found or not active"},
                status=status.HTTP_404_NOT_FOUND,
            )

        user_addon, created = UserAddon.objects.get_or_create(
            user_plan=assignment, addon=addon, defaults={"quantity": quantity}
        )
        if not created:
            user_addon.quantity = F("quantity") + quantity
            user_addon.save()
            user_addon.refresh_from_db()

        assignment.calculate_totals()
        serializer = self.get_serializer(assignment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def remove_addon(self, request, pk=None):
        assignment = self.get_object()
        addon_id = request.data.get("addon_id")

        try:
            user_addon = UserAddon.objects.get(user_plan=assignment, addon_id=addon_id)
            user_addon.delete()
        except UserAddon.DoesNotExist:
            return Response(
                {"error": "Addon not found in your plan"},
                status=status.HTTP_404_NOT_FOUND,
            )

        assignment.calculate_totals()
        serializer = self.get_serializer(assignment)
        return Response(serializer.data)


class GroupExpenseShareViewSet(viewsets.ModelViewSet):
    @property
    def serializer_class(self):
        return finance_serializers['GroupExpenseShareSerializer']
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return GroupExpenseShare.objects.filter(group_expense__user=self.request.user)


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ActivityLog.objects.filter(user=self.request.user).order_by(
            "-created_at"
        )


class OnboardingViewSet(viewsets.ModelViewSet):
    serializer_class = CompleteOnboardingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Return users, not profiles
        User = get_user_model()
        return User.objects.filter(id=self.request.user.id)

    def get_object(self):
        # Return the user instance, not the profile
        # The serializer will handle creating/updating the UserPersonalization
        return self.request.user

    @action(detail=False, methods=["post"])
    def complete_step(self, request):
        user = self.get_object()
        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_user_data = serializer.save()

        return Response(updated_user_data)


class GoogleAuthUrl(APIView):
    """Generate Google OAuth2 authorization URL"""

    permission_classes = [AllowAny]

    def get(self, request):
        try:
            # Check if Google OAuth is configured
            client_id = settings.GOOGLE_OAUTH_CLIENT_ID
            if not client_id:
                return Response(
                    {"error": "Google OAuth client ID not configured"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            # Build Google OAuth URL manually
            base_url = "https://accounts.google.com/o/oauth2/v2/auth"
            redirect_uri = request.build_absolute_uri("/api/auth/google/callback/")

            params = {
                "client_id": client_id,
                "redirect_uri": redirect_uri,
                "scope": "openid email profile",
                "response_type": "code",
                "access_type": "offline",
                "prompt": "select_account",
                "state": "google_oauth",  # Add state parameter for frontend validation
            }

            auth_url = f"{base_url}?{urlencode(params)}"
            return Response({"auth_url": auth_url})

        except Exception as e:
            return _handle_api_exception(e, message="Error generating Google auth URL")


class GoogleLogin(APIView):
    """Handle Google OAuth2 callback and login"""

    permission_classes = [AllowAny]

    def get(self, request):
        """Handle Google OAuth callback from redirect - just pass parameters to frontend"""
        code = request.GET.get("code")
        state = request.GET.get("state", "")
        error = request.GET.get("error")

        logger.info(f"GET request to Google callback - code: {code[:10] if code else None}..., state: {state}, error: {error}")

        if error:
            frontend_url = f"http://localhost:5173/google-callback?error={error}"
        elif code:
            frontend_url = (
                f"http://localhost:5173/google-callback?code={code}&state={state}"
            )
        else:
            frontend_url = "http://localhost:5173/google-callback?error=Missing code"

        return redirect(frontend_url)

    def post(self, request):
        """Handle Google OAuth callback from API call"""
        return self._handle_google_auth(request)

    def _handle_google_auth(self, request):
        import requests
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests

        try:
            # Get code from either GET parameters (redirect) or POST data (API call)
            code = request.GET.get("code") or request.data.get("code")
            state = request.GET.get("state") or request.data.get("state")

            logger.info(f"Google OAuth callback - code: {code[:10] if code else None}..., state: {state}")

            if not code:
                logger.error("Authorization code is missing")
                return Response(
                    {"error": "Authorization code is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Check if Google OAuth is configured
            client_id = settings.GOOGLE_OAUTH_CLIENT_ID
            client_secret = settings.GOOGLE_OAUTH_CLIENT_SECRET

            if not client_id or not client_secret:
                return Response(
                    {"error": "Google OAuth not configured"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            # Exchange authorization code for access token
            # Use shorter timeout and session for better performance
            token_url = "https://oauth2.googleapis.com/token"
            redirect_uri = request.build_absolute_uri("/api/auth/google/callback/")

            token_data = {
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            }

            # Create a session for connection pooling and set timeout
            session = requests.Session()
            try:
                token_response = session.post(token_url, data=token_data, timeout=5)
                token_json = token_response.json()
            finally:
                session.close()

            logger.info(f"Google token response status: {token_response.status_code}")

            if "access_token" not in token_json:
                error_msg = token_json.get('error_description', token_json.get('error', 'Unknown error'))
                error_type = token_json.get('error', '')

                logger.error(f"Failed to get access token from Google: {error_msg} (type: {error_type})")

                # If authorization code was already used, this is likely a duplicate request
                if 'invalid_grant' in error_type or 'authorization code' in error_msg.lower():
                    return Response(
                        {"error": "Authorization code already used. Please try logging in again."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                return Response(
                    {"error": f"Failed to get access token from Google: {error_msg}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # OPTIMIZATION: Use ID token verification instead of separate API call
            # This is faster as it avoids an additional HTTP request to Google
            id_token_str = token_json.get("id_token")

            if id_token_str:
                # Verify and decode ID token (no network call needed!)
                try:
                    user_data = id_token.verify_oauth2_token(
                        id_token_str,
                        google_requests.Request(),
                        client_id
                    )
                    # Map ID token claims to expected user_data format
                    user_data = {
                        "id": user_data.get("sub"),
                        "email": user_data.get("email"),
                        "verified_email": user_data.get("email_verified", False),
                        "given_name": user_data.get("given_name", ""),
                        "family_name": user_data.get("family_name", ""),
                        "picture": user_data.get("picture", ""),
                    }
                except Exception as verify_error:
                    logger.warning(f"ID token verification failed: {verify_error}, falling back to userinfo endpoint")
                    # Fallback to userinfo endpoint if ID token verification fails
                    access_token = token_json["access_token"]
                    user_info_url = f"https://www.googleapis.com/oauth2/v2/userinfo?access_token={access_token}"
                    user_response = requests.get(user_info_url, timeout=5)
                    user_data = user_response.json()
            else:
                # Fallback: Use access token to get user info
                access_token = token_json["access_token"]
                user_info_url = f"https://www.googleapis.com/oauth2/v2/userinfo?access_token={access_token}"
                user_response = requests.get(user_info_url, timeout=5)
                user_data = user_response.json()

            # Find or create user
            email = user_data.get("email")
            if not email:
                logger.error("Email not provided by Google")
                return Response(
                    {"error": "Email not provided by Google"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            logger.info(f"Processing Google login for email: {email}")
            auth_logger.info(f"Google OAuth login attempt for email: {email}")

            # Check if user exists
            # OPTIMIZATION: Use select_related to reduce database queries
            try:
                user = User.objects.select_related('profile').get(email=email)
                created = False
                logger.info(f"Found existing user: {user.email}")
                auth_logger.info(f"Google OAuth: Found existing user {user.email} (ID: {user.id})")
            except User.DoesNotExist:
                # Create new user
                user = User.objects.create_user(
                    username=email,
                    email=email,
                    first_name=user_data.get("given_name", ""),
                    last_name=user_data.get("family_name", ""),
                )
                created = True
                logger.info(f"Created new user: {user.email}")
                auth_logger.info(f"Google OAuth: Created new user {user.email} (ID: {user.id})")

            # Create or get social account
            social_account, _ = SocialAccount.objects.get_or_create(
                user=user,
                provider="google",
                defaults={"uid": user_data.get("id"), "extra_data": user_data},
            )

            # Ensure user profile exists
            # Profile photo and email verification are now stored in SocialAccount
            UserProfile.objects.get_or_create(user=user)

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            jwt_access_token = str(refresh.access_token)
            refresh_token = str(refresh)

            # Prepare response
            response_data = {
                "user": UserSummarySerializer(user, context={'request': request}).data,
                "created": created,
            }

            # In DEBUG mode, include tokens in response
            if settings.DEBUG:
                response_data.update(
                    {
                        "access": jwt_access_token,
                        "refresh": refresh_token,
                    }
                )

            # Create JSON response for API calls
            response = Response(response_data, status=status.HTTP_200_OK)

            # Set httpOnly cookies
            response.set_cookie(
                "access_token",
                jwt_access_token,
                max_age=60 * 60,  # 1 hour
                httponly=True,
                secure=settings.JWT_COOKIE_SECURE,
                samesite=settings.JWT_COOKIE_SAMESITE,
            )

            response.set_cookie(
                "refresh_token",
                refresh_token,
                max_age=60 * 60 * 24 * 7,  # 7 days
                httponly=True,
                secure=settings.JWT_COOKIE_SECURE,
                samesite=settings.JWT_COOKIE_SAMESITE,
            )

            return response

        except Exception as e:
            return _handle_api_exception(e, message="Error during Google login")


class RegisterView(APIView):
    """User registration endpoint"""

    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")
        full_name = request.data.get("full_name", "")

        auth_logger.info(f"Registration attempt for email: {email}")

        if not email or not password:
            auth_logger.warning(f"Registration failed: Missing email or password")
            return Response({"error": "Email and password required"}, status=400)

        if User.objects.filter(Q(email=email) | Q(username=email)).exists():
            auth_logger.warning(f"Registration failed: User already exists with email {email}")
            return Response(
                {"error": "User with this email already exists"}, status=400
            )

        user = User.objects.create_user(
            username=email,  # Use email as username
            email=email,
            password=password,
            first_name=full_name.split(" ")[0] if full_name else "",
            last_name=" ".join(full_name.split(" ")[1:]) if " " in full_name else "",
        )

        auth_logger.info(f"Successful registration: {user.email} (ID: {user.id})")

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        # In DEBUG, also include tokens in response body for frontend convenience
        response_payload = {
            "user": UserSummarySerializer(user, context={'request': request}).data,
        }
        if settings.DEBUG:
            response_payload.update(
                {
                    "access": access_token,
                    "refresh": refresh_token,
                }
            )

        response = Response(response_payload, status=status.HTTP_201_CREATED)

        # Set httpOnly cookies for security
        response.set_cookie(
            "access_token",
            access_token,
            max_age=60 * 60,  # 1 hour
            httponly=True,
            secure=settings.JWT_COOKIE_SECURE,
            samesite=settings.JWT_COOKIE_SAMESITE,
        )

        response.set_cookie(
            "refresh_token",
            refresh_token,
            max_age=60 * 60 * 24 * 7,  # 7 days
            httponly=True,
            secure=settings.JWT_COOKIE_SECURE,
            samesite=settings.JWT_COOKIE_SAMESITE,
        )

        return response


class LogoutView(APIView):
    """User logout endpoint"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user_email = request.user.email if request.user.is_authenticated else "Anonymous"
        auth_logger.info(f"Logout request from user: {user_email}")

        # Try to get refresh token from cookie or request data
        refresh_token = request.COOKIES.get("refresh_token") or request.data.get(
            "refresh"
        )

        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                outstanding_token = OutstandingToken.objects.get(jti=token["jti"])
                BlacklistedToken.objects.get_or_create(token=outstanding_token)
                auth_logger.info(f"Successfully blacklisted token for user: {user_email}")
            except TokenError as e:
                logger.error(f"Error blacklisting token: {e}")
                auth_logger.warning(f"Failed to blacklist token for user: {user_email} - {str(e)}")

        auth_logger.info(f"Successful logout for user: {user_email}")

        response = Response(
            {"message": "Successfully logged out"}, status=status.HTTP_200_OK
        )

        # Clear httpOnly cookies
        response.set_cookie(
            "access_token",
            "",
            expires="Thu, 01 Jan 1970 00:00:00 GMT",
            max_age=0,
            httponly=True,
            secure=settings.JWT_COOKIE_SECURE,
            samesite=settings.JWT_COOKIE_SAMESITE,
            path="/",
        )
        response.set_cookie(
            "refresh_token",
            "",
            expires="Thu, 01 Jan 1970 00:00:00 GMT",
            max_age=0,
            httponly=True,
            secure=settings.JWT_COOKIE_SECURE,
            samesite=settings.JWT_COOKIE_SAMESITE,
            path="/",
        )

        return response


class UserAccountDeleteView(APIView):
    """Delete user account and all associated data"""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        """Permanently delete user account and all associated data"""
        user = request.user

        try:
            # Log the account deletion attempt
            logger.info(f"User account deletion requested for user: {user.email}")

            # Delete user and all associated data (CASCADE should handle related objects)
            user.delete()

            # Log successful deletion
            logger.info(f"User account successfully deleted: {user.email}")

            return Response(
                {"message": "User account and all associated data have been permanently deleted"},
                status=status.HTTP_200_OK
            )

        except Exception as e:
            return _handle_api_exception(e, message="Failed to delete user account")

