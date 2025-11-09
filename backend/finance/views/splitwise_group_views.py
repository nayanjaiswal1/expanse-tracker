"""
Splitwise-like Group Expense API Views
Full Splitwise functionality: groups, members, shared expenses, balances
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db import models

from ..models import ExpenseGroup, ExpenseGroupMembership
from ..serializers import ExpenseGroupSerializer
from ..services.splitwise_group_service import SplitwiseGroupService

User = get_user_model()


class SplitwiseGroupViewSet(viewsets.ViewSet):
    """API for Splitwise-like group expense management"""
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """Get all groups where user is owner or member"""
        # Groups where user is owner
        owned_groups = ExpenseGroup.objects.filter(
            owner=request.user,
            group_type='multi-person',
            is_active=True
        )

        # Groups where user is a member
        member_groups = ExpenseGroup.objects.filter(
            memberships__user=request.user,
            memberships__is_active=True,
            group_type='multi-person',
            is_active=True
        )

        # Combine and remove duplicates
        all_groups = (owned_groups | member_groups).distinct()

        data = []
        for group in all_groups:
            # Get member count and total contributions
            member_count = group.memberships.filter(is_active=True).count() + 1  # +1 for owner
            total_contributions = group.get_total_contributions()
            budget_status = group.get_budget_status()

            # Get user's contribution to this group (total paid_amount for user's shares)
            from ..models import GroupExpenseShare
            user_contribution = GroupExpenseShare.objects.filter(
                group_expense__group=group,
                user=request.user
            ).aggregate(total=models.Sum('paid_amount'))['total'] or 0

            data.append({
                'id': group.id,
                'name': group.name,
                'description': group.description,
                'budget_limit': float(group.budget_limit) if group.budget_limit else None,
                'budget_warning_threshold': float(group.budget_warning_threshold),
                'budget_per_person_limit': float(group.budget_per_person_limit) if group.budget_per_person_limit else None,
                'budget_status': {
                    'has_budget': budget_status['has_budget'],
                    'total_spent': float(budget_status['total_spent']),
                    'budget_limit': float(budget_status['budget_limit']) if budget_status['budget_limit'] else None,
                    'remaining': float(budget_status['remaining']) if budget_status['remaining'] is not None else None,
                    'percentage_used': float(budget_status['percentage_used']) if budget_status['percentage_used'] is not None else None,
                    'is_over_budget': budget_status['is_over_budget'],
                    'is_warning': budget_status['is_warning']
                },
                'member_count': member_count,
                'total_contributed': float(total_contributions),
                'your_contribution': float(user_contribution),
                'is_owner': group.owner == request.user,
                'created_at': group.created_at,
                'members': [
                    {
                        'id': member.user.id,
                        'name': member.user.get_full_name() or member.user.username,
                        'username': member.user.username,
                        'role': member.role,
                        'joined_at': member.joined_at
                    } for member in group.memberships.filter(is_active=True)
                ]
            })

        return Response(data)

    def create(self, request):
        """Create a new expense group"""
        data = request.data

        try:
            group = SplitwiseGroupService.create_group(
                owner=request.user,
                name=data['name'],
                description=data.get('description', ''),
                budget_limit=data.get('budget_limit'),
                budget_warning_threshold=data.get('budget_warning_threshold'),
                budget_per_person_limit=data.get('budget_per_person_limit')
            )

            budget_status = group.get_budget_status()

            return Response({
                'id': group.id,
                'name': group.name,
                'description': group.description,
                'budget_limit': float(group.budget_limit) if group.budget_limit else None,
                'budget_warning_threshold': float(group.budget_warning_threshold),
                'budget_per_person_limit': float(group.budget_per_person_limit) if group.budget_per_person_limit else None,
                'budget_status': {
                    'has_budget': budget_status['has_budget'],
                    'total_spent': float(budget_status['total_spent']),
                    'budget_limit': float(budget_status['budget_limit']) if budget_status['budget_limit'] else None,
                    'remaining': float(budget_status['remaining']) if budget_status['remaining'] is not None else None,
                    'percentage_used': float(budget_status['percentage_used']) if budget_status['percentage_used'] is not None else None,
                    'is_over_budget': budget_status['is_over_budget'],
                    'is_warning': budget_status['is_warning']
                },
                'member_count': 1,  # Just the owner initially
                'total_contributed': 0,
                'your_contribution': 0,
                'is_owner': True,
                'created_at': group.created_at.isoformat(),
                'members': []
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    def retrieve(self, request, pk=None):
        """Get a specific group with details"""
        group = get_object_or_404(ExpenseGroup, id=pk)

        # Check if user is owner or member
        is_member = (group.owner == request.user or
                    group.memberships.filter(user=request.user, is_active=True).exists())

        if not is_member:
            return Response({
                'error': 'You are not a member of this group'
            }, status=status.HTTP_403_FORBIDDEN)

        # Get member count and contributions
        member_count = group.memberships.filter(is_active=True).count() + 1  # +1 for owner
        total_contributions = group.get_total_contributions()
        budget_status = group.get_budget_status()

        # Get user's contribution (total paid_amount for user's shares)
        from ..models import GroupExpenseShare
        user_contribution = GroupExpenseShare.objects.filter(
            group_expense__group=group,
            user=request.user
        ).aggregate(total=models.Sum('paid_amount'))['total'] or 0

        return Response({
            'id': group.id,
            'name': group.name,
            'description': group.description,
            'budget_limit': float(group.budget_limit) if group.budget_limit else None,
            'budget_warning_threshold': float(group.budget_warning_threshold),
            'budget_per_person_limit': float(group.budget_per_person_limit) if group.budget_per_person_limit else None,
            'budget_status': {
                'has_budget': budget_status['has_budget'],
                'total_spent': float(budget_status['total_spent']),
                'budget_limit': float(budget_status['budget_limit']) if budget_status['budget_limit'] else None,
                'remaining': float(budget_status['remaining']) if budget_status['remaining'] is not None else None,
                'percentage_used': float(budget_status['percentage_used']) if budget_status['percentage_used'] is not None else None,
                'is_over_budget': budget_status['is_over_budget'],
                'is_warning': budget_status['is_warning']
            },
            'member_count': member_count,
            'total_contributed': float(total_contributions),
            'your_contribution': float(user_contribution),
            'is_owner': group.owner == request.user,
            'created_at': group.created_at.isoformat(),
            'members': [
                {
                    'id': member.user.id,
                    'name': member.user.get_full_name() or member.user.username,
                    'username': member.user.username,
                    'role': member.role,
                    'joined_at': member.joined_at.isoformat()
                } for member in group.memberships.filter(is_active=True)
            ] + [{
                'id': group.owner.id,
                'name': group.owner.get_full_name() or group.owner.username,
                'username': group.owner.username,
                'role': 'owner',
                'joined_at': group.created_at.isoformat()
            }]
        })

    def update(self, request, pk=None):
        """Update a group (only owner can update)"""
        group = get_object_or_404(ExpenseGroup, id=pk)

        # Check if user is owner
        if group.owner != request.user:
            return Response({
                'error': 'Only the group owner can update the group'
            }, status=status.HTTP_403_FORBIDDEN)

        data = request.data

        # Update allowed fields
        if 'name' in data:
            group.name = data['name']
        if 'description' in data:
            group.description = data['description']
        if 'budget_limit' in data:
            group.budget_limit = data['budget_limit']
        if 'budget_warning_threshold' in data:
            group.budget_warning_threshold = data['budget_warning_threshold']
        if 'budget_per_person_limit' in data:
            group.budget_per_person_limit = data['budget_per_person_limit']

        group.save()

        # Return updated group
        member_count = group.memberships.filter(is_active=True).count() + 1
        total_contributions = group.get_total_contributions()
        budget_status = group.get_budget_status()

        return Response({
            'id': group.id,
            'name': group.name,
            'description': group.description,
            'budget_limit': float(group.budget_limit) if group.budget_limit else None,
            'budget_warning_threshold': float(group.budget_warning_threshold),
            'budget_per_person_limit': float(group.budget_per_person_limit) if group.budget_per_person_limit else None,
            'budget_status': {
                'has_budget': budget_status['has_budget'],
                'total_spent': float(budget_status['total_spent']),
                'budget_limit': float(budget_status['budget_limit']) if budget_status['budget_limit'] else None,
                'remaining': float(budget_status['remaining']) if budget_status['remaining'] is not None else None,
                'percentage_used': float(budget_status['percentage_used']) if budget_status['percentage_used'] is not None else None,
                'is_over_budget': budget_status['is_over_budget'],
                'is_warning': budget_status['is_warning']
            },
            'member_count': member_count,
            'total_contributed': float(total_contributions),
            'your_contribution': float(GroupExpenseShare.objects.filter(
                group_expense__group=group,
                user=request.user
            ).aggregate(total=models.Sum('paid_amount'))['total'] or 0),
            'is_owner': True,
            'created_at': group.created_at.isoformat(),
            'members': [
                {
                    'id': member.user.id,
                    'name': member.user.get_full_name() or member.user.username,
                    'username': member.user.username,
                    'role': member.role,
                    'joined_at': member.joined_at.isoformat()
                } for member in group.memberships.filter(is_active=True)
            ]
        })

    def partial_update(self, request, pk=None):
        """Partial update a group (only owner can update) - same as update for PATCH requests"""
        return self.update(request, pk)

    def destroy(self, request, pk=None):
        """Delete a group (only owner can delete)"""
        group = get_object_or_404(ExpenseGroup, id=pk)

        # Check if user is owner
        if group.owner != request.user:
            return Response({
                'error': 'Only the group owner can delete the group'
            }, status=status.HTTP_403_FORBIDDEN)

        # Check if group has any expenses
        from ..models import Transaction
        has_expenses = Transaction.objects.filter(
            transaction_category='group_expense',
            group_state_snapshot__group_id=group.id
        ).exists()

        if has_expenses:
            return Response({
                'error': 'Cannot delete group with existing expenses. Archive it instead.'
            }, status=status.HTTP_400_BAD_REQUEST)

        group.delete()

        return Response({
            'message': 'Group deleted successfully'
        }, status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        """Add a member to the group"""
        group = get_object_or_404(ExpenseGroup, id=pk)
        data = request.data

        try:
            user_to_add = get_object_or_404(User, id=data['user_id'])

            membership = SplitwiseGroupService.add_member(
                group=group,
                user=user_to_add,
                added_by=request.user
            )

            return Response({
                'message': f'{user_to_add.username} added to group successfully',
                'member': {
                    'id': user_to_add.id,
                    'name': user_to_add.get_full_name() or user_to_add.username,
                    'username': user_to_add.username,
                    'role': membership.role,
                    'joined_at': membership.joined_at
                }
            })

        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def add_expense(self, request, pk=None):
        """Add a shared expense to the group (like Splitwise)"""
        group = get_object_or_404(ExpenseGroup, id=pk)
        data = request.data

        try:
            # Get the user who paid for the expense
            paid_by_user = get_object_or_404(User, id=data['paid_by_user_id'])

            expense = SplitwiseGroupService.create_group_expense(
                group=group,
                created_by=request.user,
                title=data['title'],
                total_amount=data['total_amount'],
                split_method=data['split_method'],
                paid_by_user=paid_by_user,
                date=data.get('date'),
                description=data.get('description'),
                shares_data=data.get('shares_data', [])
            )

            return Response({
                'id': expense.id,
                'title': expense.description,
                'amount': float(expense.amount),
                'date': expense.date,
                'split_method': expense.participants_snapshot['split_method'],
                'paid_by': expense.participants_snapshot['paid_by'],
                'splits': expense.participants_snapshot['splits'],
                'created_at': expense.created_at
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def balances(self, request, pk=None):
        """Get current balances for all group members"""
        group = get_object_or_404(ExpenseGroup, id=pk)

        try:
            balances = SplitwiseGroupService.get_group_balances(group)

            data = []
            for balance_data in balances:
                user = balance_data['user']
                data.append({
                    'user': {
                        'id': user.id,
                        'name': user.get_full_name() or user.username,
                        'username': user.username
                    },
                    'paid': float(balance_data['paid']),
                    'owes': float(balance_data['owes']),
                    'balance': float(balance_data['balance']),
                    'status': 'owes' if balance_data['balance'] < 0 else 'owed' if balance_data['balance'] > 0 else 'settled'
                })

            return Response(data)

        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def expenses(self, request, pk=None):
        """Get all expenses for the group"""
        group = get_object_or_404(ExpenseGroup, id=pk)

        try:
            expenses = SplitwiseGroupService.get_group_expenses(group)

            data = []
            for expense in expenses:
                snapshot = expense.participants_snapshot
                data.append({
                    'id': expense.id,
                    'title': expense.description,
                    'amount': float(expense.amount),
                    'date': expense.date,
                    'split_method': snapshot.get('split_method'),
                    'paid_by': snapshot.get('paid_by'),
                    'splits': snapshot.get('splits', []),
                    'created_by': {
                        'id': expense.user.id,
                        'username': expense.user.username,
                        'name': expense.user.get_full_name() or expense.user.username
                    },
                    'status': expense.status,
                    'created_at': expense.created_at
                })

            return Response(data)

        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def settle_balance(self, request, pk=None):
        """Settle balance between two members (like "settle up" in Splitwise)"""
        group = get_object_or_404(ExpenseGroup, id=pk)
        data = request.data

        try:
            to_user = get_object_or_404(User, id=data['to_user_id'])

            settlement = SplitwiseGroupService.settle_balance(
                group=group,
                from_user=request.user,
                to_user=to_user,
                amount=data['amount']
            )

            return Response({
                'message': 'Balance settled successfully',
                'settlement': {
                    'id': settlement.id,
                    'amount': float(settlement.amount),
                    'from_user': request.user.username,
                    'to_user': to_user.username,
                    'date': settlement.date
                }
            })

        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def remove_member(self, request, pk=None):
        """Remove a member from the group"""
        group = get_object_or_404(ExpenseGroup, id=pk)
        data = request.data

        try:
            user_to_remove = get_object_or_404(User, id=data['user_id'])

            SplitwiseGroupService.remove_member(
                group=group,
                user_to_remove=user_to_remove,
                removed_by=request.user
            )

            return Response({
                'message': f'{user_to_remove.username} removed from group successfully'
            })

        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def search_users(self, request):
        """Search for users to add to groups"""
        query = request.query_params.get('q', '')

        if len(query) < 2:
            return Response([])

        users = User.objects.filter(
            username__icontains=query
        ).exclude(id=request.user.id)[:10]

        data = []
        for user in users:
            data.append({
                'id': user.id,
                'name': user.get_full_name() or user.username,
                'username': user.username,
                'email': user.email
            })

        return Response(data)