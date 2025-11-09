"""
Views for Splitwise integration - authentication, sync, and management
"""
import logging
from rest_framework import viewsets, views, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction

from ..models import (
    SplitwiseIntegration,
    SplitwiseGroupMapping,
    SplitwiseExpenseMapping,
    SplitwiseSyncLog
)
from ..serializers import (
    SplitwiseIntegrationSerializer,
    SplitwiseIntegrationCreateSerializer,
    SplitwiseGroupMappingSerializer,
    SplitwiseExpenseMappingSerializer,
    SplitwiseSyncLogSerializer,
    SplitwiseSyncRequestSerializer
)
from ..services.splitwise_service import SplitwiseService, SplitwiseAuthError, SplitwiseAPIError
from ..services.splitwise_sync_service import SplitwiseSyncService


logger = logging.getLogger(__name__)


class SplitwiseIntegrationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Splitwise integration
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SplitwiseIntegrationSerializer

    def get_queryset(self):
        """Filter to current user's integration only"""
        return SplitwiseIntegration.objects.filter(user=self.request.user)

    def get_object(self):
        """Get the integration for the current user"""
        try:
            return SplitwiseIntegration.objects.get(user=self.request.user)
        except SplitwiseIntegration.DoesNotExist:
            return None

    def list(self, request):
        """
        Get current user's Splitwise integration status
        """
        try:
            integration = SplitwiseIntegration.objects.get(user=request.user)
            serializer = self.get_serializer(integration)
            return Response(serializer.data)
        except SplitwiseIntegration.DoesNotExist:
            return Response({
                'is_connected': False,
                'message': 'No Splitwise integration configured'
            }, status=status.HTTP_200_OK)

    def create(self, request):
        """
        Connect/create Splitwise integration with access token
        """
        serializer = SplitwiseIntegrationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        access_token = serializer.validated_data['access_token']

        try:
            # Verify token by fetching current user info from Splitwise
            api = SplitwiseService(access_token)
            user_info = api.get_current_user()

            # Create or update integration
            integration, created = SplitwiseIntegration.objects.update_or_create(
                user=request.user,
                defaults={
                    'access_token': access_token,
                    'splitwise_user_id': user_info.get('id'),
                    'splitwise_email': user_info.get('email'),
                    'splitwise_first_name': user_info.get('first_name'),
                    'splitwise_last_name': user_info.get('last_name'),
                    'is_active': True,
                    'auto_sync_enabled': serializer.validated_data.get('auto_sync_enabled', True),
                    'sync_interval_minutes': serializer.validated_data.get('sync_interval_minutes', 30),
                    'import_existing_groups': serializer.validated_data.get('import_existing_groups', True),
                    'import_existing_expenses': serializer.validated_data.get('import_existing_expenses', True),
                }
            )

            # Perform initial import if requested
            if serializer.validated_data.get('import_existing_groups', True):
                sync_service = SplitwiseSyncService(integration)
                sync_log = sync_service.full_import()

                response_serializer = SplitwiseIntegrationSerializer(integration)
                return Response({
                    'integration': response_serializer.data,
                    'sync_log': SplitwiseSyncLogSerializer(sync_log).data,
                    'message': 'Splitwise connected and initial import started' if created else 'Splitwise integration updated'
                }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

            response_serializer = SplitwiseIntegrationSerializer(integration)
            return Response({
                'integration': response_serializer.data,
                'message': 'Splitwise connected successfully' if created else 'Splitwise integration updated'
            }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

        except SplitwiseAuthError as e:
            logger.error(f"Splitwise authentication failed: {str(e)}")
            return Response({
                'error': 'Invalid access token',
                'detail': str(e)
            }, status=status.HTTP_401_UNAUTHORIZED)
        except SplitwiseAPIError as e:
            logger.error(f"Splitwise API error: {str(e)}")
            return Response({
                'error': 'Splitwise API error',
                'detail': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}", exc_info=True)
            return Response({
                'error': 'Internal server error',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def update(self, request, pk=None):
        """Update integration settings"""
        integration = self.get_object()
        if not integration:
            return Response({
                'error': 'No integration found'
            }, status=status.HTTP_404_NOT_FOUND)

        # Only allow updating certain fields
        allowed_fields = ['is_active', 'auto_sync_enabled', 'sync_interval_minutes']
        update_data = {k: v for k, v in request.data.items() if k in allowed_fields}

        for field, value in update_data.items():
            setattr(integration, field, value)

        integration.save()

        serializer = self.get_serializer(integration)
        return Response(serializer.data)

    def destroy(self, request, pk=None):
        """Disconnect Splitwise integration"""
        integration = self.get_object()
        if not integration:
            return Response({
                'error': 'No integration found'
            }, status=status.HTTP_404_NOT_FOUND)

        integration.delete()
        return Response({
            'message': 'Splitwise integration disconnected'
        }, status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'])
    def sync(self, request):
        """
        Trigger a sync operation
        POST /api/integrations/splitwise/sync/
        Body: {
            "sync_type": "full_import" | "incremental",
            "force": true | false
        }
        """
        integration = self.get_object()
        if not integration:
            return Response({
                'error': 'No Splitwise integration configured'
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = SplitwiseSyncRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        sync_type = serializer.validated_data.get('sync_type', 'incremental')
        force = serializer.validated_data.get('force', False)

        # Check if already syncing
        if integration.sync_status == 'syncing' and not force:
            return Response({
                'error': 'Sync already in progress',
                'message': 'Use force=true to override'
            }, status=status.HTTP_409_CONFLICT)

        try:
            sync_service = SplitwiseSyncService(integration)

            if sync_type == 'full_import':
                sync_log = sync_service.full_import()
            else:
                sync_log = sync_service.incremental_sync()

            return Response({
                'message': f'{sync_type} completed',
                'sync_log': SplitwiseSyncLogSerializer(sync_log).data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Sync failed: {str(e)}", exc_info=True)
            return Response({
                'error': 'Sync failed',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def sync_logs(self, request):
        """
        Get sync history/logs
        GET /api/integrations/splitwise/sync_logs/
        """
        integration = self.get_object()
        if not integration:
            return Response({
                'error': 'No Splitwise integration configured'
            }, status=status.HTTP_404_NOT_FOUND)

        logs = SplitwiseSyncLog.objects.filter(
            integration=integration
        ).order_by('-started_at')[:20]

        serializer = SplitwiseSyncLogSerializer(logs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def groups(self, request):
        """
        Get mapped groups
        GET /api/integrations/splitwise/groups/
        """
        integration = self.get_object()
        if not integration:
            return Response({
                'error': 'No Splitwise integration configured'
            }, status=status.HTTP_404_NOT_FOUND)

        mappings = SplitwiseGroupMapping.objects.filter(
            integration=integration
        ).select_related('local_group')

        serializer = SplitwiseGroupMappingSerializer(mappings, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['patch'], url_path='groups/(?P<mapping_id>[^/.]+)')
    def update_group_mapping(self, request, mapping_id=None):
        """
        Update group mapping settings (sync enabled, direction)
        PATCH /api/integrations/splitwise/groups/{mapping_id}/
        """
        integration = self.get_object()
        if not integration:
            return Response({
                'error': 'No Splitwise integration configured'
            }, status=status.HTTP_404_NOT_FOUND)

        try:
            mapping = SplitwiseGroupMapping.objects.get(
                id=mapping_id,
                integration=integration
            )
        except SplitwiseGroupMapping.DoesNotExist:
            return Response({
                'error': 'Group mapping not found'
            }, status=status.HTTP_404_NOT_FOUND)

        # Update allowed fields
        allowed_fields = ['sync_enabled', 'sync_direction']
        update_data = {k: v for k, v in request.data.items() if k in allowed_fields}

        for field, value in update_data.items():
            setattr(mapping, field, value)

        mapping.save()

        serializer = SplitwiseGroupMappingSerializer(mapping)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def expenses(self, request):
        """
        Get mapped expenses
        GET /api/integrations/splitwise/expenses/?group_mapping_id=123
        """
        integration = self.get_object()
        if not integration:
            return Response({
                'error': 'No Splitwise integration configured'
            }, status=status.HTTP_404_NOT_FOUND)

        # Filter by group mapping if provided
        group_mapping_id = request.query_params.get('group_mapping_id')

        queryset = SplitwiseExpenseMapping.objects.filter(
            group_mapping__integration=integration
        ).select_related('local_expense', 'group_mapping')

        if group_mapping_id:
            queryset = queryset.filter(group_mapping_id=group_mapping_id)

        mappings = queryset.order_by('-created_at')[:100]

        serializer = SplitwiseExpenseMappingSerializer(mappings, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='push-expense')
    def push_expense(self, request):
        """
        Push a local expense to Splitwise
        POST /api/integrations/splitwise/push-expense/
        Body: {
            "expense_id": 123,
            "create_group_if_needed": true
        }
        """
        integration = self.get_object()
        if not integration:
            return Response({
                'error': 'No Splitwise integration configured'
            }, status=status.HTTP_404_NOT_FOUND)

        expense_id = request.data.get('expense_id')
        if not expense_id:
            return Response({
                'error': 'expense_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            from finance.models import GroupExpense

            expense = GroupExpense.objects.get(id=expense_id)

            # Check if group has mapping
            try:
                group_mapping = SplitwiseGroupMapping.objects.get(
                    local_group=expense.group,
                    integration=integration
                )
            except SplitwiseGroupMapping.DoesNotExist:
                # Create group on Splitwise if requested
                if request.data.get('create_group_if_needed', False):
                    sync_service = SplitwiseSyncService(integration)
                    group_mapping = sync_service.create_splitwise_group_from_local(expense.group)

                    if not group_mapping:
                        return Response({
                            'error': 'Failed to create Splitwise group'
                        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                else:
                    return Response({
                        'error': 'Group not mapped to Splitwise',
                        'message': 'Set create_group_if_needed=true to create group automatically'
                    }, status=status.HTTP_400_BAD_REQUEST)

            # Push expense to Splitwise
            sync_service = SplitwiseSyncService(integration)
            expense_mapping = sync_service.create_splitwise_expense_from_local(
                expense,
                group_mapping
            )

            if not expense_mapping:
                return Response({
                    'error': 'Failed to create Splitwise expense'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response({
                'message': 'Expense pushed to Splitwise',
                'mapping': SplitwiseExpenseMappingSerializer(expense_mapping).data
            }, status=status.HTTP_201_CREATED)

        except GroupExpense.DoesNotExist:
            return Response({
                'error': 'Expense not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Failed to push expense: {str(e)}", exc_info=True)
            return Response({
                'error': 'Failed to push expense',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
