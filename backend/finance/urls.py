"""
Finance app URL configuration.
"""

from django.urls import path, include
from rest_framework_nested import routers
from .views import (
    # InvestmentViewSet,
    GoalViewSet,
    GroupExpenseViewSet,
    TransactionViewSet,
    TransactionGroupViewSet,
    UserBalanceView,
    BudgetViewSet,
    BudgetCategoryViewSet,
    BudgetTemplateViewSet,
    BudgetTemplateCategoryViewSet,
    DocumentViewSet,
)
from .views.currency_views import CurrencyViewSet
from .views.expense_group_views import ExpenseGroupViewSet
from .views.individual_lending_views import IndividualLendingViewSet
from .views.splitwise_group_views import SplitwiseGroupViewSet
from .views.upload_views import (
    UploadSessionViewSet,
    TransactionImportViewSet,
    TransactionLinkViewSet,
    MerchantPatternViewSet,
)
from .views.statement_upload_views import StatementUploadViewSet
from .views.pending_transaction_views import PendingTransactionViewSet
from .views.export_views import ExportDataView, FinancialReportExportView
from .views.bank_icon_views import BankIconSuggestionView
from .views.account_pdf_password_views import AccountPdfPasswordViewSet
from .views.assistant_views import FinanceAssistantConversationViewSet
from .views.invoice_views import InvoiceUploadView, InvoiceApprovalView, InvoiceModelsView, InvoiceTrainingDataView
from .views.analytics_views import (
    ItemLevelAnalyticsView,
    CategoryExpenseDetailView,
    ExpenseComparisonView,
    DocumentInsightsView,
    ComprehensiveAnalyticsViewSet,
)
from .views.ml_export_views import (
    MLDatasetExportView,
    CategoryTrainingDataView,
    EmailExtractionDataView,
)
from .views.deduplication_views import TransactionDeduplicationViewSet
from .urls_enhanced_upload import enhanced_upload_patterns
from .urls_multi_level_parsing import multi_level_parsing_patterns

# Create router and register viewsets
router = routers.DefaultRouter()
router.register(r"currencies", CurrencyViewSet, basename="currency")
router.register(r"transactions", TransactionViewSet, basename="transaction")
router.register(r"transaction-groups", TransactionGroupViewSet, basename="transaction-group")
# router.register(r"investments", InvestmentViewSet, basename="investment")
router.register(r"goals", GoalViewSet, basename="goal")
router.register(r"expense-groups", ExpenseGroupViewSet, basename="expense-group")

# New lending and group expense APIs
router.register(r"individual-lending", IndividualLendingViewSet, basename="individual-lending")
router.register(r"splitwise-groups", SplitwiseGroupViewSet, basename="splitwise-groups")

# Budget-related viewsets
router.register(r"budgets", BudgetViewSet, basename="budget")
router.register(r"budget-categories", BudgetCategoryViewSet, basename="budget-category")
router.register(r"budget-templates", BudgetTemplateViewSet, basename="budget-template")
router.register(r"budget-template-categories", BudgetTemplateCategoryViewSet, basename="budget-template-category")

# Upload-related viewsets
router.register(r"upload-sessions", UploadSessionViewSet, basename="upload-session")
router.register(r"statement-uploads", StatementUploadViewSet, basename="statement-upload")
router.register(r"transaction-imports", TransactionImportViewSet, basename="transaction-import")
router.register(r"transaction-links", TransactionLinkViewSet, basename="transaction-link")
router.register(r"merchant-patterns", MerchantPatternViewSet, basename="merchant-pattern")

# Pending transactions viewset
router.register(r"pending-transactions", PendingTransactionViewSet, basename="pending-transaction")

# Account password management
router.register(r"account-pdf-passwords", AccountPdfPasswordViewSet, basename="account-pdf-password")

# Assistant conversations
router.register(
    r"assistant-conversations",
    FinanceAssistantConversationViewSet,
    basename="assistant-conversation",
)

# Document management (receipts, invoices, bills)
router.register(r"documents", DocumentViewSet, basename="document")

# Transaction deduplication
router.register(r"transactions/deduplication", TransactionDeduplicationViewSet, basename="transaction-deduplication")

# Comprehensive analytics viewset
router.register(r"analytics", ComprehensiveAnalyticsViewSet, basename="analytics")

expense_groups_router = routers.NestedDefaultRouter(
    router, r"expense-groups", lookup="expense_group"
)
expense_groups_router.register(
    r"expenses", GroupExpenseViewSet, basename="expense-group-expense"
)

app_name = "finance"

urlpatterns = [
    # Include at root; project urls add the '/api/' prefix
    path("", include(router.urls)),
    path("", include(expense_groups_router.urls)),
    path("balances/", UserBalanceView.as_view(), name="user-balances"),
    path("export/", ExportDataView.as_view(), name="export-data"),
    path("bank-icons/", BankIconSuggestionView.as_view(), name="bank-icon-suggestions"),
    path("invoices/models/", InvoiceModelsView.as_view(), name="invoice-models"),
    path("invoices/training-data/", InvoiceTrainingDataView.as_view(), name="invoice-training-data"),
    path("invoices/upload/", InvoiceUploadView.as_view(), name="invoice-upload"),
    path("invoices/approve/", InvoiceApprovalView.as_view(), name="invoice-approve"),
    path("reports/financial/", FinancialReportExportView.as_view(), name="financial-report"),
    # Enhanced analytics endpoints
    path("analytics/items/", ItemLevelAnalyticsView.as_view(), name="item-analytics"),
    path("analytics/category-detail/", CategoryExpenseDetailView.as_view(), name="category-detail"),
    path("analytics/comparison/", ExpenseComparisonView.as_view(), name="expense-comparison"),
    path("analytics/documents/", DocumentInsightsView.as_view(), name="document-insights"),
    # ML training data export
    path("ml/export-dataset/", MLDatasetExportView.as_view(), name="ml-export-dataset"),
    path("ml/category-data/", CategoryTrainingDataView.as_view(), name="ml-category-data"),
    path("ml/email-data/", EmailExtractionDataView.as_view(), name="ml-email-data"),
] + enhanced_upload_patterns + multi_level_parsing_patterns
