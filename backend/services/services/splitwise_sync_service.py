"""
Splitwise synchronization service for bi-directional data sync
"""
import logging
from typing import Dict, List, Optional, Tuple
from decimal import Decimal
from datetime import datetime, timedelta
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model

from ..models import (
    SplitwiseIntegration,
    SplitwiseGroupMapping,
    SplitwiseExpenseMapping,
    SplitwiseSyncLog
)
from finance.models import ExpenseGroup, GroupExpense, GroupExpenseShare, ExpenseGroupMembership
from .splitwise_service import SplitwiseService, SplitwiseAPIError

User = get_user_model()
logger = logging.getLogger(__name__)


class SplitwiseSyncService:
    """
    Service for synchronizing data between our app and Splitwise
    Handles full imports and incremental bi-directional sync
    """

    def __init__(self, integration: SplitwiseIntegration):
        """
        Initialize sync service

        Args:
            integration: SplitwiseIntegration instance
        """
        self.integration = integration
        self.user = integration.user
        self.api = SplitwiseService(integration.access_token)

    # =====================
    # Main Sync Methods
    # =====================

    def full_import(self) -> SplitwiseSyncLog:
        """
        Perform full import of groups and expenses from Splitwise

        Returns:
            SplitwiseSyncLog instance with sync results
        """
        sync_log = SplitwiseSyncLog.objects.create(
            integration=self.integration,
            sync_type='full_import',
            status='started'
        )

        try:
            self.integration.mark_sync_started()

            # Import groups
            groups_created, groups_updated = self._import_groups()
            sync_log.groups_created = groups_created
            sync_log.groups_updated = groups_updated

            # Import expenses for each mapped group
            expenses_created, expenses_updated = self._import_expenses()
            sync_log.expenses_created = expenses_created
            sync_log.expenses_updated = expenses_updated

            sync_log.mark_completed('success')
            self.integration.mark_sync_success()

            logger.info(
                f"Full import completed: {groups_created} groups, {expenses_created} expenses created"
            )

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Full import failed: {error_msg}", exc_info=True)
            sync_log.error_message = error_msg
            sync_log.errors_count = 1
            sync_log.mark_completed('error')
            self.integration.mark_sync_error(error_msg)

        return sync_log

    def incremental_sync(self) -> SplitwiseSyncLog:
        """
        Perform incremental bi-directional sync
        - Pull changes from Splitwise (updated expenses)
        - Push local changes to Splitwise

        Returns:
            SplitwiseSyncLog instance with sync results
        """
        sync_log = SplitwiseSyncLog.objects.create(
            integration=self.integration,
            sync_type='incremental',
            status='started'
        )

        try:
            self.integration.mark_sync_started()

            # Pull changes from Splitwise
            expenses_updated = self._pull_updates_from_splitwise()
            sync_log.expenses_updated = expenses_updated

            # Push local changes to Splitwise
            expenses_pushed = self._push_updates_to_splitwise()
            sync_log.expenses_synced = expenses_pushed

            sync_log.mark_completed('success')
            self.integration.mark_sync_success()

            logger.info(
                f"Incremental sync completed: {expenses_updated} pulled, {expenses_pushed} pushed"
            )

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Incremental sync failed: {error_msg}", exc_info=True)
            sync_log.error_message = error_msg
            sync_log.errors_count = 1
            sync_log.mark_completed('error')
            self.integration.mark_sync_error(error_msg)

        return sync_log

    # =====================
    # Import Methods (Pull from Splitwise)
    # =====================

    def _import_groups(self) -> Tuple[int, int]:
        """
        Import groups from Splitwise

        Returns:
            Tuple of (groups_created, groups_updated)
        """
        groups_created = 0
        groups_updated = 0

        splitwise_groups = self.api.get_groups()

        for sw_group in splitwise_groups:
            group_id = sw_group.get('id')
            group_name = sw_group.get('name', 'Unnamed Group')

            # Check if mapping exists
            mapping = SplitwiseGroupMapping.objects.filter(
                integration=self.integration,
                splitwise_group_id=group_id
            ).first()

            if mapping:
                # Update existing group
                mapping.splitwise_group_name = group_name
                mapping.last_splitwise_updated_at = timezone.now()
                mapping.save()
                groups_updated += 1
            else:
                # Create new local group
                local_group = self._create_local_group_from_splitwise(sw_group)

                # Create mapping
                SplitwiseGroupMapping.objects.create(
                    integration=self.integration,
                    local_group=local_group,
                    splitwise_group_id=group_id,
                    splitwise_group_name=group_name,
                    last_splitwise_updated_at=timezone.now()
                )
                groups_created += 1

        return groups_created, groups_updated

    def _import_expenses(self) -> Tuple[int, int]:
        """
        Import expenses from Splitwise for all mapped groups

        Returns:
            Tuple of (expenses_created, expenses_updated)
        """
        expenses_created = 0
        expenses_updated = 0

        mappings = SplitwiseGroupMapping.objects.filter(
            integration=self.integration,
            sync_enabled=True
        )

        for mapping in mappings:
            # Get expenses for this group
            sw_expenses = self.api.get_expenses(group_id=mapping.splitwise_group_id)

            for sw_expense in sw_expenses:
                expense_id = sw_expense.get('id')

                # Check if mapping exists
                expense_mapping = SplitwiseExpenseMapping.objects.filter(
                    group_mapping=mapping,
                    splitwise_expense_id=expense_id
                ).first()

                if expense_mapping:
                    # Update existing expense
                    self._update_local_expense_from_splitwise(
                        expense_mapping.local_expense,
                        sw_expense
                    )
                    expense_mapping.last_splitwise_updated_at = timezone.now()
                    expense_mapping.last_synced_at = timezone.now()
                    expense_mapping.save()
                    expenses_updated += 1
                else:
                    # Create new expense
                    local_expense = self._create_local_expense_from_splitwise(
                        mapping.local_group,
                        sw_expense
                    )

                    if local_expense:
                        SplitwiseExpenseMapping.objects.create(
                            group_mapping=mapping,
                            local_expense=local_expense,
                            splitwise_expense_id=expense_id,
                            last_splitwise_updated_at=timezone.now(),
                            last_synced_at=timezone.now()
                        )
                        expenses_created += 1

        return expenses_created, expenses_updated

    def _pull_updates_from_splitwise(self) -> int:
        """
        Pull recent updates from Splitwise (for incremental sync)

        Returns:
            Number of expenses updated
        """
        expenses_updated = 0

        # Get timestamp of last successful sync
        if self.integration.last_successful_sync_at:
            updated_after = self.integration.last_successful_sync_at.isoformat()
        else:
            # First sync - get expenses from last 30 days
            updated_after = (timezone.now() - timedelta(days=30)).isoformat()

        # Get updated expenses
        sw_expenses = self.api.get_expenses(updated_after=updated_after)

        for sw_expense in sw_expenses:
            expense_id = sw_expense.get('id')
            group_id = sw_expense.get('group_id')

            # Find group mapping
            group_mapping = SplitwiseGroupMapping.objects.filter(
                integration=self.integration,
                splitwise_group_id=group_id,
                sync_enabled=True
            ).first()

            if not group_mapping:
                continue

            # Check sync direction
            if group_mapping.sync_direction == 'to_splitwise':
                continue  # Skip pull for this group

            # Find expense mapping
            expense_mapping = SplitwiseExpenseMapping.objects.filter(
                group_mapping=group_mapping,
                splitwise_expense_id=expense_id
            ).first()

            if expense_mapping:
                # Update existing expense
                self._update_local_expense_from_splitwise(
                    expense_mapping.local_expense,
                    sw_expense
                )
                expense_mapping.last_splitwise_updated_at = timezone.now()
                expense_mapping.last_synced_at = timezone.now()
                expense_mapping.save()
                expenses_updated += 1

        return expenses_updated

    # =====================
    # Push Methods (Push to Splitwise)
    # =====================

    def _push_updates_to_splitwise(self) -> int:
        """
        Push local changes to Splitwise (for incremental sync)

        Returns:
            Number of expenses pushed
        """
        expenses_pushed = 0

        # Get expense mappings that need sync
        mappings = SplitwiseExpenseMapping.objects.filter(
            group_mapping__integration=self.integration,
            group_mapping__sync_enabled=True,
            sync_status='pending'
        ).select_related('local_expense', 'group_mapping')

        for mapping in mappings:
            if mapping.group_mapping.sync_direction == 'from_splitwise':
                continue  # Skip push for this group

            try:
                # Push update to Splitwise
                self._push_expense_to_splitwise(mapping)
                mapping.sync_status = 'synced'
                mapping.last_synced_at = timezone.now()
                mapping.last_sync_error = None
                mapping.save()
                expenses_pushed += 1

            except Exception as e:
                logger.error(f"Failed to push expense {mapping.local_expense.id}: {str(e)}")
                mapping.sync_status = 'error'
                mapping.last_sync_error = str(e)
                mapping.save()

        return expenses_pushed

    def _push_expense_to_splitwise(self, mapping: SplitwiseExpenseMapping):
        """
        Push a local expense to Splitwise

        Args:
            mapping: SplitwiseExpenseMapping instance
        """
        expense = mapping.local_expense

        # Prepare expense data
        users = self._prepare_expense_users(expense)

        expense_data = {
            'cost': str(expense.total_amount),
            'description': expense.title,
            'date': expense.date.isoformat(),
            'currency_code': expense.currency,
            'users': users
        }

        if expense.description:
            expense_data['details'] = expense.description

        # Update expense on Splitwise
        self.api.update_expense(mapping.splitwise_expense_id, **expense_data)

    # =====================
    # Helper Methods
    # =====================

    def _create_local_group_from_splitwise(self, sw_group: Dict) -> ExpenseGroup:
        """
        Create local ExpenseGroup from Splitwise group data

        Args:
            sw_group: Splitwise group data

        Returns:
            Created ExpenseGroup instance
        """
        group = ExpenseGroup.objects.create(
            owner=self.user,
            name=sw_group.get('name', 'Unnamed Group'),
            description=f"Imported from Splitwise",
            group_type='multi-person',
            is_active=True
        )

        # Add members if available
        members = sw_group.get('members', [])
        for member in members:
            # Skip the owner
            if member.get('id') == self.integration.splitwise_user_id:
                continue

            # Try to find or create user by email
            email = member.get('email')
            if email:
                # For now, we'll just store the member info
                # In a real implementation, you might want to create Contact records
                pass

        return group

    def _create_local_expense_from_splitwise(
        self,
        group: ExpenseGroup,
        sw_expense: Dict
    ) -> Optional[GroupExpense]:
        """
        Create local GroupExpense from Splitwise expense data

        Args:
            group: Local ExpenseGroup
            sw_expense: Splitwise expense data

        Returns:
            Created GroupExpense instance or None if creation fails
        """
        try:
            # Parse expense date
            date_str = sw_expense.get('date')
            expense_date = datetime.fromisoformat(date_str).date() if date_str else timezone.now().date()

            # Determine who paid
            paid_by = self.user  # Default to current user
            users_data = sw_expense.get('users', [])
            for user_data in users_data:
                paid_share = Decimal(str(user_data.get('paid_share', '0')))
                if paid_share > 0 and user_data.get('id') == self.integration.splitwise_user_id:
                    paid_by = self.user
                    break

            expense = GroupExpense.objects.create(
                group=group,
                created_by=self.user,
                paid_by=paid_by,
                title=sw_expense.get('description', 'Expense'),
                description=sw_expense.get('details', ''),
                total_amount=Decimal(str(sw_expense.get('cost', '0'))),
                currency=sw_expense.get('currency_code', 'USD'),
                split_method='equal',  # Default, can be adjusted
                date=expense_date,
                status='active'
            )

            # Create shares
            for user_data in users_data:
                owed_share = Decimal(str(user_data.get('owed_share', '0')))
                paid_share = Decimal(str(user_data.get('paid_share', '0')))

                if owed_share > 0:
                    # For now, only create shares for the current user
                    # In a full implementation, you'd need to map Splitwise users to local users
                    if user_data.get('id') == self.integration.splitwise_user_id:
                        GroupExpenseShare.objects.create(
                            group_expense=expense,
                            user=self.user,
                            share_amount=owed_share,
                            paid_amount=paid_share if paid_share > 0 else Decimal('0')
                        )

            return expense

        except Exception as e:
            logger.error(f"Failed to create expense from Splitwise: {str(e)}", exc_info=True)
            return None

    def _update_local_expense_from_splitwise(
        self,
        expense: GroupExpense,
        sw_expense: Dict
    ):
        """
        Update local expense with Splitwise data

        Args:
            expense: Local GroupExpense instance
            sw_expense: Splitwise expense data
        """
        # Update basic fields
        expense.title = sw_expense.get('description', expense.title)
        expense.description = sw_expense.get('details', expense.description)
        expense.total_amount = Decimal(str(sw_expense.get('cost', expense.total_amount)))
        expense.currency = sw_expense.get('currency_code', expense.currency)

        # Update date
        date_str = sw_expense.get('date')
        if date_str:
            expense.date = datetime.fromisoformat(date_str).date()

        expense.save()

    def _prepare_expense_users(self, expense: GroupExpense) -> List[Dict]:
        """
        Prepare user shares data for Splitwise API

        Args:
            expense: Local GroupExpense instance

        Returns:
            List of user share dicts for Splitwise API
        """
        users = []

        # Add the user who paid
        users.append({
            'user_id': self.integration.splitwise_user_id,
            'paid_share': str(expense.total_amount),
            'owed_share': '0.00'
        })

        # Add shares
        for share in expense.shares.all():
            # Only add if this is the current user
            # In a full implementation, you'd need to map local users to Splitwise users
            if share.user == self.user:
                users[0]['owed_share'] = str(share.share_amount)

        return users

    # =====================
    # Utility Methods
    # =====================

    def create_splitwise_group_from_local(self, group: ExpenseGroup) -> Optional[SplitwiseGroupMapping]:
        """
        Create a Splitwise group from a local ExpenseGroup

        Args:
            group: Local ExpenseGroup instance

        Returns:
            Created SplitwiseGroupMapping or None if creation fails
        """
        try:
            # Create group on Splitwise
            sw_group = self.api.create_group(
                name=group.name,
                members=[]  # Add members if needed
            )

            # Create mapping
            mapping = SplitwiseGroupMapping.objects.create(
                integration=self.integration,
                local_group=group,
                splitwise_group_id=sw_group.get('id'),
                splitwise_group_name=sw_group.get('name'),
                last_splitwise_updated_at=timezone.now()
            )

            logger.info(f"Created Splitwise group {sw_group.get('id')} for local group {group.id}")
            return mapping

        except Exception as e:
            logger.error(f"Failed to create Splitwise group: {str(e)}", exc_info=True)
            return None

    def create_splitwise_expense_from_local(
        self,
        expense: GroupExpense,
        group_mapping: SplitwiseGroupMapping
    ) -> Optional[SplitwiseExpenseMapping]:
        """
        Create a Splitwise expense from a local GroupExpense

        Args:
            expense: Local GroupExpense instance
            group_mapping: SplitwiseGroupMapping for the group

        Returns:
            Created SplitwiseExpenseMapping or None if creation fails
        """
        try:
            # Prepare expense data
            users = self._prepare_expense_users(expense)

            # Create expense on Splitwise
            sw_expense = self.api.create_expense(
                cost=str(expense.total_amount),
                description=expense.title,
                group_id=group_mapping.splitwise_group_id,
                date=expense.date.isoformat(),
                currency_code=expense.currency,
                users=users,
                details=expense.description
            )

            # Create mapping
            mapping = SplitwiseExpenseMapping.objects.create(
                group_mapping=group_mapping,
                local_expense=expense,
                splitwise_expense_id=sw_expense.get('id'),
                last_splitwise_updated_at=timezone.now(),
                last_synced_at=timezone.now()
            )

            logger.info(f"Created Splitwise expense {sw_expense.get('id')} for local expense {expense.id}")
            return mapping

        except Exception as e:
            logger.error(f"Failed to create Splitwise expense: {str(e)}", exc_info=True)
            return None
