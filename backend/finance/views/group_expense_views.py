"""
Group expense-related views for the finance app.
"""

from decimal import Decimal
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from django.shortcuts import get_object_or_404
from django.utils import timezone
from ..models import GroupExpense, ExpenseGroup
from ..serializers import GroupExpenseSerializer
from ..services.expense_group_service import ExpenseGroupService


class GroupExpenseViewSet(viewsets.ModelViewSet):
    """ViewSet for group expense management"""

    serializer_class = GroupExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        expense_group_pk = self.kwargs.get("expense_group_pk")
        expense_group = get_object_or_404(ExpenseGroup, pk=expense_group_pk)

        # Ensure the requesting user is a member of this expense group
        if not expense_group.memberships.filter(user=self.request.user).exists():
            return Response(
                {"detail": "You are not a member of this group."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Extract shares_data from request, if provided
        shares_data = self.request.data.get("shares_data", [])

        group_expense = ExpenseGroupService.create_group_expense(
            expense_group=expense_group,
            created_by=self.request.user,
            title=serializer.validated_data["title"],
            total_amount=serializer.validated_data["total_amount"],
            date=serializer.validated_data["date"],
            split_method=serializer.validated_data["split_method"],
            description=serializer.validated_data.get("description"),
            currency=serializer.validated_data.get("currency", "USD"),
            shares_data=shares_data,
        )
        serializer.instance = group_expense

    def get_queryset(self):
        """
        Ensure a user can only see group expenses within an expense group they are a member of.
        """
        expense_group_pk = self.kwargs.get("expense_group_pk")
        if not expense_group_pk:
            return GroupExpense.objects.none()

        expense_group = get_object_or_404(ExpenseGroup, pk=expense_group_pk)

        # Check if the requesting user is a member of this expense group
        if not expense_group.memberships.filter(user=self.request.user).exists():
            return GroupExpense.objects.none()

        return GroupExpense.objects.filter(group=expense_group)

    @action(detail=True, methods=["post"])
    def settle(self, request, pk=None):
        """Mark group expense as settled"""
        group_expense = self.get_object()

        group_expense.status = "settled"
        group_expense.save()

        return Response(
            {
                "message": "Group expense marked as settled",
                "status": group_expense.status,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"])
    def settlement_status(self, request, pk=None):
        """Get settlement status for all shares"""
        group_expense = self.get_object()

        shares_data = []
        for share in group_expense.shares.all():
            shares_data.append(
                {
                    "user_id": share.user.id,
                    "username": share.user.username,
                    "share_amount": share.share_amount,
                    "paid_amount": share.paid_amount,
                    "remaining_amount": share.remaining_amount,
                    "is_settled": share.is_settled,
                    "payment_date": share.payment_date,
                }
            )

        total_settled = sum(
            1 for share in group_expense.shares.all() if share.is_settled
        )
        total_shares = group_expense.shares.count()

        return Response(
            {
                "group_expense_id": group_expense.id,
                "title": group_expense.title,
                "total_amount": group_expense.total_amount,
                "shares": shares_data,
                "settlement_summary": {
                    "total_shares": total_shares,
                    "settled_shares": total_settled,
                    "pending_shares": total_shares - total_settled,
                    "settlement_percentage": (total_settled / total_shares * 100)
                    if total_shares > 0
                    else 0,
                },
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Get comprehensive group expenses summary"""
        from django.db.models import Sum, Count, Q
        from ..models import ExpenseGroupMembership, ExpenseGroupBalance

        # Get user's groups
        user_memberships = ExpenseGroupMembership.objects.filter(
            user=request.user
        ).select_related('group')

        # Get all expenses for user's groups
        group_ids = user_memberships.values_list('group_id', flat=True)
        group_expenses = self.get_queryset().filter(group_id__in=group_ids)

        # Calculate balances
        balances = ExpenseGroupBalance.objects.filter(
            group_id__in=group_ids
        )

        # Amount user owes (negative balances)
        user_owes = balances.filter(
            user=request.user,
            balance__lt=0
        ).aggregate(total=Sum('balance'))['total'] or Decimal('0')

        # Amount owed to user (positive balances)
        owed_to_user = balances.filter(
            user=request.user,
            balance__gt=0
        ).aggregate(total=Sum('balance'))['total'] or Decimal('0')

        summary = {
            # Group stats
            "total_groups": user_memberships.count(),
            "active_groups": user_memberships.filter(group__is_active=True).count(),

            # Expense stats
            "total_expenses": group_expenses.count(),
            "active_expenses": group_expenses.filter(status="active").count(),
            "settled_expenses": group_expenses.filter(status="settled").count(),
            "cancelled_expenses": group_expenses.filter(status="cancelled").count(),

            # Amount stats
            "total_amount": float(sum(expense.total_amount for expense in group_expenses)),
            "pending_amount": float(sum(
                expense.total_amount
                for expense in group_expenses.filter(status="active")
            )),

            # Balance stats
            "you_owe": float(abs(user_owes)),  # Make positive for display
            "owed_to_you": float(owed_to_user),
            "net_balance": float(owed_to_user + user_owes),  # user_owes is negative

            # Recent activity
            "recent_expenses_count": group_expenses.filter(
                created_at__gte=timezone.now() - timezone.timedelta(days=7)
            ).count(),
        }

        return Response(summary, status=status.HTTP_200_OK)
