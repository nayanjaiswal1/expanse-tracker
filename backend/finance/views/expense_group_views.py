"""
Expense group-related views for the finance app.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from ..filters import ExpenseGroupFilter

from ..models import ExpenseGroup, ExpenseGroupMembership
from ..serializers import ExpenseGroupSerializer, ExpenseGroupMembershipSerializer
from ..services.expense_group_service import ExpenseGroupService

User = get_user_model()


class ExpenseGroupViewSet(viewsets.ModelViewSet):
    """ViewSet for expense group management"""

    queryset = ExpenseGroup.objects.all()
    serializer_class = ExpenseGroupSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = ExpenseGroupFilter
    ordering_fields = ["name", "created_at", "status"]
    ordering = ["-created_at"]

    def get_queryset(self):
        """
        Ensure a user can only see expense groups they are a member of.
        """
        return ExpenseGroup.objects.filter(
            memberships__user=self.request.user
        ).distinct()

    def perform_create(self, serializer):
        """
        Create a new expense group and add the creator as an admin member.
        """
        expense_group = ExpenseGroupService.create_expense_group(
            name=serializer.validated_data["name"],
            owner=self.request.user,
            description=serializer.validated_data.get("description"),
            group_type=serializer.validated_data.get("group_type", "multi-person"),
        )
        serializer.instance = expense_group

    @action(detail=True, methods=["get"])
    def members(self, request, pk=None):
        """
        List all members of a specific expense group.
        """
        expense_group = self.get_object()
        memberships = expense_group.memberships.all()
        serializer = ExpenseGroupMembershipSerializer(memberships, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def add_member(self, request, pk=None):
        """
        Add a member to an expense group.
        Accepts either 'user_id' or 'email' and optionally 'role' in request data.
        """
        expense_group = self.get_object()
        user_id = request.data.get("user_id")
        email = request.data.get("email")
        role = request.data.get("role", "member")

        if not user_id and not email:
            return Response(
                {"detail": "Either user_id or email is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            if user_id:
                user = User.objects.get(id=user_id)
            else:
                user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # Check if the requesting user has permission to add members (e.g., is an admin)
        # For now, any group member can add, but this can be restricted later.
        if not expense_group.memberships.filter(user=request.user).exists():
            return Response(
                {"detail": "You are not a member of this group."},
                status=status.HTTP_403_FORBIDDEN,
            )

        membership = ExpenseGroupService.add_member_to_group(expense_group, user, role)
        serializer = ExpenseGroupMembershipSerializer(membership)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"])
    def remove_member(self, request, pk=None, member_pk=None):
        """
        Remove a member from an expense group.
        The member_pk is the user_id of the member to be removed.
        """
        expense_group = self.get_object()
        member_id = request.data.get("user_id") or member_pk

        if not member_id:
            return Response(
                {"detail": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            member_to_remove = User.objects.get(id=member_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "Member not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # Ensure the requesting user has permission to remove members
        # For now, only the owner can remove members
        if expense_group.owner != request.user:
            return Response(
                {"detail": "Only the group owner can remove members."},
                status=status.HTTP_403_FORBIDDEN,
            )

        membership = get_object_or_404(
            ExpenseGroupMembership, group=expense_group, user=member_to_remove
        )
        membership.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"])
    def balances(self, request, pk=None):
        """
        Calculate and return balances for a specific expense group.
        """
        expense_group = self.get_object()
        balances = ExpenseGroupService.calculate_balances(expense_group)
        return Response(balances)
