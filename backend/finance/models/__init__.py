"""
Finance app models - Financial domain models moved from core app.

This package contains all financial models organized by domain.
"""

# Import all models
from .accounts import Account, BalanceRecord, AccountPdfPassword
from .transaction_groups import TransactionGroup
from .transaction_details import TransactionDetail
from .transactions import BaseTransaction, Transaction, Category
from .tagging import Tag, TagAssignment, TaggableMixin
from .investments import Investment
from .goals import Goal, GoalImage, GroupExpense, GroupExpenseShare
from .expense_groups import ExpenseGroup, ExpenseGroupMembership
from .budgets import Budget, BudgetCategory, BudgetTemplate, BudgetTemplateCategory
from .uploads import (
    UploadSession, StatementImport, TransactionImport,
    TransactionLink, MerchantPattern
)
from .parsing_attempts import (
    ParsingAttempt, ColumnMapping, RegexPattern,
    LearningDataset, ParsingMetrics
)
from .assistant import FinanceAssistantConversation, FinanceAssistantMessage
from .invoice_training import InvoiceParsingAttempt, InvoiceFieldCorrection, InvoiceTrainingDataset
from .documents import TransactionDocument
from .currency import Currency

# Define __all__ to explicitly list what should be available when importing from finance.models
__all__ = [
    # Account models
    'Account',
    'BalanceRecord',
    'AccountPdfPassword',
    # Transaction models
    'BaseTransaction',
    'Transaction',
    'TransactionGroup',
    'TransactionDetail',
    'Category',
    'Tag',
    'TagAssignment',
    'TaggableMixin',
    # Investment models
    'Investment',
    # Goal models
    'Goal',
    'GoalImage',
    'GroupExpense',
    'GroupExpenseShare',
    # Expense Group models
    'ExpenseGroup',
    'ExpenseGroupMembership',
    # Budget models
    'Budget',
    'BudgetCategory',
    'BudgetTemplate',
    'BudgetTemplateCategory',
    # Upload models
    'UploadSession',
    'StatementImport',
    'TransactionImport',
    'TransactionLink',
    'MerchantPattern',
    # Parsing models
    'ParsingAttempt',
    'ColumnMapping',
    'RegexPattern',
    'LearningDataset',
    'ParsingMetrics',
    # Assistant models
    'FinanceAssistantConversation',
    'FinanceAssistantMessage',
    # Invoice training models
    'InvoiceParsingAttempt',
    'InvoiceFieldCorrection',
    'InvoiceTrainingDataset',
    # Document models
    'TransactionDocument',
    # Currency model
    'Currency',
]

