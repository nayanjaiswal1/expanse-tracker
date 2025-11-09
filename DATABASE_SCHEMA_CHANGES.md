# 🗄️ Database Schema Changes - Detailed Specification

## Overview

This document provides a detailed breakdown of all database changes required for the AI-Driven Expense Tracker enhancement project.

---

## 📋 Summary of Changes

| Change Type | Count | Impact Level |
|-------------|-------|--------------|
| New Tables | 7 | High |
| Modified Tables | 6 | Medium |
| New Indexes | 12+ | Medium |
| New Foreign Keys | 15+ | Medium |
| Migration Complexity | N/A | High |

**Estimated Migration Time**: ~5-10 minutes (depending on data volume)

**Risk Level**: Medium (requires careful sequencing)

---

## 🆕 NEW TABLES

### 1. ChatMessage

**Purpose**: Store chat-based transaction entry messages and their processing state.

**App**: `finance_v2`

```python
class ChatMessage(models.Model):
    """
    Stores messages from the WhatsApp-style chat interface for quick transaction entry.
    Links messages to their resulting transactions and tracks processing status.
    """

    # Relationships
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='chat_messages'
    )
    related_transaction = models.ForeignKey(
        'Transaction',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='chat_messages'
    )
    related_file = models.ForeignKey(
        'UploadedFile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='chat_messages'
    )

    # Core fields
    conversation_id = models.CharField(
        max_length=255,
        db_index=True,
        help_text="Groups messages into conversations (e.g., 'main', 'budget-planning')"
    )
    message_type = models.CharField(
        max_length=20,
        choices=[
            ('user', 'User Message'),
            ('system', 'System Response'),
            ('suggestion', 'Transaction Suggestion'),
        ],
        default='user'
    )
    content = models.TextField(
        help_text="The actual message text"
    )
    metadata = models.JSONField(
        default=dict,
        help_text="Stores parsed data, attachments, mentions, AI confidence scores"
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ('draft', 'Draft'),
            ('processing', 'Processing'),
            ('completed', 'Completed'),
            ('failed', 'Failed'),
        ],
        default='draft'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'finance_chat_messages'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'conversation_id', 'created_at']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.conversation_id} - {self.created_at}"
```

**Sample Data**:
```json
{
  "user_id": 1,
  "conversation_id": "main",
  "message_type": "user",
  "content": "@john $50 lunch at pizza place",
  "metadata": {
    "mentions": [{"type": "user", "user_id": 5, "text": "@john"}],
    "parsed": {
      "amount": 50,
      "currency": "USD",
      "description": "lunch at pizza place",
      "category": "dining"
    },
    "confidence": 0.95
  },
  "status": "completed",
  "related_transaction_id": 123
}
```

**Estimated Rows**: 10,000+ per month per active user

---

### 2. StatementPassword

**Purpose**: Securely store passwords for password-protected bank statements.

**App**: `finance_v2`

```python
from cryptography.fernet import Fernet
from django.conf import settings

class StatementPassword(models.Model):
    """
    Stores encrypted passwords for unlocking password-protected PDF statements.
    Supports account-specific and pattern-based password matching.
    """

    # Relationships
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='statement_passwords'
    )
    account = models.ForeignKey(
        'Account',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='statement_passwords',
        help_text="Optional: Link password to specific account"
    )

    # Password storage (encrypted with Fernet)
    encrypted_password = models.BinaryField(
        help_text="Password encrypted using Fernet symmetric encryption"
    )
    password_hint = models.CharField(
        max_length=255,
        blank=True,
        help_text="User-provided hint (not the actual password)"
    )

    # Pattern matching
    file_pattern = models.CharField(
        max_length=255,
        blank=True,
        help_text="Regex pattern for filename matching (e.g., 'hdfc_.*\\.pdf')"
    )

    # Usage tracking
    is_default = models.BooleanField(
        default=False,
        help_text="Default password to try first for this account"
    )
    last_used = models.DateTimeField(null=True, blank=True)
    success_count = models.IntegerField(
        default=0,
        help_text="Number of times this password worked"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'finance_statement_passwords'
        ordering = ['-is_default', '-success_count', '-last_used']
        indexes = [
            models.Index(fields=['user', 'account']),
            models.Index(fields=['user', 'is_default']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'account', 'is_default'],
                condition=models.Q(is_default=True),
                name='unique_default_per_account'
            )
        ]

    def set_password(self, plain_password: str):
        """Encrypt and store password"""
        cipher = Fernet(settings.STATEMENT_PASSWORD_KEY)
        self.encrypted_password = cipher.encrypt(plain_password.encode())

    def get_password(self) -> str:
        """Decrypt and return password"""
        cipher = Fernet(settings.STATEMENT_PASSWORD_KEY)
        return cipher.decrypt(self.encrypted_password).decode()

    def __str__(self):
        return f"{self.user.email} - {self.account or 'Global'} - {self.password_hint}"
```

**Settings Update Required**:
```python
# settings.py
STATEMENT_PASSWORD_KEY = os.environ.get('STATEMENT_PASSWORD_KEY', Fernet.generate_key())
```

**Sample Data**:
```python
password = StatementPassword.objects.create(
    user=user,
    account=hdfc_account,
    password_hint="Date of birth",
    file_pattern=r"hdfc_.*\.pdf",
    is_default=True
)
password.set_password("01011990")
```

**Estimated Rows**: 5-10 per user

---

### 3. StatementProcessingLog

**Purpose**: Comprehensive audit trail for statement processing pipeline.

**App**: `finance_v2`

```python
class StatementProcessingLog(models.Model):
    """
    Tracks every stage of statement file processing for debugging and audit purposes.
    Enables side-by-side comparison of raw vs parsed data.
    """

    # Relationships
    uploaded_file = models.ForeignKey(
        'UploadedFile',
        on_delete=models.CASCADE,
        related_name='processing_logs'
    )

    # Processing details
    processing_stage = models.CharField(
        max_length=30,
        choices=[
            ('upload', 'File Upload'),
            ('password_decrypt', 'Password Decryption'),
            ('text_extraction', 'Text Extraction'),
            ('parse_attempt', 'Parse Attempt'),
            ('ai_parse', 'AI Parsing'),
            ('validation', 'Data Validation'),
            ('deduplication', 'Duplicate Detection'),
            ('transaction_creation', 'Transaction Creation'),
            ('completion', 'Process Completion'),
        ]
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('running', 'Running'),
            ('success', 'Success'),
            ('failed', 'Failed'),
            ('skipped', 'Skipped'),
        ],
        default='pending'
    )

    # Parser information
    parser_type = models.CharField(
        max_length=20,
        choices=[
            ('system', 'System Parser'),
            ('ai', 'AI Parser'),
            ('hybrid', 'Hybrid'),
        ],
        blank=True
    )
    ai_provider = models.CharField(
        max_length=50,
        blank=True,
        help_text="e.g., 'openai', 'claude', 'gemini'"
    )

    # Results and metrics
    details = models.JSONField(
        default=dict,
        help_text="Parser output, extracted data, errors, confidence scores, etc."
    )
    execution_time_ms = models.IntegerField(
        null=True,
        help_text="Execution time in milliseconds"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'finance_statement_processing_logs'
        ordering = ['uploaded_file', 'created_at']
        indexes = [
            models.Index(fields=['uploaded_file', 'processing_stage']),
            models.Index(fields=['uploaded_file', 'status']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.uploaded_file.filename} - {self.processing_stage} - {self.status}"
```

**Sample Data**:
```json
{
  "uploaded_file_id": 456,
  "processing_stage": "ai_parse",
  "status": "success",
  "parser_type": "ai",
  "ai_provider": "claude",
  "details": {
    "transactions_found": 15,
    "confidence_avg": 0.92,
    "parsing_method": "anthropic_claude_3_5_sonnet",
    "raw_response": "...",
    "extracted_data": [...]
  },
  "execution_time_ms": 3450
}
```

**Estimated Rows**: 5-10 logs per uploaded statement

---

### 4. TransactionMention

**Purpose**: Track @ mentions in chat-based transaction entry.

**App**: `finance_v2`

```python
class TransactionMention(models.Model):
    """
    Records @ mentions in transactions created via chat interface.
    Enables quick user/group/category linking with autocomplete.
    """

    # Relationships
    transaction = models.ForeignKey(
        'Transaction',
        on_delete=models.CASCADE,
        related_name='mentions'
    )
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='mentions_created'
    )

    # Mention type and targets
    mention_type = models.CharField(
        max_length=20,
        choices=[
            ('user', 'User Mention'),
            ('group', 'Group Mention'),
            ('category', 'Category Mention'),
            ('tag', 'Tag Mention'),
        ]
    )
    mentioned_user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='transaction_mentions'
    )
    mentioned_group = models.ForeignKey(
        'Group',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='transaction_mentions'
    )
    mentioned_text = models.CharField(
        max_length=100,
        help_text="Original mention text (e.g., '@john')"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'finance_transaction_mentions'
        ordering = ['transaction', 'created_at']
        indexes = [
            models.Index(fields=['transaction']),
            models.Index(fields=['mention_type', 'mentioned_user']),
            models.Index(fields=['mention_type', 'mentioned_group']),
        ]

    def __str__(self):
        return f"{self.mentioned_text} in Transaction #{self.transaction_id}"
```

**Sample Data**:
```python
TransactionMention.objects.create(
    transaction=transaction,
    created_by=current_user,
    mention_type='user',
    mentioned_user=john,
    mentioned_text='@john'
)
```

**Estimated Rows**: 1-3 per chat-created transaction

---

### 5. BudgetTemplate

**Purpose**: Reusable budget templates for quick budget creation.

**App**: `finance`

```python
class BudgetTemplate(models.Model):
    """
    Predefined and user-created budget templates with category allocations.
    Supports AI-suggested templates and system-provided defaults.
    """

    # Ownership
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    is_system = models.BooleanField(
        default=False,
        help_text="True for system-provided templates, False for user-created"
    )
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='budget_templates',
        help_text="Null for system templates"
    )

    # Template data
    category_allocations = models.JSONField(
        help_text="Category ID to percentage/amount mapping"
    )
    target_income_range = models.JSONField(
        default=dict,
        help_text="{'min': 50000, 'max': 100000, 'currency': 'USD'}"
    )
    location_tags = models.JSONField(
        default=list,
        help_text="Tags like ['urban', 'high_cost', 'tech_professional']"
    )

    # Metadata
    usage_count = models.IntegerField(
        default=0,
        help_text="How many times this template has been used"
    )
    is_active = models.BooleanField(default=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'finance_budget_templates'
        ordering = ['-is_system', '-usage_count', 'name']
        indexes = [
            models.Index(fields=['is_system', 'is_active']),
            models.Index(fields=['created_by']),
            models.Index(fields=['-usage_count']),
        ]

    def __str__(self):
        return f"{'[System] ' if self.is_system else ''}{self.name}"
```

**Sample System Template**:
```json
{
  "name": "Urban Professional (50-75k/year)",
  "description": "Budget template for urban professionals earning $50k-75k annually",
  "is_system": true,
  "category_allocations": {
    "1": {"name": "Housing", "percentage": 30},
    "2": {"name": "Transportation", "percentage": 15},
    "3": {"name": "Food", "percentage": 12},
    "4": {"name": "Utilities", "percentage": 8},
    "5": {"name": "Healthcare", "percentage": 10},
    "6": {"name": "Savings", "percentage": 15},
    "7": {"name": "Entertainment", "percentage": 5},
    "8": {"name": "Other", "percentage": 5}
  },
  "target_income_range": {"min": 50000, "max": 75000, "currency": "USD"},
  "location_tags": ["urban", "mid_cost", "professional"]
}
```

**Estimated Rows**: 10-20 system templates + user templates

---

### 6. StatementMerge

**Purpose**: Track duplicate statement detection and merge operations.

**App**: `finance_v2`

```python
class StatementMerge(models.Model):
    """
    Tracks detected duplicate statements and their merge status.
    Helps prevent duplicate transactions from multiple statement uploads.
    """

    # Relationships
    primary_file = models.ForeignKey(
        'UploadedFile',
        on_delete=models.CASCADE,
        related_name='merge_as_primary'
    )
    duplicate_files = models.ManyToManyField(
        'UploadedFile',
        related_name='merge_as_duplicate',
        help_text="Files identified as duplicates"
    )
    merged_by = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='statement_merges'
    )

    # Merge configuration
    merge_strategy = models.CharField(
        max_length=20,
        choices=[
            ('keep_primary', 'Keep Primary Only'),
            ('merge_all', 'Merge All Transactions'),
            ('manual', 'Manual Review'),
        ],
        default='manual'
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ('suggested', 'Suggested by System'),
            ('approved', 'Approved by User'),
            ('rejected', 'Rejected by User'),
            ('completed', 'Merge Completed'),
        ],
        default='suggested'
    )

    # Metrics
    similarity_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text="0-100 similarity score"
    )

    # Timestamps
    merged_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'finance_statement_merges'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['primary_file', 'status']),
            models.Index(fields=['merged_by', 'status']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"Merge: {self.primary_file.filename} ({self.status})"
```

**Sample Data**:
```python
merge = StatementMerge.objects.create(
    primary_file=statement1,
    merged_by=user,
    merge_strategy='keep_primary',
    status='suggested',
    similarity_score=95.5
)
merge.duplicate_files.add(statement2, statement3)
```

**Estimated Rows**: 1-5 per user per month

---

### 7. Notion Table (Keep Existing)

**Note**: Per requirements, the existing Notion table integration should be preserved. No changes needed.

---

## ✏️ MODIFIED TABLES

### 1. Transaction (finance_v2.Transaction)

**Changes**: Add expense classification and chat integration.

```python
# NEW FIELDS TO ADD:

expense_classification = models.CharField(
    max_length=20,
    choices=[
        ('regular_monthly', 'Regular Monthly Expense'),
        ('charity', 'Charity Donation'),
        ('family_support', 'Family Support'),
        ('reimbursable', 'Reimbursable Expense'),
        ('one_time', 'One-time Purchase'),
        ('irregular', 'Irregular Expense'),
    ],
    default='regular_monthly',
    db_index=True
)

exclude_from_totals = models.BooleanField(
    default=False,
    help_text="Auto-calculated based on classification; if True, excluded from regular expense totals"
)

chat_message = models.ForeignKey(
    'ChatMessage',
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name='resulting_transactions',
    help_text="Link to the chat message that created this transaction"
)
```

**Migration**:
```python
# 0XXX_add_expense_classification.py
operations = [
    migrations.AddField(
        model_name='transaction',
        name='expense_classification',
        field=models.CharField(
            max_length=20,
            choices=[...],
            default='regular_monthly'
        ),
    ),
    migrations.AddField(
        model_name='transaction',
        name='exclude_from_totals',
        field=models.BooleanField(default=False),
    ),
    migrations.AddField(
        model_name='transaction',
        name='chat_message',
        field=models.ForeignKey(
            to='finance_v2.ChatMessage',
            on_delete=models.SET_NULL,
            null=True,
            blank=True
        ),
    ),
    migrations.AddIndex(
        model_name='transaction',
        index=models.Index(fields=['expense_classification']),
    ),
]
```

**Impact**: ~100,000+ existing rows (default values applied)

---

### 2. TransactionSplit (finance_v2.TransactionSplit)

**Changes**: Add flexible split methods and multi-currency support.

```python
# NEW FIELDS TO ADD:

split_method = models.CharField(
    max_length=20,
    choices=[
        ('equal', 'Equal Split'),
        ('percentage', 'Percentage-based'),
        ('custom_amount', 'Custom Amount'),
        ('shares', 'Share-based'),
    ],
    default='equal',
    help_text="Method used to calculate this split"
)

split_value = models.DecimalField(
    max_digits=12,
    decimal_places=4,
    default=0,
    help_text="Stores percentage (e.g., 33.33) or shares (e.g., 2)"
)

currency = models.ForeignKey(
    'reference.CurrencyInfo',
    on_delete=models.PROTECT,
    null=True,
    blank=True,
    help_text="Currency for this split (supports multi-currency groups)"
)
```

**Migration**:
```python
# 0XXX_add_flexible_splits.py
operations = [
    migrations.AddField(
        model_name='transactionsplit',
        name='split_method',
        field=models.CharField(max_length=20, default='equal'),
    ),
    migrations.AddField(
        model_name='transactionsplit',
        name='split_value',
        field=models.DecimalField(max_digits=12, decimal_places=4, default=0),
    ),
    migrations.AddField(
        model_name='transactionsplit',
        name='currency',
        field=models.ForeignKey(
            to='reference.CurrencyInfo',
            on_delete=models.PROTECT,
            null=True
        ),
    ),
]
```

**Impact**: ~50,000+ existing rows (equal split assumed)

---

### 3. UploadedFile (finance_v2.UploadedFile)

**Changes**: Enhanced statement management features.

```python
# NEW FIELDS TO ADD:

is_password_protected = models.BooleanField(
    default=False,
    help_text="Whether this file required a password to open"
)

used_password = models.ForeignKey(
    'StatementPassword',
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name='unlocked_files',
    help_text="Password that successfully unlocked this file"
)

raw_text_extracted = models.TextField(
    blank=True,
    help_text="Raw text extracted from file (for comparison view)"
)

parsed_json = models.JSONField(
    null=True,
    blank=True,
    help_text="Structured parsed data (for comparison view)"
)

duplicate_of = models.ForeignKey(
    'self',
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name='duplicates',
    help_text="Original file if this is a duplicate"
)

duplicate_confidence = models.DecimalField(
    max_digits=5,
    decimal_places=2,
    null=True,
    blank=True,
    help_text="Confidence score (0-100) for duplicate detection"
)

processing_version = models.CharField(
    max_length=20,
    default='1.0',
    help_text="Version of parser used (for debugging)"
)
```

**Migration**:
```python
# 0XXX_enhance_uploaded_files.py
operations = [
    migrations.AddField(
        model_name='uploadedfile',
        name='is_password_protected',
        field=models.BooleanField(default=False),
    ),
    # ... (add all other fields)
    migrations.AddIndex(
        model_name='uploadedfile',
        index=models.Index(fields=['duplicate_of']),
    ),
]
```

**Impact**: ~10,000+ existing files (nullable/default values)

---

### 4. Budget (finance.Budget)

**Changes**: Support templates and AI generation.

```python
# NEW FIELDS TO ADD:

budget_type = models.CharField(
    max_length=20,
    choices=[
        ('manual', 'Manual Entry'),
        ('template', 'From Template'),
        ('ai_suggested', 'AI Suggested'),
    ],
    default='manual',
    help_text="Source of this budget"
)

category_allocations = models.JSONField(
    default=dict,
    help_text="Category-wise allocation: {category_id: {amount: 500, percentage: 25}}"
)

template_source = models.CharField(
    max_length=100,
    blank=True,
    help_text="Template name if budget_type='template'"
)

ai_generation_context = models.JSONField(
    null=True,
    blank=True,
    help_text="Stores AI prompt and response for auditing"
)
```

**Migration**:
```python
# 0XXX_add_budget_templates.py
operations = [
    migrations.AddField(
        model_name='budget',
        name='budget_type',
        field=models.CharField(max_length=20, default='manual'),
    ),
    migrations.AddField(
        model_name='budget',
        name='category_allocations',
        field=models.JSONField(default=dict),
    ),
    migrations.AddField(
        model_name='budget',
        name='template_source',
        field=models.CharField(max_length=100, blank=True),
    ),
    migrations.AddField(
        model_name='budget',
        name='ai_generation_context',
        field=models.JSONField(null=True, blank=True),
    ),
]
```

**Impact**: ~1,000+ existing budgets

---

### 5. AISettings (users.AISettings)

**Changes**: Add Gemini support and API testing.

```python
# NEW FIELDS TO ADD:

gemini_api_key = models.BinaryField(
    null=True,
    blank=True,
    help_text="Encrypted Google Gemini API key"
)

gemini_model = models.CharField(
    max_length=100,
    default='gemini-pro',
    help_text="Gemini model to use"
)

active_parser_provider = models.CharField(
    max_length=20,
    choices=[
        ('system', 'System Parser'),
        ('openai', 'OpenAI'),
        ('claude', 'Anthropic Claude'),
        ('gemini', 'Google Gemini'),
    ],
    default='system'
)

api_key_last_tested = models.DateTimeField(
    null=True,
    blank=True,
    help_text="Last time API keys were tested"
)

api_key_test_status = models.JSONField(
    default=dict,
    help_text="Status per provider: {'openai': 'success', 'claude': 'failed'}"
)
```

**Migration**:
```python
# 0XXX_add_gemini_and_testing.py
operations = [
    migrations.AddField(
        model_name='aisettings',
        name='gemini_api_key',
        field=models.BinaryField(null=True, blank=True),
    ),
    # ... (add other fields)
]
```

**Impact**: One row per user (~1,000+ users)

---

### 6. UserPreferences (users.UserPreferences)

**Changes**: UI preferences for new features.

```python
# NEW FIELDS TO ADD:

sidebar_collapsed = models.BooleanField(
    default=False,
    help_text="Whether sidebar is collapsed by default"
)

quick_add_mode = models.CharField(
    max_length=20,
    choices=[
        ('normal', 'Normal - Full parsing'),
        ('ai', 'AI Mode - Enhanced understanding'),
        ('shortcut', 'Shortcut Mode - @person $amount format'),
    ],
    default='normal'
)

default_chat_parser = models.CharField(
    max_length=20,
    choices=[
        ('system', 'System'),
        ('ai', 'AI'),
    ],
    default='ai'
)
```

**Migration**:
```python
# 0XXX_add_ui_preferences.py
operations = [
    migrations.AddField(
        model_name='userpreferences',
        name='sidebar_collapsed',
        field=models.BooleanField(default=False),
    ),
    # ... (add other fields)
]
```

**Impact**: One row per user

---

## 📊 INDEX STRATEGY

### New Composite Indexes

```python
# Transaction - Dashboard filtering
models.Index(fields=['user', 'date', 'expense_classification'])
models.Index(fields=['user', 'account', 'date'])
models.Index(fields=['user', 'exclude_from_totals', 'date'])

# ChatMessage - Conversation loading
models.Index(fields=['user', 'conversation_id', '-created_at'])
models.Index(fields=['user', 'status', '-created_at'])

# StatementProcessingLog - Debugging
models.Index(fields=['uploaded_file', 'processing_stage', 'status'])
models.Index(fields=['uploaded_file', '-created_at'])

# TransactionMention - Quick lookups
models.Index(fields=['mention_type', 'mentioned_user'])
models.Index(fields=['mention_type', 'mentioned_group'])
models.Index(fields=['transaction', 'mention_type'])

# BudgetTemplate - Search
models.Index(fields=['is_system', 'is_active', '-usage_count'])
models.Index(fields=['created_by', 'is_active'])

# StatementMerge - Duplicate management
models.Index(fields=['primary_file', 'status'])
models.Index(fields=['merged_by', '-created_at'])
models.Index(fields=['status', '-similarity_score'])
```

**Total New Indexes**: ~20

**Performance Impact**: 5-10% slower writes, 30-50% faster reads

---

## 🔄 MIGRATION SEQUENCING

### Step 1: Create Independent Tables (No FKs)
```bash
python manage.py makemigrations
# Creates: BudgetTemplate (no FK dependencies)
```

### Step 2: Add FK Dependencies - Phase 1
```bash
python manage.py makemigrations
# Creates: ChatMessage, StatementPassword, StatementProcessingLog, TransactionMention
```

### Step 3: Modify Existing Tables
```bash
python manage.py makemigrations
# Modifies: Transaction, TransactionSplit, UploadedFile, Budget, AISettings, UserPreferences
```

### Step 4: Create Tables with Self-FKs
```bash
python manage.py makemigrations
# Creates: StatementMerge (has ManyToMany to UploadedFile)
```

### Step 5: Add Indexes
```bash
python manage.py makemigrations
# Adds all composite indexes
```

### Step 6: Data Migrations
```bash
python manage.py makemigrations --empty finance_v2 --name populate_defaults
# Populate default values for new fields on existing records
```

**Total Migration Files**: ~8-10

**Downtime Required**: None (all migrations are backward-compatible)

---

## 🔐 SECURITY CONSIDERATIONS

### Encrypted Fields

1. **StatementPassword.encrypted_password**
   - Encryption: Fernet symmetric encryption
   - Key storage: Environment variable `STATEMENT_PASSWORD_KEY`
   - Key rotation: Supported via migration script

2. **AISettings.gemini_api_key**
   - Same encryption as existing API keys
   - Uses existing `encrypt_api_key()` utility

### Access Control

All new models enforce row-level security:
```python
# Example: Only show user's own data
ChatMessage.objects.filter(user=request.user)
StatementPassword.objects.filter(user=request.user)
```

### Audit Trail

- `StatementProcessingLog`: Full audit of file processing
- `StatementMerge`: Track who approved/rejected merges
- `TransactionMention`: Track who mentioned whom

---

## 📈 SCALABILITY CONSIDERATIONS

### Expected Growth

| Table | Initial Rows | Monthly Growth | 1 Year Projection |
|-------|--------------|----------------|-------------------|
| ChatMessage | 1,000 | +50,000 | 600,000 |
| Transaction | 100,000 | +20,000 | 340,000 |
| TransactionMention | 500 | +5,000 | 60,500 |
| StatementProcessingLog | 5,000 | +2,000 | 29,000 |
| StatementPassword | 100 | +50 | 700 |
| BudgetTemplate | 20 | +10 | 140 |
| StatementMerge | 50 | +100 | 1,250 |

**Database Size Impact**: +500MB - 1GB in first year

### Performance Optimization

1. **Partitioning** (if needed after 1M+ rows):
   - Partition `ChatMessage` by month
   - Partition `Transaction` by year

2. **Archival Strategy**:
   - Archive chat messages older than 6 months
   - Archive processing logs older than 1 year
   - Keep transaction data indefinitely

3. **Query Optimization**:
   - Use `select_related()` for FK lookups
   - Use `prefetch_related()` for M2M lookups
   - Add database-level caching (Redis)

---

## ✅ VALIDATION CHECKLIST

Before deploying migrations:

- [ ] All migration files created and reviewed
- [ ] Migration sequence tested in development
- [ ] Rollback scripts prepared
- [ ] Database backup created
- [ ] Indexes added to all foreign keys
- [ ] Encryption keys generated and stored securely
- [ ] Default values set for new fields
- [ ] Documentation updated
- [ ] API serializers updated for new fields
- [ ] Frontend TypeScript types updated

---

## 🎯 NEXT STEPS

1. **Generate migrations**: `python manage.py makemigrations`
2. **Review SQL**: `python manage.py sqlmigrate finance_v2 XXXX`
3. **Test in development**: `python manage.py migrate`
4. **Create seed data**: Populate sample templates, test data
5. **Deploy to staging**: Test with production-like data volume
6. **Monitor performance**: Check query times, index usage
7. **Deploy to production**: Apply migrations during low-traffic window

---

**Document Version**: 1.0
**Last Updated**: 2025-11-09
**Status**: Ready for Implementation Review