"""
Balance-related views for the finance app.
"""

from rest_framework import views, permissions
from rest_framework.response import Response

from ..services.expense_group_service import ExpenseGroupService


class UserBalanceView(views.APIView):
    """View for getting user's overall balance across all groups"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        Get current user's overall balance summary across all groups.
        """
        balance_data = ExpenseGroupService.calculate_overall_balances_for_user(
            request.user
        )
        return Response(balance_data)
