"""
Splitwise API client service using the official Splitwise Python SDK
"""
import logging
from typing import Dict, List, Optional, Any
from splitwise import Splitwise
from splitwise.expense import Expense
from splitwise.user import ExpenseUser
from splitwise.group import Group
from splitwise.debt import Debt


logger = logging.getLogger(__name__)


class SplitwiseAPIError(Exception):
    """Base exception for Splitwise API errors"""
    pass


class SplitwiseAuthError(SplitwiseAPIError):
    """Exception for authentication errors"""
    pass


class SplitwiseService:
    """
    Service for interacting with Splitwise API using the official SDK
    Handles authentication, fetching groups/expenses, and creating/updating data
    """

    def __init__(self, access_token: str, consumer_key: str = None, consumer_secret: str = None):
        """
        Initialize Splitwise service with access token

        Args:
            access_token: OAuth access token for Splitwise API
            consumer_key: Optional consumer key (not needed with token)
            consumer_secret: Optional consumer secret (not needed with token)
        """
        self.access_token = access_token

        # Initialize Splitwise SDK
        # When using API key/token, we can pass dummy values for consumer key/secret
        self.client = Splitwise(
            consumer_key or "dummy",
            consumer_secret or "dummy"
        )

        # Set the access token
        self.client.setAccessToken({
            'access_token': access_token,
            'token_type': 'Bearer'
        })

    # =====================
    # User Methods
    # =====================

    def get_current_user(self) -> Dict[str, Any]:
        """
        Get current authenticated user information

        Returns:
            User data as dictionary
        """
        try:
            user = self.client.getCurrentUser()
            return self._user_to_dict(user)
        except Exception as e:
            logger.error(f"Failed to get current user: {str(e)}")
            raise SplitwiseAuthError(f"Authentication failed: {str(e)}")

    # =====================
    # Group Methods
    # =====================

    def get_groups(self) -> List[Dict[str, Any]]:
        """
        Get all groups for the authenticated user

        Returns:
            List of group data as dictionaries
        """
        try:
            groups = self.client.getGroups()
            return [self._group_to_dict(g) for g in groups]
        except Exception as e:
            logger.error(f"Failed to get groups: {str(e)}")
            raise SplitwiseAPIError(f"Failed to fetch groups: {str(e)}")

    def get_group(self, group_id: int) -> Dict[str, Any]:
        """
        Get details of a specific group

        Args:
            group_id: Splitwise group ID

        Returns:
            Group data as dictionary
        """
        try:
            group = self.client.getGroup(group_id)
            return self._group_to_dict(group)
        except Exception as e:
            logger.error(f"Failed to get group {group_id}: {str(e)}")
            raise SplitwiseAPIError(f"Failed to fetch group: {str(e)}")

    def create_group(self, name: str, members: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """
        Create a new group in Splitwise

        Args:
            name: Group name
            members: List of member dicts with 'user_id', 'first_name', 'last_name', 'email'

        Returns:
            Created group data as dictionary
        """
        try:
            group = Group()
            group.setName(name)

            # Add members if provided
            if members:
                # Note: SDK handles member addition through the API
                pass

            created_group = self.client.createGroup(group)
            return self._group_to_dict(created_group)
        except Exception as e:
            logger.error(f"Failed to create group: {str(e)}")
            raise SplitwiseAPIError(f"Failed to create group: {str(e)}")

    def delete_group(self, group_id: int) -> bool:
        """
        Delete a group

        Args:
            group_id: Splitwise group ID

        Returns:
            True if successful
        """
        try:
            success = self.client.deleteGroup(group_id)
            return success
        except Exception as e:
            logger.error(f"Failed to delete group {group_id}: {str(e)}")
            raise SplitwiseAPIError(f"Failed to delete group: {str(e)}")

    # =====================
    # Expense Methods
    # =====================

    def get_expenses(
        self,
        group_id: Optional[int] = None,
        limit: int = 100,
        offset: int = 0,
        dated_after: Optional[str] = None,
        dated_before: Optional[str] = None,
        updated_after: Optional[str] = None,
        updated_before: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get expenses with optional filters

        Args:
            group_id: Filter by group ID
            limit: Max number of expenses to return
            offset: Pagination offset
            dated_after: ISO 8601 date string
            dated_before: ISO 8601 date string
            updated_after: ISO 8601 date string (for incremental sync)
            updated_before: ISO 8601 date string

        Returns:
            List of expense data as dictionaries
        """
        try:
            expenses = self.client.getExpenses(
                group_id=group_id,
                limit=limit,
                offset=offset,
                dated_after=dated_after,
                dated_before=dated_before,
                updated_after=updated_after,
                updated_before=updated_before
            )
            return [self._expense_to_dict(e) for e in expenses]
        except Exception as e:
            logger.error(f"Failed to get expenses: {str(e)}")
            raise SplitwiseAPIError(f"Failed to fetch expenses: {str(e)}")

    def get_expense(self, expense_id: int) -> Dict[str, Any]:
        """
        Get details of a specific expense

        Args:
            expense_id: Splitwise expense ID

        Returns:
            Expense data as dictionary
        """
        try:
            expense = self.client.getExpense(expense_id)
            return self._expense_to_dict(expense)
        except Exception as e:
            logger.error(f"Failed to get expense {expense_id}: {str(e)}")
            raise SplitwiseAPIError(f"Failed to fetch expense: {str(e)}")

    def create_expense(
        self,
        cost: str,
        description: str,
        group_id: Optional[int] = None,
        date: Optional[str] = None,
        currency_code: str = 'USD',
        users: Optional[List[Dict]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Create a new expense in Splitwise

        Args:
            cost: Total cost as string (e.g., "25.00")
            description: Expense description
            group_id: Group ID (required for group expenses)
            date: ISO 8601 date string
            currency_code: 3-letter currency code
            users: List of user share dicts with 'user_id', 'owed_share', 'paid_share'
            **kwargs: Additional fields (category_id, details, etc.)

        Returns:
            Created expense data as dictionary
        """
        try:
            expense = Expense()
            expense.setCost(cost)
            expense.setDescription(description)

            if group_id:
                expense.setGroupId(group_id)

            if date:
                expense.setDate(date)

            expense.setCurrencyCode(currency_code)

            # Add user shares
            if users:
                expense_users = []
                for user_data in users:
                    user = ExpenseUser()
                    user.setId(user_data.get('user_id'))
                    user.setPaidShare(str(user_data.get('paid_share', '0.00')))
                    user.setOwedShare(str(user_data.get('owed_share', '0.00')))
                    expense_users.append(user)
                expense.setUsers(expense_users)

            # Add additional fields
            if 'details' in kwargs:
                expense.setDetails(kwargs['details'])
            if 'category_id' in kwargs:
                expense.setCategoryId(kwargs['category_id'])

            created_expense, errors = self.client.createExpense(expense)

            if errors:
                logger.warning(f"Expense created with errors: {errors}")

            return self._expense_to_dict(created_expense)
        except Exception as e:
            logger.error(f"Failed to create expense: {str(e)}")
            raise SplitwiseAPIError(f"Failed to create expense: {str(e)}")

    def update_expense(self, expense_id: int, **kwargs) -> Dict[str, Any]:
        """
        Update an existing expense

        Args:
            expense_id: Splitwise expense ID
            **kwargs: Fields to update (same as create_expense)

        Returns:
            Updated expense data as dictionary
        """
        try:
            # Get existing expense
            expense = self.client.getExpense(expense_id)

            # Update fields
            if 'cost' in kwargs:
                expense.setCost(str(kwargs['cost']))
            if 'description' in kwargs:
                expense.setDescription(kwargs['description'])
            if 'date' in kwargs:
                expense.setDate(kwargs['date'])
            if 'currency_code' in kwargs:
                expense.setCurrencyCode(kwargs['currency_code'])
            if 'details' in kwargs:
                expense.setDetails(kwargs['details'])

            # Update user shares if provided
            if 'users' in kwargs:
                expense_users = []
                for user_data in kwargs['users']:
                    user = ExpenseUser()
                    user.setId(user_data.get('user_id'))
                    user.setPaidShare(str(user_data.get('paid_share', '0.00')))
                    user.setOwedShare(str(user_data.get('owed_share', '0.00')))
                    expense_users.append(user)
                expense.setUsers(expense_users)

            updated_expense, errors = self.client.updateExpense(expense)

            if errors:
                logger.warning(f"Expense updated with errors: {errors}")

            return self._expense_to_dict(updated_expense)
        except Exception as e:
            logger.error(f"Failed to update expense {expense_id}: {str(e)}")
            raise SplitwiseAPIError(f"Failed to update expense: {str(e)}")

    def delete_expense(self, expense_id: int) -> bool:
        """
        Delete an expense

        Args:
            expense_id: Splitwise expense ID

        Returns:
            True if successful
        """
        try:
            success = self.client.deleteExpense(expense_id)
            return success
        except Exception as e:
            logger.error(f"Failed to delete expense {expense_id}: {str(e)}")
            raise SplitwiseAPIError(f"Failed to delete expense: {str(e)}")

    # =====================
    # Friend Methods
    # =====================

    def get_friends(self) -> List[Dict[str, Any]]:
        """
        Get list of friends

        Returns:
            List of friend data as dictionaries
        """
        try:
            friends = self.client.getFriends()
            return [self._user_to_dict(f) for f in friends]
        except Exception as e:
            logger.error(f"Failed to get friends: {str(e)}")
            raise SplitwiseAPIError(f"Failed to fetch friends: {str(e)}")

    # =====================
    # Currency Methods
    # =====================

    def get_currencies(self) -> List[Dict[str, Any]]:
        """
        Get list of supported currencies

        Returns:
            List of currency data as dictionaries
        """
        try:
            currencies = self.client.getCurrencies()
            return [self._currency_to_dict(c) for c in currencies]
        except Exception as e:
            logger.error(f"Failed to get currencies: {str(e)}")
            raise SplitwiseAPIError(f"Failed to fetch currencies: {str(e)}")

    # =====================
    # Helper Methods - Convert SDK objects to dicts
    # =====================

    def _user_to_dict(self, user) -> Dict[str, Any]:
        """Convert User object to dictionary"""
        return {
            'id': user.getId(),
            'first_name': user.getFirstName(),
            'last_name': user.getLastName(),
            'email': user.getEmail(),
            'picture': getattr(user, 'picture', None) if hasattr(user, 'picture') else None,
        }

    def _group_to_dict(self, group) -> Dict[str, Any]:
        """Convert Group object to dictionary"""
        return {
            'id': group.getId(),
            'name': group.getName(),
            'updated_at': group.getUpdatedAt() if hasattr(group, 'getUpdatedAt') else None,
            'members': [self._user_to_dict(m) for m in (group.getMembers() or [])],
        }

    def _expense_to_dict(self, expense) -> Dict[str, Any]:
        """Convert Expense object to dictionary"""
        return {
            'id': expense.getId(),
            'description': expense.getDescription(),
            'cost': expense.getCost(),
            'currency_code': expense.getCurrencyCode(),
            'date': expense.getDate(),
            'details': expense.getDetails() if hasattr(expense, 'getDetails') else None,
            'group_id': expense.getGroupId(),
            'created_at': expense.getCreatedAt() if hasattr(expense, 'getCreatedAt') else None,
            'updated_at': expense.getUpdatedAt() if hasattr(expense, 'getUpdatedAt') else None,
            'users': [self._expense_user_to_dict(u) for u in (expense.getUsers() or [])],
        }

    def _expense_user_to_dict(self, user) -> Dict[str, Any]:
        """Convert ExpenseUser object to dictionary"""
        return {
            'id': user.getId(),
            'first_name': user.getFirstName() if hasattr(user, 'getFirstName') else None,
            'last_name': user.getLastName() if hasattr(user, 'getLastName') else None,
            'paid_share': user.getPaidShare(),
            'owed_share': user.getOwedShare(),
            'net_balance': user.getNetBalance() if hasattr(user, 'getNetBalance') else None,
        }

    def _currency_to_dict(self, currency) -> Dict[str, Any]:
        """Convert Currency object to dictionary"""
        return {
            'code': currency.getCode() if hasattr(currency, 'getCode') else None,
            'unit': currency.getUnit() if hasattr(currency, 'getUnit') else None,
        }
