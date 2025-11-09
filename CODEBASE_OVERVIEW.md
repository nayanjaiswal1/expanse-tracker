# Expense Tracker Application - Comprehensive Codebase Overview

## Executive Summary

The Expense Tracker is a full-stack web application for personal and business financial management with advanced AI-powered document processing, multi-currency support, and collaborative expense sharing. It features a modern React frontend with TypeScript, a Django REST API backend, and integrations with Gmail, Splitwise, and multiple AI providers.

---

## 1. TECHNOLOGY STACK

### Frontend
- **Framework**: React 19.2.0 with TypeScript 5.5.4
- **Build Tool**: Vite 4.5.14
- **Routing**: React Router DOM 6.14.0
- **State Management**: 
  - React Context API (Authentication, Currency, Theme, ReferenceData)
  - React Hook Form 7.45.0 (Form handling)
  - TanStack React Query 5.84.1 (Server state)
- **UI Components**:
  - Tailwind CSS 3.4.17 (Styling)
  - Radix UI (Headless components)
  - Lucide React 0.536.0 (Icons)
  - Framer Motion 12.23.12 (Animations)
  - Headless UI 2.2.9 (Accessible components)
- **Data Visualization**: Recharts 3.1.0 (Charts and analytics)
- **Forms**: React Hook Form + Zod 3.23.8 (Validation)
- **Notifications**: 
  - react-hot-toast 2.4.1
  - Sonner 2.0.7
- **Internationalization**: i18next 25.6.0, react-i18next 16.1.4
- **Document Processing**: react-pdf 10.2.0, react-image-crop 11.0.10
- **HTTP Client**: Axios 1.4.0

### Backend
- **Framework**: Django 4.2.24
- **API Framework**: Django REST Framework 3.16.1
- **Authentication**:
  - djangorestframework-simplejwt 5.5.1 (JWT tokens)
  - django-allauth 65.11.2 (Social auth, Google OAuth)
  - Custom cookie-based JWT authentication
- **Database**: PostgreSQL 12+ (psycopg2 2.9.10), SQLite fallback for dev
- **Task Queue**: Celery 5.5.3 with Redis 6.4.0 broker
- **Scheduled Jobs**: django-celery-beat 2.8.1
- **Filtering & Search**: django-filter 24.3, drf-nested-routers 0.95.0
- **CORS**: django-cors-headers 4.9.0
- **Rate Limiting**: django-ratelimit 4.1.0

### AI/LLM Integration
- **OpenAI**: openai 1.108.1 (GPT models)
- **Anthropic Claude**: anthropic 0.40.0
- **Ollama**: ollama 0.5.4 (Local models like Llama, Mistral)
- **LLM Provider Abstraction**: Custom provider system supporting all three

### Document Processing
- **PDF Processing**:
  - pypdf 6.1.1, PyPDF2 3.0.1
  - pdf2image 1.17.0, PyMuPDF 1.26.4
- **Image Processing**: 
  - Pillow 11.3.0
  - opencv-python 4.12.0.88
- **OCR**: pytesseract 0.3.13 (Tesseract wrapper)
- **Word Docs**: python-docx 1.2.0
- **Excel**: openpyxl 3.1.5, xlsxwriter 3.2.9
- **Data Processing**: pandas 2.3.2, numpy 2.2.6, lxml 6.0.1, beautifulsoup4 4.13.5

### External Integrations
- **Gmail**: google-api-python-client 2.182.0, google-auth-oauthlib 1.2.2
- **Splitwise**: splitwise 3.0.0
- **Telegram**: python-telegram-bot 22.4
- **Cloud Storage**: boto3 1.35.50 (AWS S3), django-storages 1.14.4

### Security & Encryption
- **Cryptography**: cryptography 46.0.1, pycryptodome 3.23.0
- **JWT Tokens**: PyJWT 2.10.1
- **OAuth**: requests-oauthlib 1.3.1

### Production & Deployment
- **WSGI Server**: gunicorn 23.0.0
- **Static Files**: whitenoise 6.11.0
- **Environment Config**: python-decouple 3.8
- **Code Quality**: ruff 0.13.1, vulture 2.3

---

## 2. BACKEND STRUCTURE

### Directory Organization

```
backend/
├── app_settings/              # Django project configuration
│   ├── settings.py           # Main settings (DB, auth, apps)
│   ├── celery.py            # Celery configuration
│   ├── urls.py              # Root URL routing
│   └── logging_config.py     # Logging setup
│
├── finance/                   # Main finance application
│   ├── models/              # Database models (organized by domain)
│   │   ├── accounts.py      # Account, BalanceRecord, AccountPdfPassword
│   │   ├── transactions.py  # Transaction, Category, BaseTransaction
│   │   ├── budgets.py       # Budget, BudgetCategory, BudgetTemplate
│   │   ├── expense_groups.py # ExpenseGroup, ExpenseGroupMembership
│   │   ├── goals.py         # Goal, GoalImage, GroupExpense
│   │   ├── investments.py   # Investment tracking
│   │   ├── documents.py     # TransactionDocument
│   │   ├── currency.py      # Currency model
│   │   ├── tagging.py       # Tag, TagAssignment, TaggableMixin
│   │   ├── uploads.py       # UploadSession, MerchantPattern
│   │   ├── parsing_attempts.py # ParsingAttempt, ColumnMapping
│   │   ├── invoice_training.py # InvoiceParsingAttempt, training
│   │   ├── assistant.py     # FinanceAssistantConversation
│   │   └── transaction_details.py # TransactionDetail, TransactionGroup
│   │
│   ├── serializers/         # DRF serializers for API responses
│   ├── views/               # 34+ API view files (see below)
│   ├── services/            # Business logic services
│   ├── signals/             # Django signals for events
│   ├── filters.py           # DRF filter definitions
│   ├── tasks.py             # Celery tasks
│   ├── admin.py             # Django admin configuration
│   ├── urls.py              # API endpoint definitions
│   └── migrations/          # Database schema migrations
│
├── finance_v2/              # Version 2 of finance app (newer models)
│   ├── models.py           # Entity, Group, Transaction, PendingTransaction, UploadedFile
│   └── services/           # AI and processing services
│       ├── ai_service.py           # LLM provider abstraction
│       ├── ai_transaction_extractor.py # AI-powered extraction
│       ├── statement_parser.py      # Bank statement parsing
│       ├── ocr_service.py           # OCR operations
│       ├── pending_transaction_processor.py # Transaction workflow
│       ├── deduplication_service.py  # Duplicate detection
│       ├── gmail_sync.py            # Gmail synchronization
│       └── currency_helper.py       # Currency utilities
│
├── services/                # AI and external integrations
│   ├── models.py           # EmailAccountPattern, GmailAccount, SplitwiseIntegration
│   ├── ai_invoice_parser.py # Advanced invoice OCR/parsing
│   ├── ai_operations.py     # AI operation handlers
│   ├── ai_report_generation_service.py # Report generation
│   ├── ai_stripe_service.py # Stripe integration
│   ├── ai_serializers.py    # AI response serializers
│   ├── providers/           # AI provider implementations
│   │   └── openai.py
│   ├── services/            # Core business services
│   │   ├── gmail_service.py
│   │   ├── email_sync_service.py
│   │   ├── email_parser.py
│   │   ├── email_processor_service.py
│   │   ├── email_transaction_service.py
│   │   ├── email_order_parser.py
│   │   └── email_ingestion_service.py
│   ├── views/              # API views for services
│   │   ├── gmail_views.py
│   │   ├── splitwise_views.py
│   │   └── pattern_views.py
│   ├── management/         # Django management commands
│   │   └── commands/
│   │       ├── sync_emails.py
│   │       └── sync_all_emails.py
│   └── middleware/         # Custom middleware
│       └── AutoEmailSyncMiddleware
│
├── users/                   # User management and authentication
│   ├── models/             # User-related models (organized by domain)
│   │   ├── profile.py      # UserProfile
│   │   ├── preferences.py  # UserPreferences, AISettings
│   │   ├── subscription.py # UserSubscription
│   │   ├── plans.py        # Plan, UserPlanAssignment, UserAddon
│   │   ├── activity.py     # ActivityLog
│   │   └── personalization.py # UserPersonalization
│   ├── serializers.py      # User serializers
│   ├── views.py            # User API views
│   ├── auth_backends.py    # Custom authentication backends
│   ├── authentication.py    # JWT/auth utilities
│   ├── encryption.py       # Field encryption utilities
│   ├── permissions.py      # DRF permission classes
│   ├── middleware.py       # Custom middleware (auth, logging, security)
│   └── pagination.py       # Pagination classes
│
├── training/               # ML training and data collection
│   ├── models.py          # RawEmail, AILabel, UnifiedTransaction, TrainingDataset
│   └── management/        # Training commands
│
├── reference/              # Reference data (countries, currencies, etc.)
│   ├── models.py          # Country, Language, Timezone, CurrencyInfo, LocaleMapping
│   ├── serializers.py     # Reference data serializers
│   ├── views.py           # Reference data API views
│   └── management/        # Data loading commands
│
├── utils/                  # Utility functions
├── requirements.txt        # Python dependencies
├── Dockerfile              # Container configuration
└── .env.template           # Environment variables template
```

### API Views (34+ view files in finance/views/)

Key ViewSets:
- **TransactionViewSet** - CRUD operations for transactions
- **AccountsManagement** - Account management
- **BudgetViewSet** - Budget tracking and management
- **GroupExpenseViewSet** - Shared expense tracking
- **UploadSessionViewSet** - File upload sessions
- **PendingTransactionViewSet** - Transaction review workflow
- **FinanceAssistantConversationViewSet** - AI chat interface
- **CurrencyViewSet** - Currency management
- **ExpenseGroupViewSet** - Group management
- **IndividualLendingViewSet** - Peer lending tracking
- **SplitwiseGroupViewSet** - Splitwise integration
- **AccountPdfPasswordViewSet** - PDF password management
- **TransactionDeduplicationViewSet** - Duplicate detection
- **InvoiceUploadView** - Invoice processing
- **ExportDataView** - Data export functionality
- **MLDatasetExportView** - ML training data export

---

## 3. DATABASE MODELS & RELATIONSHIPS

### Core Finance Models (finance app)

**Account** (SoftDeleteModel)
- Account management with balance tracking
- Fields: name, type (checking/savings/credit/investment/loan/cash), status, balance, currency, limit, metadata
- Relationships: User → Accounts, Account → BalanceRecords, Account → Transactions
- Soft delete support for account closure

**Transaction** (BaseTransaction, TaggableMixin, UserOwnedModel)
- Individual financial transactions
- Fields: amount, description, date, currency, status, external_id, notes
- Supports tagging and categorization
- Can be linked to accounts and users

**Category** (HierarchicalModelMixin, UserOwnedModel)
- Hierarchical transaction categories
- Supports parent-child relationships
- Custom categories per user

**Budget** (UserOwnedModel)
- Budget tracking with category-based allocation
- Fields: name, total_amount, period, status, currency
- Relationships: Budget → BudgetCategories

**ExpenseGroup** (UserOwnedModel)
- Shared expense tracking for groups
- Fields: name, description, currency, settlement_status
- Relationships: ExpenseGroup → ExpenseGroupMembers, → GroupExpenses

**Goal** (UserOwnedModel)
- Financial goals with progress tracking
- Fields: name, target_amount, current_amount, deadline, category, status
- Relationships: Goal → GoalImages

**Investment** (UserOwnedModel)
- Investment portfolio tracking
- Fields: symbol, quantity, purchase_price, current_price, investment_type
- Relationships: Investment → Transactions

**BalanceRecord** (UserOwnedModel)
- Historical balance snapshots for reconciliation
- Fields: balance, date, entry_type, statement_balance, reconciliation_status
- Comprehensive reconciliation and analysis tracking

**Tag** (UserOwnedModel)
- Custom tags for transactions
- TagAssignment links tags to transactions

**Currency**
- Supported currencies with formatting info
- Used throughout for multi-currency support

### Finance V2 Models (newer architecture)

**Entity** (universal merchant/person/company model)
- Replaces hardcoded merchant data
- Types: merchant, person, company, bank, government, other
- User-scoped with is_active flag

**Group** (shared expense groups)
- Similar to ExpenseGroup but simplified
- Fields: name, description, currency, is_active
- Relationships: Group → GroupMembers → GroupMemberships

**Transaction** (unified transaction model)
- Core financial transaction
- Fields: amount, is_expense, description, date, metadata
- Relationships: Transaction → TransactionItems, → TransactionSplits, → Entity, → Group
- Soft delete support

**TransactionItem** (line items)
- Line items within transactions
- Fields: name, quantity, unit_price, amount (calculated)
- Used for detailed itemization

**TransactionSplit** (expense splits)
- Split amounts for group expenses
- Links transactions to group members with amounts

**PendingTransaction** (review workflow)
- Transactions awaiting user review
- Status: pending, approved, rejected, merged
- Source: email, file, manual, api
- Can be linked to actual Transaction after approval

**UploadedFile** (universal file storage)
- Centralized file storage replacing old Statement/Document models
- Types: statement, receipt, invoice, bill, document
- Processing modes: parser (deterministic) or ai
- Polymorphic linking to Transaction or Group
- OCR results and processing metadata
- File hashing for deduplication

### User Models (users app)

**UserProfile**
- User personal information
- Fields: phone, bio, website, location, profile_photo, is_onboarded, is_verified

**UserPreferences**
- UI and display settings
- Fields: preferred_currency, timezone, language, theme, notification_settings, table_column_preferences

**AISettings**
- AI provider configuration per user
- Fields: preferred_provider (system/openai/anthropic/ollama), API keys (encrypted), model selections, feature toggles
- Encrypted API key storage

**UserSubscription**
- Subscription and usage tracking
- Fields: current_plan, status, start_date, end_date, ai_credits, transaction_count
- Usage analytics

**Plan & UserPlanAssignment**
- Subscription plan definitions
- Feature limits and pricing

**ActivityLog**
- User action audit trail

**UserPersonalization**
- Onboarding questionnaire data
- Use case, account count, transaction volume, goals, preferences

### Training/ML Models (training app)

**RawEmail**
- Raw email payloads for processing
- Fields: subject, sender, body_text, body_html, source (gmail/sms/manual)
- Processing status tracking with event logging
- User feedback collection for training
- Transaction linkage tracking

**RawEmailAttachment**
- Binary attachments from emails
- File storage with metadata

**AILabel**
- AI-generated labels and extracted data from emails
- Fields: label (transaction/offer/alert/statement/spam/other), label_confidence
- Transaction-specific fields when labeled as transaction
- Extraction metadata (model, prompt version, raw response)
- User verification and correction tracking

**UnifiedTransaction**
- Merged transactions from multiple sources
- Deduplication across Gmail, SMS, statements
- Merge metadata and confidence scores

**TrainingDataset**
- Versioned training datasets
- Composition metrics (total_samples, user_verified_count, user_corrected_count)
- Dataset file references and metadata

### Services Models (services app)

**GmailAccount**
- Gmail connection information
- Fields: email, access_token, refresh_token, expires_at, is_active
- Sync settings: last_sync_at, last_synced_history_id
- Filters: sender_filters, keyword_filters

**EmailAccountPattern**
- Learned patterns for automatic account linking
- Pattern fields: sender_email, sender_domain, merchant_name, institution_name, last_digits, upi_id, wallet_name
- Confidence scoring and usage tracking

**SplitwiseIntegration**
- Splitwise OAuth and sync configuration
- Sync state tracking and error logging
- Import settings for groups and expenses

**SplitwiseGroupMapping** & **SplitwiseExpenseMapping**
- Mapping local groups/expenses to Splitwise
- Sync direction configuration (bidirectional/one-way)

**SplitwiseSyncLog**
- Audit trail of sync operations
- Statistics: groups_synced, expenses_created, errors_count
- Error tracking and completion status

### Reference Data Models (reference app)

**Country**
- ISO country codes with metadata
- Fields: code, name, flag emoji, dial_code, default_currency, default_timezone

**Language**
- Supported languages
- Fields: code, name, native_name, is_rtl

**Timezone**
- IANA timezone data
- Fields: name (IANA code), label, offset, country_code, is_common

**CurrencyInfo**
- Extended currency information
- Extends finance.Currency with: symbol_native, name_plural, rounding, space_between_amount_and_symbol

**LocaleMapping**
- Locale → Currency/Language/Country mapping
- Used for personalization (en-US → USD, en-GB → GBP, etc.)

### Model Relationships Summary

```
User
├── Account (1-M, soft-deletable)
│   ├── BalanceRecord (1-M)
│   ├── AccountPdfPassword (1-M)
│   └── Transaction (via finance_v2)
├── Transaction (1-M, soft-deletable)
│   ├── TransactionItem (1-M, v2)
│   ├── TransactionSplit (1-M, v2)
│   └── Tag (M-M)
├── Category (1-M, hierarchical)
├── Budget (1-M)
│   └── BudgetCategory (1-M)
├── Goal (1-M)
├── Investment (1-M)
├── ExpenseGroup (1-M)
│   ├── ExpenseGroupMember (1-M)
│   └── GroupExpense (1-M)
├── Group (v2, 1-M)
│   └── GroupMember (1-M)
├── Entity (v2, 1-M)
├── PendingTransaction (v2, 1-M)
├── UploadedFile (v2, 1-M)
├── RawEmail (1-M)
│   ├── RawEmailAttachment (1-M)
│   ├── AILabel (1-1)
│   └── UnifiedTransaction (M-M)
├── GmailAccount (1-M)
├── EmailAccountPattern (1-M)
├── UserProfile (1-1)
├── UserPreferences (1-1)
├── AISettings (1-1)
├── UserSubscription (1-1)
└── Plan (1-M via UserPlanAssignment)
```

---

## 4. CURRENT FEATURES IMPLEMENTED

### Account Management
- Multiple account types (checking, savings, credit, investment, loan, cash, other)
- Account status tracking (active, inactive, closed, frozen, pending)
- Balance history and reconciliation
- Soft delete for account closure
- Account tagging and custom metadata
- PDF password storage for automated statement unlocking

### Transaction Management
- Transaction CRUD with soft delete
- Multi-currency support
- Categorization with hierarchical categories
- Custom tagging system
- Transaction items with quantity and unit pricing
- Status tracking (active, cancelled, pending, failed)
- External transaction ID linking

### Expense Tracking
- Personal expense logging
- Shared expense groups with settlements
- Expense splitting among group members
- Individual lending tracking
- Settlement status management

### Budget Management
- Budget creation with amount and period
- Budget category allocation
- Budget tracking and status
- Template-based budgets for reuse
- Progress visualization

### Investment Tracking
- Portfolio management
- Investment types and symbols
- Purchase price and current price tracking
- Return calculations
- Investment goals

### AI-Powered Features
- **Multi-provider LLM support**: OpenAI, Anthropic Claude, Ollama
- **Email parsing**: Automatic transaction extraction from Gmail
- **Invoice OCR**: Advanced document processing with computer vision
- **Bank statement parsing**: Automated transaction extraction
- **AI categorization**: Smart transaction categorization
- **OCR Service**: Text extraction from images and scanned documents
- **AI-powered reports**: Financial analysis and insights

### Document Processing
- **Multiple format support**: PDF, images (JPG, PNG), Word docs, Excel sheets
- **OCR engine**: Tesseract-based text extraction
- **File type classification**: statement, receipt, invoice, bill, document
- **Processing modes**: Deterministic parser or AI-based parsing
- **File deduplication**: Hash-based duplicate detection
- **Polymorphic linking**: Can attach to transactions or groups

### Authentication & User Management
- JWT-based token authentication (HttpOnly cookies)
- Google OAuth integration
- Email/username/phone login flexibility
- User profile with personalization
- Role-based access control (admin, user)
- Activity audit logging

### Gmail Integration
- Gmail OAuth connection
- Automatic email sync with history tracking
- Email filtering by sender/keywords
- Transaction email detection
- Attachment processing
- Smart account pattern learning from manual linking

### Splitwise Integration
- OAuth authentication
- Bidirectional sync
- Group and expense mapping
- Sync status tracking
- Error logging and recovery

### Internationalization
- Multi-language support (English, Spanish, Hindi, French, German, etc.)
- Multi-currency with formatting rules
- Timezone support
- Locale-based defaults (currency, language, etc.)
- Reference data system (countries, currencies, languages, timezones)

### Data Management
- Transaction export functionality
- ML training data export
- Bulk operations
- Data filtering and search
- Pagination with configurable page size
- Advanced filtering (date ranges, amount, category, etc.)

### Settings & Preferences
- User profile customization
- UI theme (light, dark, system)
- Notification preferences
- Table column preferences
- AI provider selection
- Timezone and language settings

### Admin Features
- Django admin interface with customized configurations
- User management
- Plan and subscription management
- Data integrity monitoring
- Task queue monitoring

---

## 5. FRONTEND STRUCTURE

### Directory Organization

```
frontend/src/
├── pages/                  # Top-level page components
│   ├── ProLandingPage.tsx
│   ├── PrivacyPolicy.tsx
│   ├── TermsOfService.tsx
│   ├── AdminPage.tsx
│   ├── UnauthorizedPage.tsx
│   ├── PlanCustomization.tsx
│   ├── DocumentParserPage.tsx
│   └── CookieConsent.tsx
│
├── features/               # Feature modules (organized by domain)
│   ├── auth/              # Authentication
│   │   ├── Login.tsx
│   │   ├── GoogleCallback.tsx
│   │   ├── GmailCallback.tsx
│   │   └── OnboardingFlow.tsx
│   │
│   ├── finance/           # Finance module (largest)
│   │   ├── AccountsManagement.tsx
│   │   ├── ConfigurableTransactionTable.tsx
│   │   ├── BankStatementUpload.tsx
│   │   ├── StatementViewer.tsx
│   │   ├── StatementParser.tsx
│   │   ├── Budgets.tsx
│   │   ├── Goals.tsx
│   │   ├── GroupExpenses.tsx
│   │   ├── ExpenseTracker.tsx
│   │   ├── MerchantPatterns.tsx
│   │   ├── InvestmentTracker.tsx
│   │   ├── RecurringInvestments.tsx
│   │   ├── Upload.tsx
│   │   ├── UploadHistory.tsx
│   │   ├── GmailAccounts.tsx
│   │   ├── components/   # Finance-specific components
│   │   │   ├── StatementParser.tsx
│   │   │   └── More...
│   │   ├── forms/        # Finance forms
│   │   ├── hooks/        # Finance hooks
│   │   ├── utils/        # Finance utilities
│   │   ├── constants/    # Finance constants
│   │   ├── budgets/      # Budget components
│   │   ├── goals/        # Goal components
│   │   ├── lending/      # Lending components
│   │   └── api/          # Finance API calls
│   │
│   ├── dashboard/        # Dashboard & analytics
│   │   ├── Dashboard.tsx
│   │   └── MonthlyAnalysis.tsx
│   │
│   ├── settings/         # User settings
│   │   ├── Settings.tsx
│   │   ├── AutomationRules.tsx
│   │   ├── NotificationsSettings.tsx
│   │   ├── IntegrationsSettings.tsx
│   │   ├── TelegramIntegration.tsx
│   │   ├── SplitwiseIntegration.tsx
│   │   └── components/   # Settings-specific components
│   │
│   ├── onboarding/       # Onboarding flow
│   │   ├── CurrencySelector.tsx
│   │   ├── AccountTypeSelector.tsx
│   │   ├── AddFirstAccount.tsx
│   │   ├── GmailConnectionStep.tsx
│   │   └── DashboardTour.tsx
│   │
│   ├── ai/               # AI features
│   │   └── InvoiceOCR.tsx
│   │
│   └── planCustomization/ # Plan customization
│
├── components/            # Reusable UI components
│   ├── common/            # Generic components
│   │   ├── ErrorBoundary.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── More...
│   ├── layout/            # Layout components
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Layout.tsx
│   ├── ui/                # Basic UI elements
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   ├── Dropdown.tsx
│   │   ├── Select.tsx
│   │   └── More...
│   └── ...
│
├── contexts/              # React Context providers
│   ├── AuthContext.tsx    # Authentication state + JWT/cookie management
│   ├── ThemeContext.tsx   # Theme (light/dark/system)
│   ├── CurrencyContext.tsx # Currency and formatting
│   ├── FormContext.tsx    # Form state management
│   └── ReferenceDataContext.tsx # Reference data (countries, currencies, timezones)
│
├── hooks/                 # Custom React hooks
│   ├── useAuth.ts
│   ├── useTheme.ts
│   ├── useCurrency.ts
│   └── More...
│
├── api/                   # API client and modules
│   ├── client.ts          # Axios client with interceptors
│   ├── modules/           # Feature-specific API calls
│   │   ├── accounts.ts
│   │   ├── transactions.ts
│   │   ├── budgets.ts
│   │   ├── goals.ts
│   │   ├── users.ts
│   │   ├── uploads.ts
│   │   └── More...
│   └── ...
│
├── services/              # Non-API service utilities
│   ├── referenceDataService.ts # Reference data fetching with caching
│   └── More...
│
├── types/                 # TypeScript type definitions
│   ├── index.ts
│   └── Shared types for app
│
├── utils/                 # Utility functions
│   ├── errorHandling.ts
│   ├── logger.ts
│   ├── formatting.ts
│   ├── date-fns utilities
│   └── More...
│
├── lib/                   # Third-party library wrappers
├── theme/                 # Theme definitions
├── styles/                # Global styles
├── locales/               # i18n translation files
│   ├── en/
│   ├── es/
│   └── hi/
│
├── App.tsx                # Root app component
├── main.tsx               # Entry point
├── router.tsx             # React Router configuration
├── config.ts              # App configuration
└── i18n.ts                # i18n setup
```

### Routing Structure

```
/ (public)
├── /landing - Landing page
├── /privacy-policy
├── /terms-of-service
├── /login - Google OAuth login
├── /google-callback - OAuth callback
├── /unauthorized

/protected (authenticated)
├── /onboarding - First-time setup flow
├── /personalization - Onboarding details
├── / (layout wrapper)
│   ├── /dashboard - Main dashboard with analytics
│   ├── /transactions - Configurable transaction table
│   ├── /accounts - Account management
│   ├── /goals - Financial goals
│   ├── /goals/:goalId - Goal details
│   ├── /budgets - Budget management
│   ├── /budgets/:id - Budget details
│   ├── /expenses - Personal expense tracking
│   ├── /group-expenses - Shared expenses
│   ├── /upload-history - File upload history
│   ├── /uploads - Statement uploads
│   ├── /transaction-settings - Transaction preferences
│   ├── /statement-viewer - View and analyze statements
│   ├── /statement-parser - Parse statements
│   ├── /invoice-ocr - Invoice processing
│   ├── /monthly-analysis - Monthly financial analysis
│   ├── /settings/* - Settings subpages
│   ├── /telegram-integration - Telegram setup
│   ├── /plan-customization - Plan customization
│   ├── /document-parser - Document processing
│   └── /recurring-investments - Recurring investment tracking

/admin (admin only)
└── /admin - Admin dashboard
```

### State Management

**React Context API** (Centralized app state):
1. **AuthContext** - User authentication and profile data
   - User object with profile, preferences, subscriptions, AI settings
   - Login/logout actions
   - Lazy loading of different user data sections
   - JWT token management via HttpOnly cookies

2. **ThemeContext** - UI theme (light/dark/system)

3. **CurrencyContext** - Currency formatting and conversion
   - Active currency
   - Formatting rules and symbols
   - Exchange rates

4. **FormContext** - Form state across components

5. **ReferenceDataContext** - Reference data (countries, currencies, languages, timezones)
   - Multi-layer caching (memory + localStorage + server)
   - Auto-fetch on app initialization

**TanStack React Query** (Server state):
- Caching of API responses
- Automatic refetching
- Background sync
- Optimistic updates

**React Hook Form** (Form state):
- Efficient form management
- Built-in validation
- Integration with Zod for schema validation

### Key Frontend Components

**Layout**
- Header with navigation and user menu
- Sidebar with navigation links
- Responsive design for mobile/tablet/desktop

**Dashboard**
- Summary cards (total balance, monthly spending, etc.)
- Transaction feed
- Budget overview
- Goals progress
- Monthly analysis charts

**Transaction Management**
- Configurable table with column preferences
- Filtering by date, amount, category, account
- Bulk operations
- Transaction details modal
- Export functionality

**Account Management**
- Account list with balance and status
- Add/edit/delete accounts
- Account type selection
- PDF password management
- Balance reconciliation

**File Upload**
- Drag-and-drop statement upload
- Multiple file format support
- Progress tracking
- OCR processing status
- Transaction extraction preview
- Manual verification workflow

**Budgets**
- Budget creation form
- Category allocation
- Progress visualization
- Template selection
- Month-to-month tracking

**Goals**
- Goal creation and tracking
- Progress bars
- Target date management
- Category-based goals
- Goal images

**Group Expenses**
- Group creation and management
- Member addition
- Expense logging with splits
- Settlement tracking
- Balance calculation

**Settings**
- Profile customization
- Preference management
- Theme selection
- Notification settings
- AI provider configuration (if enabled)
- Timezone and language selection
- Gmail account connection
- Splitwise integration
- Telegram bot setup
- Plan customization

---

## 6. EXISTING AI INTEGRATION & PARSING LOGIC

### AI Provider Abstraction Layer

**LLMProvider Class** (`finance_v2/services/ai_service.py`)
- Unified interface supporting multiple providers
- Auto-selection based on settings.LLM_PROVIDER
- Methods:
  - `generate()` - Text completion
  - `generate_json()` - Structured JSON extraction
  - `extract_fields()` - Data field extraction

**Supported Providers:**
1. **Ollama** (Local models)
   - Default local model provider
   - Models: Llama, Mistral, etc.
   - No API costs

2. **OpenAI** (Cloud models)
   - GPT-3.5-turbo, GPT-4
   - Configured via API key
   - Temperature and token control

3. **Anthropic** (Claude models)
   - Claude 3 Sonnet, Opus, Haiku
   - Configured via API key
   - Superior reasoning and instruction following

### Document Processing Pipeline

**1. Invoice Parser** (`services/ai_invoice_parser.py`)
- Image preprocessing pipeline:
  - Image deskewing (auto-correct rotation)
  - Grayscale conversion
  - Denoising with NLMeans
  - Adaptive thresholding for text extraction
- OCR with Tesseract
- LLM-powered data extraction:
  - Invoice number, date, amounts
  - Line item details
  - Merchant information
  - Tax and total calculations

**2. Statement Parser** (`finance_v2/services/statement_parser.py`)
- Deterministic parsing with regex patterns
- AI-powered parsing for complex formats
- Transaction extraction:
  - Date, amount, description
  - Account balance
  - Merchant/payee information
- Multi-page PDF handling
- Table structure detection

**3. OCR Service** (`finance_v2/services/ocr_service.py`)
- Full document digitization
- Text extraction from images
- Confidence scoring
- Layout preservation
- Support for multiple languages

**4. AI Transaction Extractor** (`finance_v2/services/ai_transaction_extractor.py`)
- Email-based transaction extraction
- Bank notification parsing
- Payment confirmation processing
- Structured data extraction:
  - Transaction amount and currency
  - Transaction date and merchant
  - Account details (last 4 digits)
  - Reference IDs and UTR numbers
- Multi-provider fallback

### Email Processing Pipeline

**Flow:**
1. **Gmail Sync** (`services/services/gmail_service.py`)
   - Authenticate with Gmail OAuth
   - Fetch new emails with history sync
   - Full-text email storage

2. **Email Parsing** (`services/services/email_parser.py`)
   - Subject and body analysis
   - Transaction detection
   - Pattern matching for known senders
   - Amount and currency extraction

3. **AI Labeling** (`training/models.py` - AILabel)
   - Classification: transaction/offer/alert/statement/spam/other
   - Confidence scoring (0.0-1.0)
   - Extraction of transaction-specific fields
   - Raw LLM response logging for debugging

4. **Deduplication** (`finance_v2/services/deduplication_service.py`)
   - Merge related emails (e.g., bank notification + merchant confirmation)
   - Create UnifiedTransaction from multiple sources
   - Merge confidence scoring

5. **Transaction Creation** (`finance_v2/services/pending_transaction_processor.py`)
   - Convert to PendingTransaction for review
   - User approval workflow
   - Create actual Transaction on approval

**Models:**
- **RawEmail** - Raw email payload storage
- **AILabel** - AI-generated classification and extraction
- **UnifiedTransaction** - Deduplicated merged transactions
- **TrainingDataset** - Version tracking for model retraining

### Advanced Features

**1. Email Account Patterns** (`services/models.py` - EmailAccountPattern)
- Learn from manual account linking
- Auto-link transactions to accounts
- Pattern fields: sender_domain, merchant_name, last_digits, institution_name
- Confidence scoring that improves with usage
- Used for automating future transaction categorization

**2. Invoice Field Training** (`finance/models/invoice_training.py`)
- User corrections feed training data
- Track extraction accuracy per field
- Support for custom invoice formats
- Metrics on parser performance

**3. Report Generation** (`services/ai_report_generation_service.py`)
- AI-powered financial analysis
- Monthly spending summaries
- Category insights
- Savings opportunities identification

**4. Stripe Integration** (`services/ai_stripe_service.py`)
- Payment processing integration
- Transaction sync from Stripe
- Webhook handling

### Training & Feedback Loop

**User Feedback Collection:**
- Mark extracted data as correct/incorrect
- Provide corrections
- Categorization feedback
- Email classification feedback

**Training Data:**
- RawEmail with user_feedback field
- AILabel with user_verified and user_corrected_data fields
- UnifiedTransaction with user_edited tracking

**Dataset Management:**
- TrainingDataset model tracks versions
- Composition metrics (total samples, verified, corrected)
- Can export for model fine-tuning
- ML export endpoints for training data

---

## 7. AUTHENTICATION & USER MANAGEMENT

### Authentication Flow

**Frontend:**
1. User clicks "Login with Google"
2. Google OAuth popup → redirect to Google consent
3. Google callback → `/google-callback` endpoint
4. Backend validates code and exchanges for tokens
5. Backend creates/updates User and issues JWT
6. JWT stored in HttpOnly cookie (secure by default)
7. AuthContext subscribes to auth changes
8. Redirect to dashboard

**Backend:**
- Django Allauth + SimpleJWT
- JWT tokens stored in HttpOnly cookies (safer than localStorage)
- Custom CookieJWTAuthentication class
- Token refresh via `/api/users/refresh-token/`
- Multi-field backend supports email/username/phone login

### User Model

**Django User Model:**
- username
- email (unique)
- first_name, last_name
- password (hashed)
- is_active, is_staff, is_superuser
- date_joined, last_login

**Related Models (via OneToOne):**
- UserProfile - Personal info
- UserPreferences - UI settings
- AISettings - AI provider config
- UserSubscription - Subscription status
- ActivityLog - Audit trail
- UserPersonalization - Onboarding data

### Permissions & Authorization

**Django Permission System:**
- Is authenticated required for most endpoints
- Role-based: admin vs regular user
- Object-level permissions via serializers

**API Permission Classes:**
- IsAuthenticated - Default for protected endpoints
- AllowAny - For public endpoints (login, landing)
- IsAdminUser - Admin-only endpoints

**Frontend Protection:**
- ProtectedRoute component checks user role
- Conditional rendering based on user permissions
- API interceptor redirects on 401 Unauthorized

### Token Management

**JWT Configuration:**
- Access token: 5-minute lifetime
- Refresh token: 14-day lifetime
- HttpOnly cookies for security
- CSRF protection enabled

**Token Refresh:**
- Automatic refresh on 401 response
- Manual refresh via dedicated endpoint
- Refresh token rotation

**Logout:**
- Token blacklist via SimpleJWT
- Cookie clearing
- Local state cleanup

---

## 8. KEY INTEGRATIONS

### Gmail Integration
- OAuth 2.0 authentication
- Automatic email sync with incremental history tracking
- Transaction email classification
- Attachment processing
- Pattern learning for auto-categorization

### Splitwise Integration
- OAuth 2.0 authentication
- Bidirectional group sync
- Expense mapping and sync
- Settlement tracking
- Auto-sync on configurable intervals

### Google APIs
- Google OAuth for login
- Gmail API for email access
- (Potentially) Google Sheets API for data export

### Telegram Bot
- Bot setup and token configuration
- Command handling
- Notification sending
- User linking

### AWS S3
- Document storage (optional)
- Fallback to local file storage
- Signed URLs for secure access

---

## 9. CURRENT TECH IMPLEMENTATION NOTES

### Database Design
- PostgreSQL for production (SQLite fallback for dev)
- Foreign key constraints for referential integrity
- Indexed fields for query optimization
- JSONField for flexible metadata storage
- Soft delete pattern for archive without hard deletion

### Caching Strategy
**Multi-layer approach:**
1. **Memory Cache** (in-process, immediate)
   - Reference data loaded on app start
   - Simple memoization for expensive computations

2. **Redis Cache** (distributed, 1-hour TTL)
   - Exchange rates
   - Currency formatting rules
   - Frequently accessed reference data

3. **Browser Cache** (localStorage, 24-hour TTL)
   - Reference data (countries, currencies, languages)
   - User preferences
   - Theme preference

### Background Processing
- Celery for async tasks:
  - Email sync from Gmail
  - Document OCR and parsing
  - Transaction deduplication
  - Report generation
- Redis as message broker
- Celery Beat for scheduled tasks

### File Storage
- Local filesystem (development)
- AWS S3 (production option)
- File hashing for deduplication
- Polymorphic file linking to transactions or groups

### Search & Filtering
- Django filters for API filtering
- DRF OrderingFilter for sorting
- Full-text search ready (indexed fields)

### Error Handling
- Custom exception handler in REST framework
- Structured error responses
- Logging of exceptions for debugging
- User-friendly error messages

---

## ARCHITECTURE SUMMARY

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Pages, Features, Components                     │   │
│  │ Auth, Dashboard, Finance, Settings              │   │
│  └──────────────────┬──────────────────────────────┘   │
│  ┌────────────────  │ ──────────────────────────────┐   │
│  │ Context API    │   React Query    │   Hook Form │   │
│  │ (Auth, Theme,  │   (Server State) │   (Forms)   │   │
│  │  Currency)     │                  │             │   │
│  └──────────────────┴──────────────────────────────┘   │
└──────────────────────┬────────────────────────────────┘
                       │ HTTP/REST
                       │ JWT in HttpOnly Cookies
┌──────────────────────▼────────────────────────────────┐
│              Django REST API Backend                   │
│  ┌───────────────────────────────────────────────┐   │
│  │ finance/          finance_v2/      services/  │   │
│  │ Accounts          Transactions     Email      │   │
│  │ Budgets           Groups           Gmail      │   │
│  │ Goals             Pending Txns     AI         │   │
│  │ Investments       Uploads          Splitwise  │   │
│  │ Tags              OCR              Telegram   │   │
│  └───────────────────┬───────────────────────────┘   │
│                      │                                 │
│  ┌──────────────┬────┴────┬──────────────┐            │
│  │ Celery Tasks │ LLM     │ Django Auth  │            │
│  │ & Scheduler  │Provider │ & Users      │            │
│  └──────────────┴─────────┴──────────────┘            │
└──────────────┬──────────────────┬───────────────────┘
               │                  │
┌──────────────▼────┐  ┌──────────▼────────┐
│   PostgreSQL      │  │   Redis Broker    │
│   (Main Database) │  │   & Cache         │
└───────────────────┘  └───────────────────┘
```

---

## KEY METRICS & SCALABILITY CONSIDERATIONS

### Performance Optimizations Already In Place
- Query optimization with select_related/prefetch_related
- Database indexing on frequently queried fields
- Redis caching for expensive operations
- Async processing with Celery
- Frontend code splitting with Vite
- Lazy loading of features and routes

### Scalability Architecture
- Stateless Django backend (horizontally scalable)
- Distributed task queue (Celery workers)
- Caching layer (Redis)
- Static file CDN ready (S3 support)
- Database connection pooling

### Rate Limiting
- Configurable per endpoint
- Default: 200/min burst, 10000/day sustained
- Custom throttle classes for specific endpoints

---

## DEVELOPMENT & DEPLOYMENT

### Development Environment
```bash
# Backend
python manage.py runserver
celery -A app_settings worker
celery -A app_settings beat

# Frontend
npm run dev
```

### Production Deployment
```bash
# Backend
gunicorn app_settings.wsgi:application
```

### Docker Support
- Dockerfile configured for Django
- Docker Compose for local development (docker-compose.yml)

### Environment Configuration
- .env.template provided
- Settings.py uses python-decouple for env vars
- Production requires: DB credentials, API keys, secret keys

---

## SUMMARY OF WHAT'S IMPLEMENTED

### Complete Features
1. User authentication (Google OAuth)
2. Account management with soft delete
3. Transaction tracking and categorization
4. Multi-currency support with formatting
5. Budget creation and tracking
6. Financial goals management
7. Shared expense groups with settlements
8. Investment portfolio tracking
9. Gmail integration with email parsing
10. Splitwise integration with bidirectional sync
11. File upload with OCR and AI parsing
12. Invoice processing with advanced OCR
13. Bank statement parsing (deterministic and AI)
14. Admin dashboard
15. Comprehensive user settings
16. Internationalization (multiple languages)
17. Onboarding workflow
18. Activity logging and audit trail
19. Export functionality
20. Mobile-responsive design

### AI/ML Capabilities
1. Email classification (transaction/spam/alert/etc)
2. Transaction amount and date extraction from emails
3. Merchant name normalization
4. Account pattern learning
5. Invoice field extraction
6. Text OCR from documents
7. Transaction deduplication
8. AI-powered categorization
9. Report generation
10. Multi-provider LLM support (OpenAI, Anthropic, Ollama)

### Infrastructure
1. PostgreSQL database
2. Redis caching and message broker
3. Celery async task queue
4. Background job scheduling
5. S3 storage support
6. JWT authentication
7. Rate limiting
8. CORS support
9. Error tracking and logging
10. Activity audit trail

---

