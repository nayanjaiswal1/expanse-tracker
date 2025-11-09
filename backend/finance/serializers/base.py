"""
Finance app serializers for financial models.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from finance.models import (
    Investment,
    Goal,
    GoalImage,
    GroupExpense,
    GroupExpenseShare,
    Account,
    BalanceRecord,
    Category,
    Tag,
    Transaction,
    TransactionGroup,
    TransactionDetail,
    TransactionDocument,
    ExpenseGroup,
    ExpenseGroupMembership,
    Budget,
    BudgetCategory,
    BudgetTemplate,
    BudgetTemplateCategory,
    UploadSession,
    StatementImport,
    TransactionImport,
    TransactionLink,
    MerchantPattern,
    AccountPdfPassword,
    FinanceAssistantConversation,
    FinanceAssistantMessage,
)


class TagNameField(serializers.ListField):
    """Custom field to handle tag names for taggable models."""

    def __init__(self, **kwargs):
        kwargs.setdefault("child", serializers.CharField(max_length=50))
        kwargs.setdefault("required", False)
        super().__init__(**kwargs)

    def get_attribute(self, instance):
        """Return the object itself so we can access mixin helpers."""
        return instance

    def to_representation(self, instance):
        if instance is None:
            return []
        if hasattr(instance, "tag_names"):
            return list(instance.tag_names)
        if hasattr(instance, "tag_links"):
            assignments = instance.tag_links.select_related("tag")
            return [assignment.tag.name for assignment in assignments if assignment.tag_id]
        return []

    def to_internal_value(self, data):
        if data is None:
            return []
        if not isinstance(data, list):
            raise serializers.ValidationError("Expected a list of tag names")

        context = getattr(self, "context", {}) or {}
        request = context.get("request")
        user = getattr(request, "user", None) if request else None
        if user is None or not getattr(user, "is_authenticated", False):
            user = context.get("user")
        if user is None or not getattr(user, "is_authenticated", False):
            raise serializers.ValidationError("Authenticated user required to manage tags")

        from .models.tagging import Tag

        tag_objects = []
        seen = set()
        for raw_name in data:
            if not isinstance(raw_name, str):
                raise serializers.ValidationError(f"Expected string, got {type(raw_name)}")

            name = raw_name.strip()
            if not name or name in seen:
                continue

            tag, _ = Tag.objects.get_or_create(
                user=user,
                name=name,
                defaults={"color": Tag.DEFAULT_COLOR},
            )
            tag_objects.append(tag)
            seen.add(name)

        return tag_objects

from users.serializers import UserSerializer

User = get_user_model()


class TransactionGroupSerializer(serializers.ModelSerializer):
    """Serializer for TransactionGroup - Unified entity management"""

    # Computed fields
    transaction_summary = serializers.SerializerMethodField()

    class Meta:
        model = TransactionGroup
        fields = [
            'id',
            'name',
            'group_type',
            'description',
            'is_active',
            # Cached statistics
            'total_transactions',
            'total_spent',
            'total_received',
            'last_transaction_date',
            # Metadata and visual
            'metadata',
            'logo_url',
            'color',
            # Computed
            'transaction_summary',
            # Timestamps
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'total_transactions',
            'total_spent',
            'total_received',
            'last_transaction_date',
            'created_at',
            'updated_at',
        ]

    def get_transaction_summary(self, obj):
        """Get transaction summary if requested"""
        request = self.context.get('request')
        if request and request.query_params.get('include_summary'):
            return obj.get_transaction_summary()
        return None


class TransactionDetailSerializer(serializers.ModelSerializer):
    """Serializer for TransactionDetail - Flexible transaction details"""

    category_name = serializers.CharField(source='category.name', read_only=True)
    detail_type_display = serializers.CharField(source='get_detail_type_display', read_only=True)
    calculated_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = TransactionDetail
        fields = [
            'id',
            'transaction',
            'detail_type',
            'detail_type_display',
            # Common fields
            'name',
            'description',
            'amount',
            'category',
            'category_name',
            # Quantity fields
            'quantity',
            'unit_price',
            'calculated_amount',
            # Additional fields
            'metadata',
            'verified',
            'notes',
            # Timestamps
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, data):
        """Validate detail based on type"""
        detail_type = data.get('detail_type')

        # Investment details need quantity and unit_price
        if detail_type == 'investment_detail':
            if not data.get('quantity') or not data.get('unit_price'):
                raise serializers.ValidationError({
                    'quantity': 'Investment details require quantity and unit_price',
                    'unit_price': 'Investment details require quantity and unit_price'
                })

        # Lending terms need due_date and interest_rate in metadata
        if detail_type == 'lending_terms':
            metadata = data.get('metadata', {})
            if 'due_date' not in metadata or 'interest_rate' not in metadata:
                raise serializers.ValidationError({
                    'metadata': 'Lending terms require due_date and interest_rate in metadata'
                })

        return data


class ExpenseGroupMembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source="user", write_only=True
    )

    class Meta:
        model = ExpenseGroupMembership
        fields = ["id", "user", "user_id", "role", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]


class ExpenseGroupSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    members = ExpenseGroupMembershipSerializer(
        source="memberships", many=True, read_only=True
    )

    # Transaction group link
    transaction_group = TransactionGroupSerializer(read_only=True)
    transaction_group_id = serializers.PrimaryKeyRelatedField(
        queryset=TransactionGroup.objects.all(),
        source='transaction_group',
        write_only=True,
        required=False,
        allow_null=True
    )

    budget_status = serializers.SerializerMethodField()
    per_person_spending = serializers.SerializerMethodField()

    class Meta:
        model = ExpenseGroup
        fields = [
            "id",
            "name",
            "description",
            "owner",
            "group_type",
            "is_active",
            "purpose",
            # Transaction group link
            "transaction_group",
            "transaction_group_id",
            # Budget fields
            "budget_limit",
            "budget_warning_threshold",
            "budget_per_person_limit",
            "budget_status",
            "per_person_spending",
            # Members
            "members",
            "member_history",
            # Timestamps
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["owner", "created_at", "updated_at", "member_history"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Filter transaction_group queryset by user if request is available
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            self.fields['transaction_group_id'].queryset = TransactionGroup.objects.filter(user=request.user)

    def get_budget_status(self, obj):
        """Get budget status with spending info"""
        return obj.get_budget_status()

    def get_per_person_spending(self, obj):
        """Get per-person spending data"""
        if not obj.budget_per_person_limit:
            return None

        spending_data = obj.get_per_person_spending()

        # Convert to serializable format
        result = []
        for user_id, data in spending_data.items():
            result.append({
                'user_id': user_id,
                'username': data['user'].username,
                'total_paid': str(data['total_paid']),
                'is_over_limit': data['is_over_limit'],
                'percentage_of_limit': str(data['percentage_of_limit']) if data['percentage_of_limit'] is not None else None
            })

        return result

    def validate_budget_warning_threshold(self, value):
        """Validate budget warning threshold is between 0 and 100"""
        if value < 0 or value > 100:
            raise serializers.ValidationError(
                "Budget warning threshold must be between 0 and 100 percent"
            )
        return value

    def validate(self, data):
        """Validate budget fields"""
        budget_limit = data.get('budget_limit')
        per_person_limit = data.get('budget_per_person_limit')

        # If both limits are set, per-person should be less than total
        if budget_limit and per_person_limit:
            if per_person_limit > budget_limit:
                raise serializers.ValidationError({
                    'budget_per_person_limit': 'Per-person limit cannot exceed total budget limit'
                })

        return data

    def create(self, validated_data):
        """Create expense group and optionally link transaction group"""
        expense_group = super().create(validated_data)

        # If no transaction_group provided, create one automatically
        if not expense_group.transaction_group:
            transaction_group = TransactionGroup.objects.create(
                user=expense_group.owner,
                name=expense_group.name,
                group_type='expense_group',
                description=expense_group.description or '',
            )
            expense_group.transaction_group = transaction_group
            expense_group.save(update_fields=['transaction_group'])

        return expense_group


class InvestmentSerializer(serializers.ModelSerializer):
    """Serializer for Investment model"""

    current_quantity = serializers.ReadOnlyField()
    current_value = serializers.ReadOnlyField()
    total_invested = serializers.ReadOnlyField()
    total_gain_loss = serializers.ReadOnlyField()
    total_gain_loss_percentage = serializers.ReadOnlyField()

    class Meta:
        model = Investment
        fields = [
            "id",
            "symbol",
            "name",
            "investment_type",
            "sector",
            "current_price",
            "currency",
            "last_price_update",
            "price_source",
            "auto_update_price",
            "portfolio_name",
            "portfolio_weight",
            "description",
            "risk_level",
            "dividend_yield",
            "market_cap",
            "pe_ratio",
            "beta",
            "fifty_two_week_high",
            "fifty_two_week_low",
            "is_active",
            "created_at",
            "updated_at",
            "current_quantity",
            "current_value",
            "total_invested",
            "total_gain_loss",
            "total_gain_loss_percentage",
        ]
        read_only_fields = ["created_at", "updated_at"]


class AccountSerializer(serializers.ModelSerializer):
    """Serializer for Account model"""

    tags = TagNameField(required=False)
    # Computed fields
    balance_status = serializers.SerializerMethodField()
    days_since_opened = serializers.SerializerMethodField()
    balance_limit_display = serializers.SerializerMethodField()

    class Meta:
        model = Account
        fields = [
            # Core fields
            "id",
            "name",
            "description",
            "account_type",
            "status",
            "balance",
            "currency",
            "balance_limit",
            "account_number",
            "last_sync_date",
            "metadata",
            "created_at",
            "updated_at",
            "deleted_at",
            
            # Computed/related fields
            "balance_limit_display",
            "balance_status",
            "days_since_opened",
            "tags"
        ]
        read_only_fields = [
            "created_at",
            "updated_at",
            "deleted_at",
            "balance_limit_display",
            "balance_status",
            "days_since_opened"
        ]

    def create(self, validated_data):
        tags = validated_data.pop("tags", None)
        account = super().create(validated_data)
        if tags is not None:
            account.set_tags(tags)
        return account

    def update(self, instance, validated_data):
        tags = validated_data.pop("tags", None)
        account = super().update(instance, validated_data)
        if tags is not None:
            account.set_tags(tags)
        return account

    def get_balance_status(self, obj):
        """Get balance status based on account type and balance limits"""
        if obj.balance_limit is None:
            return "normal"
            
        if obj.account_type == 'credit':
            if obj.balance > obj.balance_limit:
                return "over_limit"
        elif obj.account_type in ['checking', 'savings', 'loan']:
            if obj.balance < obj.balance_limit:
                return "below_minimum"
                
        if obj.balance <= 0:
            return "zero_or_negative"
            
        return "normal"
        
    def get_balance_limit_display(self, obj):
        """Get human-readable balance limit based on account type"""
        if obj.balance_limit is None:
            return None
            
        if obj.account_type == 'credit':
            return f"Credit Limit: {obj.currency.format_amount(obj.balance_limit)}"
        elif obj.account_type in ['checking', 'savings', 'loan']:
            return f"Min. Balance: {obj.currency.format_amount(obj.balance_limit)}"
        return f"Limit: {obj.currency.format_amount(obj.balance_limit)}"

    def get_days_since_opened(self, obj):
        """Calculate days since account was created"""
        if obj.created_at:
            from django.utils import timezone
            return (timezone.now().date() - obj.created_at.date()).days
        return None


class BalanceRecordSerializer(serializers.ModelSerializer):
    """Serializer for unified balance tracking"""

    account_name = serializers.CharField(source="account.name", read_only=True)
    account_type = serializers.CharField(source="account.account_type", read_only=True)
    month_name = serializers.CharField(read_only=True)
    date_display = serializers.CharField(read_only=True)
    has_discrepancy = serializers.BooleanField(read_only=True)
    balance_status = serializers.CharField(read_only=True)
    entry_type_display = serializers.CharField(source="get_entry_type_display", read_only=True)
    reconciliation_status_display = serializers.CharField(source="get_reconciliation_status_display", read_only=True)

    class Meta:
        model = BalanceRecord
        fields = [
            "id",
            "account",
            "account_name",
            "account_type",
            # Core Information
            "balance",
            "date",
            "entry_type",
            "entry_type_display",
            # Statement/Reconciliation Fields
            "statement_balance",
            "reconciliation_status",
            "reconciliation_status_display",
            "difference",
            # Transaction Analysis
            "total_income",
            "total_expenses",
            "calculated_change",
            "actual_change",
            "missing_transactions",
            # Period Information
            "period_start",
            "period_end",
            "is_month_end",
            "year",
            "month",
            "month_name",
            "date_display",
            # Additional Information
            "notes",
            "source",
            "confidence_score",
            "metadata",
            # Computed fields
            "has_discrepancy",
            "balance_status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "created_at",
            "updated_at",
            "account_name",
            "account_type",
            "month_name",
            "date_display",
            "has_discrepancy",
            "balance_status",
            "year",
            "month",
            "entry_type_display",
            "reconciliation_status_display",
        ]


class CategorySerializer(serializers.ModelSerializer):
    """Serializer for Category model"""

    class Meta:
        model = Category
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class TagSerializer(serializers.ModelSerializer):
    """Serializer for Tag model"""

    class Meta:
        model = Tag
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class GoalImageSerializer(serializers.ModelSerializer):
    """Serializer for GoalImage model"""

    class Meta:
        model = GoalImage
        fields = [
            "id",
            "goal_id",
            "image_url",
            "thumbnail_url",
            "caption",
            "is_primary",
            "created_at",
        ]
        read_only_fields = ["created_at"]


class GoalSerializer(serializers.ModelSerializer):
    """Serializer for Goal model"""

    progress_percentage = serializers.ReadOnlyField()
    remaining_amount = serializers.ReadOnlyField()
    is_completed = serializers.ReadOnlyField()
    images = GoalImageSerializer(many=True, read_only=True)

    class Meta:
        model = Goal
        fields = [
            "id",
            "name",
            "description",
            "goal_type",
            "target_amount",
            "current_amount",
            "target_date",
            "start_date",
            "currency",
            "color",
            "thumbnail_image",
            "status",
            "created_at",
            "updated_at",
            "progress_percentage",
            "remaining_amount",
            "is_completed",
            "images",
        ]
        read_only_fields = ["created_at", "updated_at", "thumbnail_image"]

    def validate(self, data):
        # Remove thumbnail_image from validation since it's handled separately in the view
        data.pop('thumbnail_image', None)
        return data


class GroupExpenseShareSerializer(serializers.ModelSerializer):
    """Serializer for GroupExpenseShare model"""

    username = serializers.CharField(source="user.username", read_only=True)
    is_settled = serializers.ReadOnlyField()
    remaining_amount = serializers.ReadOnlyField()

    class Meta:
        model = GroupExpenseShare
        fields = [
            "id",
            "user",
            "username",
            "share_amount",
            "paid_amount",
            "payment_date",
            "notes",
            "is_settled",
            "remaining_amount",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class GroupExpenseSerializer(serializers.ModelSerializer):
    """Serializer for GroupExpense model"""

    shares = GroupExpenseShareSerializer(many=True, read_only=True)
    group = ExpenseGroupSerializer(read_only=True)
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = GroupExpense
        fields = [
            "id",
            "title",
            "description",
            "total_amount",
            "currency",
            "split_method",
            "date",
            "status",
            "created_by",
            "shares",
            "group",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "created_by"]



class FinanceAssistantMessageSerializer(serializers.ModelSerializer):
    """Serializer for assistant conversation messages."""

    class Meta:
        model = FinanceAssistantMessage
        fields = [
            "id",
            "conversation",
            "role",
            "content",
            "payload",
            "is_error",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "conversation", "created_at", "updated_at"]


class FinanceAssistantConversationSerializer(serializers.ModelSerializer):
    """Serializer for assistant conversations."""

    messages = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = FinanceAssistantConversation
        fields = [
            "id",
            "assistant_type",
            "title",
            "metadata",
            "last_summary",
            "created_at",
            "updated_at",
            "messages",
            "last_message",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_messages(self, obj):
        include_messages = self.context.get("include_messages") or self.context.get(
            "include_full_conversation"
        )
        if not include_messages:
            return []
        ordered = obj.messages.order_by("created_at")
        return FinanceAssistantMessageSerializer(ordered, many=True).data

    def get_last_message(self, obj):
        message = obj.messages.order_by("-created_at").first()
        if not message:
            return None
        return FinanceAssistantMessageSerializer(message).data


class TransactionSerializer(serializers.ModelSerializer):
    """
    Optimized Transaction Serializer for the ultra-lean transaction model.

    Uses metadata-based fields accessed via properties for maximum flexibility.
    """

    # Core relationships
    account_name = serializers.CharField(source='account.name', read_only=True)
    account_id = serializers.PrimaryKeyRelatedField(
        queryset=Account.objects.all(),
        source='account',
        write_only=True,
        required=True
    )

    transaction_group_name = serializers.CharField(source='transaction_group.name', read_only=True)
    transaction_group_id = serializers.PrimaryKeyRelatedField(
        queryset=TransactionGroup.objects.all(),
        source='transaction_group',
        write_only=True,
        required=False,
        allow_null=True
    )

    # Read full objects for detailed views
    account = AccountSerializer(read_only=True)
    transaction_group = TransactionGroupSerializer(read_only=True)

    # Metadata-based fields (accessed via properties)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source='category',
        required=False,
        allow_null=True,
    )
    suggested_category_id = serializers.IntegerField(required=False, allow_null=True)
    original_description = serializers.CharField(required=False, allow_blank=True)
    transfer_account_id = serializers.IntegerField(required=False, allow_null=True)
    gmail_message_id = serializers.CharField(required=False, allow_blank=True)
    verified = serializers.BooleanField(required=False, default=False)
    confidence_score = serializers.IntegerField(required=False, allow_null=True)
    source = serializers.CharField(required=False, default='manual')
    transaction_subtype = serializers.CharField(required=False, allow_blank=True)
    transaction_category = serializers.CharField(required=False, allow_blank=True)
    investment_id = serializers.IntegerField(required=False, allow_null=True)
    investment_symbol = serializers.CharField(required=False, allow_blank=True)
    quantity = serializers.DecimalField(max_digits=18, decimal_places=6, required=False, allow_null=True)
    price_per_unit = serializers.DecimalField(max_digits=18, decimal_places=6, required=False, allow_null=True)
    fees = serializers.DecimalField(max_digits=18, decimal_places=6, required=False, allow_null=True)
    transaction_category = serializers.CharField(required=False, allow_blank=True)

    # Tags support
    tags = TagNameField(required=False)

    # Transaction details
    details = TransactionDetailSerializer(many=True, read_only=True)
    has_details = serializers.BooleanField(read_only=True)
    total_details_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    # Display helpers
    display_description = serializers.CharField(read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id',
            # Core fields (from BaseTransaction)
            'amount',
            'description',
            'date',
            'currency',
            'notes',
            'external_id',
            'status',

            # Transaction-specific fields
            'is_credit',
            'account',
            'account_id',
            'account_name',
            'transaction_group',
            'transaction_group_id',
            'transaction_group_name',

            # Soft delete
            'is_deleted',
            'deleted_at',

            # Metadata (via properties)
            'metadata',
            'category_id',
            'suggested_category_id',
            'original_description',
            'transfer_account_id',
            'gmail_message_id',
            'verified',
            'confidence_score',
            'source',
            'transaction_subtype',
            'transaction_category',
            'investment_id',
            'investment_symbol',
            'quantity',
            'price_per_unit',
            'fees',
            'transaction_category',

            # Tags
            'tags',

            # Details
            'details',
            'has_details',
            'total_details_amount',

            # Display
            'display_description',

            # Timestamps
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'created_at',
            'updated_at',
            'is_deleted',
            'deleted_at',
            'has_details',
            'total_details_amount',
            'display_description',
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Filter querysets by user if request is available
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            self.fields['account_id'].queryset = Account.objects.filter(user=request.user)
            self.fields['transaction_group_id'].queryset = TransactionGroup.objects.filter(user=request.user)
            self.fields['category_id'].queryset = Category.objects.filter(user=request.user)

    def to_representation(self, instance):
        """Extract metadata properties to top-level fields"""
        data = super().to_representation(instance)

        # Get metadata-based fields via properties
        data['suggested_category_id'] = instance.suggested_category_id
        data['original_description'] = instance.original_description
        data['transfer_account_id'] = instance.transfer_account_id
        data['gmail_message_id'] = instance.gmail_message_id
        data['verified'] = instance.verified
        data['confidence_score'] = instance.confidence_score
        data['source'] = instance.source
        data['transaction_subtype'] = instance.metadata.get('transaction_subtype')
        data['transaction_category'] = instance.metadata.get('transaction_category')
        data['investment_id'] = instance.investment_id
        data['investment_symbol'] = instance.investment_symbol
        quantity = instance.quantity
        data['quantity'] = str(quantity) if quantity is not None else None
        price_per_unit = instance.price_per_unit
        data['price_per_unit'] = str(price_per_unit) if price_per_unit is not None else None
        fees = instance.fees
        data['fees'] = str(fees) if fees is not None else None

        return data

    def to_internal_value(self, data):
        """Store metadata fields in the metadata JSON"""
        # Extract metadata fields before validation
        metadata_fields = [
            'suggested_category_id', 'original_description',
            'transfer_account_id', 'gmail_message_id', 'verified',
            'confidence_score', 'source', 'transaction_subtype',
            'transaction_category', 'investment_id', 'investment_symbol',
            'quantity', 'price_per_unit', 'fees',
        ]

        metadata = data.get('metadata', {}) or {}
        if not isinstance(metadata, dict):
            metadata = {}

        if 'category_id' not in data and 'category_id' in metadata:
            data['category_id'] = metadata.pop('category_id')

        for field in metadata_fields:
            if field in data:
                metadata[field] = data.pop(field)

        data['metadata'] = metadata

        return super().to_internal_value(data)

    def create(self, validated_data):
        """Create transaction with tags support"""
        tags = validated_data.pop('tags', None)

        # Ensure metadata fields are set via properties
        metadata = validated_data.get('metadata', {})
        transaction = super().create(validated_data)

        # Set metadata properties
        if 'suggested_category_id' in metadata:
            transaction.suggested_category_id = metadata['suggested_category_id']
        if 'original_description' in metadata:
            transaction.original_description = metadata['original_description']
        if 'transfer_account_id' in metadata:
            transaction.transfer_account_id = metadata['transfer_account_id']
        if 'gmail_message_id' in metadata:
            transaction.gmail_message_id = metadata['gmail_message_id']
        if 'verified' in metadata:
            transaction.verified = metadata['verified']
        if 'confidence_score' in metadata:
            transaction.confidence_score = metadata['confidence_score']
        if 'source' in metadata:
            transaction.source = metadata['source']
        if 'transaction_category' in metadata:
            transaction.transaction_category = metadata['transaction_category']
        if 'transaction_subtype' in metadata:
            transaction.transaction_subtype = metadata['transaction_subtype']
        if 'investment_id' in metadata:
            transaction.investment_id = metadata['investment_id']
        if 'investment_symbol' in metadata:
            transaction.investment_symbol = metadata['investment_symbol']
        if 'quantity' in metadata:
            transaction.quantity = metadata['quantity']
        if 'price_per_unit' in metadata:
            transaction.price_per_unit = metadata['price_per_unit']
        if 'fees' in metadata:
            transaction.fees = metadata['fees']

        transaction.save()

        # Set tags if provided
        if tags is not None:
            transaction.set_tags(tags)

        return transaction

    def update(self, instance, validated_data):
        """Update transaction with metadata and tags support"""
        tags = validated_data.pop('tags', None)

        # Update metadata fields via properties
        metadata = validated_data.get('metadata', instance.metadata)

        transaction = super().update(instance, validated_data)

        # Update metadata properties
        if 'suggested_category_id' in metadata:
            transaction.suggested_category_id = metadata['suggested_category_id']
        if 'original_description' in metadata:
            transaction.original_description = metadata['original_description']
        if 'transfer_account_id' in metadata:
            transaction.transfer_account_id = metadata['transfer_account_id']
        if 'gmail_message_id' in metadata:
            transaction.gmail_message_id = metadata['gmail_message_id']
        if 'verified' in metadata:
            transaction.verified = metadata['verified']
        if 'confidence_score' in metadata:
            transaction.confidence_score = metadata['confidence_score']
        if 'source' in metadata:
            transaction.source = metadata['source']
        if 'transaction_category' in metadata:
            transaction.transaction_category = metadata['transaction_category']
        if 'transaction_subtype' in metadata:
            transaction.transaction_subtype = metadata['transaction_subtype']
        if 'investment_id' in metadata:
            transaction.investment_id = metadata['investment_id']
        if 'investment_symbol' in metadata:
            transaction.investment_symbol = metadata['investment_symbol']
        if 'quantity' in metadata:
            transaction.quantity = metadata['quantity']
        if 'price_per_unit' in metadata:
            transaction.price_per_unit = metadata['price_per_unit']
        if 'fees' in metadata:
            transaction.fees = metadata['fees']

        transaction.save()

        # Update tags if provided
        if tags is not None:
            transaction.set_tags(tags)

        return transaction

    def validate(self, data):
        """Validate transaction data"""
        # Validate transfer transactions
        metadata = data.get('metadata', {})
        if metadata.get('transaction_subtype') == 'transfer':
            transfer_account_id = metadata.get('transfer_account_id')
            if not transfer_account_id:
                raise serializers.ValidationError({
                    'transfer_account_id': 'Transfer transactions require transfer_account_id'
                })

            account = data.get('account')
            if account and account.id == transfer_account_id:
                raise serializers.ValidationError({
                    'transfer_account_id': 'Cannot transfer to the same account'
                })

        # Validate amount is positive
        if data.get('amount') and data['amount'] < 0:
            raise serializers.ValidationError({
                'amount': 'Amount must be positive. Use is_credit to indicate direction.'
            })

        return data


# Upload-related Serializers

class UploadSessionSerializer(serializers.ModelSerializer):
    """Serializer for UploadSession model"""

    processing_duration = serializers.SerializerMethodField()
    success_rate = serializers.SerializerMethodField()

    class Meta:
        model = UploadSession
        fields = [
            'id', 'original_filename', 'file_type', 'file_size', 'status',
            'account', 'total_transactions', 'successful_imports',
            'failed_imports', 'duplicate_imports', 'processing_started_at',
            'processing_completed_at', 'processing_duration', 'success_rate',
            'error_message', 'requires_password', 'password_attempts',
            'ai_categorization_enabled', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'status', 'total_transactions', 'successful_imports',
            'failed_imports', 'duplicate_imports', 'processing_started_at',
            'processing_completed_at', 'processing_duration', 'success_rate',
            'error_message', 'password_attempts', 'created_at', 'updated_at'
        ]

    def get_processing_duration(self, obj):
        """Calculate processing duration in seconds"""
        if obj.processing_started_at and obj.processing_completed_at:
            duration = obj.processing_completed_at - obj.processing_started_at
            return duration.total_seconds()
        return None

    def get_success_rate(self, obj):
        """Calculate success rate percentage"""
        if obj.total_transactions > 0:
            return round((obj.successful_imports / obj.total_transactions) * 100, 2)
        return None


class UploadSessionListSerializer(serializers.ModelSerializer):
    """Simplified serializer for upload session lists"""

    account_name = serializers.CharField(source='account.name', read_only=True)
    processing_duration = serializers.SerializerMethodField()

    class Meta:
        model = UploadSession
        fields = [
            'id', 'original_filename', 'file_type', 'file_size', 'status',
            'account', 'account_name', 'total_transactions', 'successful_imports',
            'failed_imports', 'duplicate_imports', 'processing_duration',
            'created_at'
        ]

    def get_processing_duration(self, obj):
        """Calculate processing duration in seconds"""
        if obj.processing_started_at and obj.processing_completed_at:
            duration = obj.processing_completed_at - obj.processing_started_at
            return duration.total_seconds()
        return None


class StatementImportSerializer(serializers.ModelSerializer):
    """Serializer for StatementImport model"""

    tags = TagNameField(required=False)
    transaction_count = serializers.SerializerMethodField()

    class Meta:
        model = StatementImport
        fields = [
            'id', 'upload_session', 'statement_period_start',
            'statement_period_end', 'institution_name', 'account_number_masked',
            'transaction_count', 'tags', 'created_at'
        ]
        read_only_fields = ['id', 'transaction_count', 'created_at']

    def get_transaction_count(self, obj):
        """Get count of transaction imports for this statement"""
        return obj.transaction_imports.count()

    def update(self, instance, validated_data):
        tags = validated_data.pop("tags", None)
        statement = super().update(instance, validated_data)
        if tags is not None:
            statement.set_tags(tags)
        return statement


class TransactionImportSerializer(serializers.ModelSerializer):
    """Serializer for TransactionImport model"""

    transaction_details = serializers.SerializerMethodField()

    class Meta:
        model = TransactionImport
        fields = [
            'id', 'upload_session', 'statement_import', 'transaction',
            'import_status', 'raw_data', 'parsed_amount', 'parsed_date',
            'parsed_description', 'error_message', 'suggested_category_confidence',
            'ai_merchant_detection', 'transaction_details', 'created_at'
        ]
        read_only_fields = [
            'id', 'transaction_details', 'created_at'
        ]

    def get_transaction_details(self, obj):
        """Get basic transaction details if linked"""
        if obj.transaction:
            return {
                'id': obj.transaction.id,
                'amount': str(obj.transaction.amount),
                'description': obj.transaction.description,
                'date': obj.transaction.date,
                'category': obj.transaction.category.name if obj.transaction.category else None,
            }
        return None


class TransactionLinkSerializer(serializers.ModelSerializer):
    """Serializer for TransactionLink model"""

    from_transaction_details = serializers.SerializerMethodField()
    to_transaction_details = serializers.SerializerMethodField()

    class Meta:
        model = TransactionLink
        fields = [
            'id', 'from_transaction', 'to_transaction', 'link_type',
            'confidence_score', 'is_confirmed', 'notes', 'auto_detected',
            'from_transaction_details', 'to_transaction_details', 'created_at'
        ]
        read_only_fields = ['id', 'from_transaction_details', 'to_transaction_details', 'created_at']

    def get_from_transaction_details(self, obj):
        """Get details of the from transaction"""
        return {
            'id': obj.from_transaction.id,
            'amount': str(obj.from_transaction.amount),
            'description': obj.from_transaction.description,
            'date': obj.from_transaction.date,
            'account': obj.from_transaction.account.name if obj.from_transaction.account else None,
        }

    def get_to_transaction_details(self, obj):
        """Get details of the to transaction"""
        return {
            'id': obj.to_transaction.id,
            'amount': str(obj.to_transaction.amount),
            'description': obj.to_transaction.description,
            'date': obj.to_transaction.date,
            'account': obj.to_transaction.account.name if obj.to_transaction.account else None,
        }


class MerchantPatternSerializer(serializers.ModelSerializer):
    """Serializer for MerchantPattern model"""

    category_name = serializers.CharField(source='category.name', read_only=True)
    category_color = serializers.CharField(source='category.color', read_only=True)

    class Meta:
        model = MerchantPattern
        fields = [
            'id', 'pattern', 'category', 'category_name', 'category_color',
            'merchant_name', 'confidence', 'usage_count', 'last_used',
            'is_active', 'is_user_confirmed', 'pattern_type', 'created_at'
        ]
        read_only_fields = ['id', 'category_name', 'category_color', 'usage_count', 'last_used', 'created_at']


class UploadProgressSerializer(serializers.Serializer):
    """Serializer for upload progress status"""

    session_id = serializers.IntegerField()
    status = serializers.ChoiceField(choices=UploadSession.STATUS_CHOICES)
    progress_percentage = serializers.FloatField()
    current_step = serializers.CharField()
    total_transactions = serializers.IntegerField()
    processed_transactions = serializers.IntegerField()
    successful_imports = serializers.IntegerField()
    failed_imports = serializers.IntegerField()
    duplicate_imports = serializers.IntegerField()
    error_message = serializers.CharField(allow_blank=True)
    processing_log = serializers.JSONField()


class FileUploadSerializer(serializers.Serializer):
    """Serializer for file upload requests"""

    file = serializers.FileField()
    account_id = serializers.IntegerField(required=False, allow_null=True)
    password = serializers.CharField(required=False, allow_blank=True)
    ai_categorization = serializers.BooleanField(default=True)

    def validate_file(self, value):
        """Validate uploaded file"""
        max_size = 50 * 1024 * 1024  # 50MB
        if value.size > max_size:
            raise serializers.ValidationError("File size cannot exceed 50MB")

        allowed_types = ['.pdf', '.csv', '.json', '.xls', '.xlsx']
        if not any(value.name.lower().endswith(ext) for ext in allowed_types):
            raise serializers.ValidationError(
                f"File type not supported. Allowed types: {', '.join(allowed_types)}"
            )

        return value

    def validate_account_id(self, value):
        """Validate account belongs to user"""
        if value:
            user = self.context['request'].user
            from .models import Account
            if not Account.objects.filter(id=value, user=user).exists():
                raise serializers.ValidationError("Account not found or access denied")
        return value


# ================================
# BUDGET SERIALIZERS
# ================================


class BudgetSerializer(serializers.ModelSerializer):
    """Main budget serializer with computed fields"""

    # Computed fields for spending analysis
    total_spent = serializers.SerializerMethodField()
    total_remaining = serializers.SerializerMethodField()
    spent_percentage = serializers.SerializerMethodField()
    categories_count = serializers.SerializerMethodField()
    over_budget_categories = serializers.SerializerMethodField()

    # Period information
    is_current = serializers.BooleanField(read_only=True)
    days_remaining = serializers.IntegerField(read_only=True)
    days_total = serializers.IntegerField(read_only=True)
    progress_percentage = serializers.DecimalField(max_digits=5, decimal_places=1, read_only=True)

    class Meta:
        model = Budget
        fields = [
            'id', 'name', 'description', 'period_type', 'start_date', 'end_date',
            'total_amount', 'is_active', 'auto_rollover', 'is_current',
            'days_remaining', 'days_total', 'progress_percentage',
            'total_spent', 'total_remaining', 'spent_percentage',
            'categories_count', 'over_budget_categories',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_total_spent(self, obj):
        """Calculate total spent across all categories"""
        return sum(
            allocation.spent_amount
            for allocation in obj.category_allocations.all()
        )

    def get_total_remaining(self, obj):
        """Calculate total remaining budget"""
        return max(0, obj.total_amount - self.get_total_spent(obj))

    def get_spent_percentage(self, obj):
        """Calculate overall spending percentage"""
        if obj.total_amount == 0:
            return 0
        spent = self.get_total_spent(obj)
        return round((spent / obj.total_amount) * 100, 1)

    def get_categories_count(self, obj):
        """Count of budget categories"""
        return obj.category_allocations.count()

    def get_over_budget_categories(self, obj):
        """Count of categories that are over budget"""
        return sum(
            1 for allocation in obj.category_allocations.all()
            if allocation.is_over_budget
        )


class BudgetCategorySerializer(serializers.ModelSerializer):
    """Budget category allocation serializer"""

    category_name = serializers.CharField(source='category.name', read_only=True)
    category_icon = serializers.CharField(source='category.icon', read_only=True)
    category_color = serializers.CharField(source='category.color', read_only=True)

    # Computed spending fields
    spent_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    remaining_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    spent_percentage = serializers.DecimalField(max_digits=5, decimal_places=1, read_only=True)
    is_over_budget = serializers.BooleanField(read_only=True)
    is_approaching_limit = serializers.BooleanField(read_only=True)

    class Meta:
        model = BudgetCategory
        fields = [
            'id', 'budget', 'category', 'category_name', 'category_icon', 'category_color',
            'allocated_amount', 'alert_threshold', 'notes', 'is_essential',
            'spent_amount', 'remaining_amount', 'spent_percentage',
            'is_over_budget', 'is_approaching_limit',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        """Validate budget category allocation"""
        budget = data.get('budget')
        category = data.get('category')

        # Check for duplicate category in same budget
        if budget and category:
            existing = BudgetCategory.objects.filter(
                budget=budget, category=category
            ).exclude(pk=self.instance.pk if self.instance else None)

            if existing.exists():
                raise serializers.ValidationError(
                    "This category is already allocated in this budget"
                )

        return data


class BudgetTemplateSerializer(serializers.ModelSerializer):
    """Budget template serializer"""

    category_allocations_count = serializers.SerializerMethodField()
    total_percentage = serializers.SerializerMethodField()
    can_use = serializers.SerializerMethodField()

    class Meta:
        model = BudgetTemplate
        fields = [
            'id', 'name', 'description', 'period_type', 'total_amount',
            'is_public', 'usage_count', 'category_allocations_count',
            'total_percentage', 'can_use',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'usage_count', 'created_at', 'updated_at']

    def get_category_allocations_count(self, obj):
        """Count of category allocations in template"""
        return obj.category_allocations.count()

    def get_total_percentage(self, obj):
        """Total percentage allocation for percentage-based templates"""
        total = sum(
            allocation.allocation_value
            for allocation in obj.category_allocations.filter(allocation_type='percentage')
        )
        return round(total, 1)

    def get_can_use(self, obj):
        """Check if current user can use this template"""
        user = self.context['request'].user if 'request' in self.context else None
        return obj.is_public or (user and obj.user == user)


class BudgetTemplateCategorySerializer(serializers.ModelSerializer):
    """Budget template category allocation serializer"""

    category_name = serializers.CharField(source='category.name', read_only=True)
    category_icon = serializers.CharField(source='category.icon', read_only=True)
    category_color = serializers.CharField(source='category.color', read_only=True)
    allocation_display = serializers.SerializerMethodField()

    class Meta:
        model = BudgetTemplateCategory
        fields = [
            'id', 'template', 'category', 'category_name', 'category_icon', 'category_color',
            'allocation_type', 'allocation_value', 'allocation_display',
            'alert_threshold', 'is_essential', 'notes'
        ]

    def get_allocation_display(self, obj):
        """Format allocation for display"""
        if obj.allocation_type == 'percentage':
            return f"{obj.allocation_value}%"
        else:
            return f"${obj.allocation_value}"


class BudgetCreateFromTemplateSerializer(serializers.Serializer):
    """Serializer for creating budget from template"""

    template_id = serializers.IntegerField()
    name = serializers.CharField(max_length=200)
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)

    def validate_template_id(self, value):
        """Validate template exists and user can access it"""
        user = self.context['request'].user
        try:
            template = BudgetTemplate.objects.get(id=value)
            if not template.is_public and template.user != user:
                raise serializers.ValidationError("Template not found or access denied")
            return value
        except BudgetTemplate.DoesNotExist:
            raise serializers.ValidationError("Template not found")

    def validate(self, data):
        """Validate date range"""
        if data['start_date'] >= data['end_date']:
            raise serializers.ValidationError("Start date must be before end date")
        return data


class BudgetSummarySerializer(serializers.ModelSerializer):
    """Simplified budget serializer for listings"""

    total_spent = serializers.SerializerMethodField()
    spent_percentage = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = [
            'id', 'name', 'period_type', 'start_date', 'end_date',
            'total_amount', 'is_active', 'is_current',
            'total_spent', 'spent_percentage', 'status'
        ]

    def get_total_spent(self, obj):
        """Calculate total spent"""
        return sum(
            allocation.spent_amount
            for allocation in obj.category_allocations.all()
        )

    def get_spent_percentage(self, obj):
        """Calculate spending percentage"""
        if obj.total_amount == 0:
            return 0
        spent = self.get_total_spent(obj)
        return round((spent / obj.total_amount) * 100, 1)

    def get_status(self, obj):
        """Determine budget status"""
        from django.utils import timezone
        if not obj.is_current:
            return 'completed' if obj.end_date < timezone.now().date() else 'upcoming'

        spent_pct = self.get_spent_percentage(obj)
        if spent_pct >= 100:
            return 'over_budget'
        elif spent_pct >= 80:
            return 'approaching_limit'
        else:
            return 'on_track'


class AccountPdfPasswordSerializer(serializers.ModelSerializer):
    """Serializer for PDF password management"""

    password = serializers.CharField(write_only=True, required=True)
    account_name = serializers.CharField(source='account.name', read_only=True)

    class Meta:
        model = AccountPdfPassword
        fields = [
            'id',
            'account',
            'account_name',
            'label',
            'password',
            'last_used',
            'usage_count',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['usage_count', 'last_used', 'created_at', 'updated_at']

    def create(self, validated_data):
        """Create new password entry with encryption"""
        from .services.password_encryption import PasswordEncryptionService

        password = validated_data.pop('password')
        encryption_service = PasswordEncryptionService()

        encrypted_password = encryption_service.encrypt_password(password)

        return AccountPdfPassword.objects.create(
            password_encrypted=encrypted_password,
            **validated_data
        )

    def to_representation(self, instance):
        """Never expose the actual password in responses"""
        data = super().to_representation(instance)
        # Remove password field from response (it's write-only anyway)
        return data


# ============================================================================
# Transaction Document Serializers (New Feature)
# ============================================================================

class TransactionDocumentSerializer(serializers.ModelSerializer):
    """Serializer for transaction documents (receipts, invoices, bills)."""

    extracted_items_count = serializers.IntegerField(read_only=True)
    is_processed = serializers.BooleanField(read_only=True)
    has_errors = serializers.BooleanField(read_only=True)
    transaction_description = serializers.CharField(source='transaction.description', read_only=True)

    class Meta:
        model = TransactionDocument
        fields = [
            'id', 'transaction', 'transaction_description',
            'file_path', 'file_url', 'original_filename',
            'file_size', 'content_type', 'document_type',
            'processing_status', 'ocr_text', 'extracted_data',
            'processing_errors', 'processed_at',
            'extraction_confidence', 'ai_model_used',
            'user_verified', 'user_corrected_data',
            'notes', 'metadata',
            'extracted_items_count', 'is_processed', 'has_errors',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'file_path', 'file_url', 'file_size',
            'processing_status', 'ocr_text', 'extracted_data',
            'processing_errors', 'processed_at',
            'extraction_confidence', 'ai_model_used',
            'created_at', 'updated_at'
        ]


class DocumentUploadSerializer(serializers.Serializer):
    """Serializer for uploading documents with automatic OCR and extraction."""

    file = serializers.FileField(required=True)
    document_type = serializers.ChoiceField(
        choices=TransactionDocument.DOCUMENT_TYPE_CHOICES,
        default='receipt'
    )
    transaction_id = serializers.IntegerField(required=False, allow_null=True)
    auto_process = serializers.BooleanField(default=True)
    auto_create_transaction = serializers.BooleanField(default=False)
    processing_method = serializers.ChoiceField(
        choices=['auto', 'ocr_only', 'ai_only', 'both'],
        default='auto',
        help_text="Processing method: auto (smart choice), ocr_only, ai_only, or both"
    )
    ai_model = serializers.CharField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate_file(self, value):
        """Validate uploaded file."""
        # Check file size (max 10MB)
        max_size = 10 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError(f"File size must be less than 10MB")

        # Check file type
        allowed_types = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
            'application/pdf'
        ]
        if value.content_type not in allowed_types:
            raise serializers.ValidationError(
                f"File type {value.content_type} not allowed. "
                f"Allowed types: JPEG, PNG, GIF, PDF"
            )

        return value

    def validate_transaction_id(self, value):
        """Validate that transaction belongs to user."""
        if value:
            user = self.context['request'].user
            if not Transaction.objects.filter(id=value, user=user).exists():
                raise serializers.ValidationError("Transaction not found")
        return value


class DocumentBulkUploadSerializer(serializers.Serializer):
    """Serializer for bulk document upload."""

    files = serializers.ListField(
        child=serializers.FileField(),
        min_length=1,
        max_length=20
    )
    document_type = serializers.ChoiceField(
        choices=TransactionDocument.DOCUMENT_TYPE_CHOICES,
        default='receipt'
    )
    auto_process = serializers.BooleanField(default=True)
    auto_create_transaction = serializers.BooleanField(default=False)
    ai_model = serializers.CharField(required=False, allow_null=True)


class DocumentProcessSerializer(serializers.Serializer):
    """Serializer for processing an uploaded document."""

    document_id = serializers.IntegerField(required=True)
    ai_model = serializers.CharField(required=False, allow_null=True)
    auto_create_transaction = serializers.BooleanField(default=False)

    def validate_document_id(self, value):
        """Validate that document belongs to user."""
        user = self.context['request'].user
        if not TransactionDocument.objects.filter(id=value, user=user).exists():
            raise serializers.ValidationError("Document not found")
        return value


class DocumentVerificationSerializer(serializers.Serializer):
    """Serializer for user verification and correction of extracted data."""

    document_id = serializers.IntegerField(required=True)
    verified = serializers.BooleanField(required=True)
    corrected_data = serializers.JSONField(required=False, allow_null=True)

    def validate_document_id(self, value):
        """Validate that document belongs to user."""
        user = self.context['request'].user
        if not TransactionDocument.objects.filter(id=value, user=user).exists():
            raise serializers.ValidationError("Document not found")
        return value

