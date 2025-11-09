from django.db import models
from django.conf import settings
from django.utils import timezone


class EmailAccountPattern(models.Model):
    """
    Store learned patterns for automatic account linking from emails.
    When a user manually links a transaction to an account, we learn from this
    and automatically apply the same pattern to future similar transactions.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="email_account_patterns",
    )
    account = models.ForeignKey(
        'finance.Account',
        on_delete=models.CASCADE,
        related_name="email_patterns",
    )

    # Pattern matching fields
    sender_email = models.EmailField(null=True, blank=True, help_text="Email sender address")
    sender_domain = models.CharField(max_length=255, null=True, blank=True, help_text="Email domain (e.g., sbi.co.in)")
    merchant_name = models.CharField(max_length=255, null=True, blank=True, help_text="Merchant name pattern")
    institution_name = models.CharField(max_length=255, null=True, blank=True, help_text="Bank/institution name")
    last_digits = models.CharField(max_length=4, null=True, blank=True, help_text="Last 4 digits of account/card")
    upi_id = models.CharField(max_length=255, null=True, blank=True, help_text="UPI identifier")
    wallet_name = models.CharField(max_length=50, null=True, blank=True, help_text="Digital wallet name")

    # Pattern metadata
    confidence_score = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=1.0,
        help_text="Confidence in this pattern (0.0-1.0)"
    )
    usage_count = models.PositiveIntegerField(
        default=1,
        help_text="Number of times this pattern has been successfully used"
    )
    last_used_at = models.DateTimeField(auto_now=True)

    # Store the full pattern info for reference
    pattern_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Full extracted pattern data from the original email"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'sender_domain']),
            models.Index(fields=['user', 'merchant_name']),
            models.Index(fields=['user', 'last_digits']),
            models.Index(fields=['user', 'institution_name']),
            models.Index(fields=['confidence_score']),
        ]
        verbose_name = "Email Account Pattern"
        verbose_name_plural = "Email Account Patterns"

    def __str__(self):
        pattern_parts = []
        if self.sender_domain:
            pattern_parts.append(f"domain:{self.sender_domain}")
        if self.merchant_name:
            pattern_parts.append(f"merchant:{self.merchant_name}")
        if self.last_digits:
            pattern_parts.append(f"digits:{self.last_digits}")
        pattern_str = ", ".join(pattern_parts) if pattern_parts else "pattern"
        return f"{self.account.name} <- {pattern_str}"

    def increment_usage(self):
        """Increment usage count and update confidence"""
        self.usage_count += 1
        # Increase confidence slightly with each use, max 1.0
        self.confidence_score = min(1.0, float(self.confidence_score) + 0.05)
        self.save(update_fields=['usage_count', 'confidence_score', 'last_used_at'])


class GmailAccount(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="gmail_accounts",
        db_index=True
    )
    name = models.CharField(max_length=100, help_text="Display name for this account")
    email = models.EmailField()
    access_token = models.CharField(max_length=500)
    refresh_token = models.CharField(max_length=500, null=True, blank=True)
    expires_at = models.DateTimeField()

    # Simple sync settings
    is_active = models.BooleanField(default=True, db_index=True)
    last_sync_at = models.DateTimeField(null=True, blank=True)
    last_synced_history_id = models.CharField(max_length=255, null=True, blank=True)

    # Transaction tag for emails from this account
    transaction_tag = models.CharField(max_length=50, default="email-import")

    # Simple filters
    sender_filters = models.JSONField(default=list, blank=True)
    keyword_filters = models.JSONField(default=list, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'email']
        verbose_name = "Gmail Account"
        verbose_name_plural = "Gmail Accounts"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["email"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.email})"


class SplitwiseIntegration(models.Model):
    """Store Splitwise OAuth credentials and sync settings for a user"""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="splitwise_integration",
    )

    # OAuth credentials
    access_token = models.CharField(max_length=500)
    token_type = models.CharField(max_length=50, default="Bearer")

    # Splitwise user info
    splitwise_user_id = models.IntegerField(null=True, blank=True)
    splitwise_email = models.EmailField(null=True, blank=True)
    splitwise_first_name = models.CharField(max_length=100, null=True, blank=True)
    splitwise_last_name = models.CharField(max_length=100, null=True, blank=True)

    # Sync settings
    is_active = models.BooleanField(default=True, db_index=True)
    auto_sync_enabled = models.BooleanField(
        default=True,
        help_text="Automatically sync changes bi-directionally",
        db_index=True
    )
    sync_interval_minutes = models.IntegerField(
        default=30,
        help_text="How often to check for updates from Splitwise (in minutes)"
    )

    # Sync state
    last_sync_at = models.DateTimeField(null=True, blank=True)
    last_successful_sync_at = models.DateTimeField(null=True, blank=True)
    sync_status = models.CharField(
        max_length=20,
        choices=[
            ('idle', 'Idle'),
            ('syncing', 'Syncing'),
            ('error', 'Error'),
            ('success', 'Success'),
        ],
        default='idle',
        db_index=True
    )
    last_sync_error = models.TextField(null=True, blank=True)

    # Import settings
    import_existing_groups = models.BooleanField(
        default=True,
        help_text="Import existing Splitwise groups on first sync"
    )
    import_existing_expenses = models.BooleanField(
        default=True,
        help_text="Import existing expenses from Splitwise groups"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Splitwise Integration"
        verbose_name_plural = "Splitwise Integrations"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=["is_active", "auto_sync_enabled"]),
            models.Index(fields=["sync_status", "last_sync_at"]),
        ]

    def __str__(self):
        return f"Splitwise - {self.user.username}"

    def mark_sync_started(self):
        """Mark sync as started"""
        self.sync_status = 'syncing'
        self.last_sync_at = timezone.now()
        self.save(update_fields=['sync_status', 'last_sync_at'])

    def mark_sync_success(self):
        """Mark sync as successful"""
        now = timezone.now()
        self.sync_status = 'success'
        self.last_successful_sync_at = now
        self.last_sync_error = None
        self.save(update_fields=['sync_status', 'last_successful_sync_at', 'last_sync_error'])

    def mark_sync_error(self, error_message):
        """Mark sync as failed with error"""
        self.sync_status = 'error'
        self.last_sync_error = error_message
        self.save(update_fields=['sync_status', 'last_sync_error'])


class SplitwiseGroupMapping(models.Model):
    """Maps our ExpenseGroup to Splitwise groups"""

    integration = models.ForeignKey(
        SplitwiseIntegration,
        on_delete=models.CASCADE,
        related_name="group_mappings",
        db_index=True
    )
    local_group = models.OneToOneField(
        'finance.ExpenseGroup',
        on_delete=models.CASCADE,
        related_name="splitwise_mapping"
    )
    splitwise_group_id = models.IntegerField(db_index=True)
    splitwise_group_name = models.CharField(max_length=255)

    # Sync settings for this specific group
    sync_enabled = models.BooleanField(default=True, db_index=True)
    sync_direction = models.CharField(
        max_length=20,
        choices=[
            ('bidirectional', 'Bi-directional'),
            ('to_splitwise', 'To Splitwise Only'),
            ('from_splitwise', 'From Splitwise Only'),
        ],
        default='bidirectional'
    )

    # Sync state
    last_synced_at = models.DateTimeField(null=True, blank=True)
    last_splitwise_updated_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [
            ['integration', 'splitwise_group_id'],
            ['integration', 'local_group']
        ]
        verbose_name = "Splitwise Group Mapping"
        verbose_name_plural = "Splitwise Group Mappings"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=["integration", "sync_enabled"]),
            models.Index(fields=["splitwise_group_id"]),
        ]

    def __str__(self):
        return f"{self.local_group.name} <-> Splitwise Group {self.splitwise_group_id}"


class SplitwiseExpenseMapping(models.Model):
    """Maps our GroupExpense to Splitwise expenses"""

    group_mapping = models.ForeignKey(
        SplitwiseGroupMapping,
        on_delete=models.CASCADE,
        related_name="expense_mappings",
        db_index=True
    )
    local_expense = models.OneToOneField(
        'finance.GroupExpense',
        on_delete=models.CASCADE,
        related_name="splitwise_mapping"
    )
    splitwise_expense_id = models.IntegerField(db_index=True)

    # Track sync state
    last_synced_at = models.DateTimeField(null=True, blank=True)
    last_splitwise_updated_at = models.DateTimeField(null=True, blank=True)
    sync_status = models.CharField(
        max_length=20,
        choices=[
            ('synced', 'Synced'),
            ('pending', 'Pending Sync'),
            ('error', 'Sync Error'),
        ],
        default='synced',
        db_index=True
    )
    last_sync_error = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [
            ['group_mapping', 'splitwise_expense_id'],
            ['group_mapping', 'local_expense']
        ]
        verbose_name = "Splitwise Expense Mapping"
        verbose_name_plural = "Splitwise Expense Mappings"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=["group_mapping", "sync_status"]),
            models.Index(fields=["splitwise_expense_id"]),
        ]

    def __str__(self):
        return f"{self.local_expense.title} <-> Splitwise Expense {self.splitwise_expense_id}"


class SplitwiseSyncLog(models.Model):
    """Log of all sync operations for debugging and history"""

    integration = models.ForeignKey(
        SplitwiseIntegration,
        on_delete=models.CASCADE,
        related_name="sync_logs",
        db_index=True
    )

    sync_type = models.CharField(
        max_length=20,
        choices=[
            ('full_import', 'Full Import'),
            ('incremental', 'Incremental Sync'),
            ('push', 'Push to Splitwise'),
            ('pull', 'Pull from Splitwise'),
        ],
        db_index=True
    )

    status = models.CharField(
        max_length=20,
        choices=[
            ('started', 'Started'),
            ('success', 'Success'),
            ('partial', 'Partial Success'),
            ('error', 'Error'),
        ],
        db_index=True
    )

    # Statistics
    groups_synced = models.IntegerField(default=0)
    expenses_synced = models.IntegerField(default=0)
    groups_created = models.IntegerField(default=0)
    expenses_created = models.IntegerField(default=0)
    groups_updated = models.IntegerField(default=0)
    expenses_updated = models.IntegerField(default=0)
    errors_count = models.IntegerField(default=0)

    # Details
    error_message = models.TextField(null=True, blank=True)
    details = models.JSONField(default=dict, blank=True)

    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-started_at']
        verbose_name = "Splitwise Sync Log"
        verbose_name_plural = "Splitwise Sync Logs"
        indexes = [
            models.Index(fields=["integration", "status"]),
            models.Index(fields=["sync_type", "started_at"]),
            models.Index(fields=["status", "started_at"]),
        ]

    def __str__(self):
        return f"{self.sync_type} - {self.status} ({self.started_at})"

    def mark_completed(self, status='success'):
        """Mark the sync log as completed"""
        self.status = status
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'completed_at'])