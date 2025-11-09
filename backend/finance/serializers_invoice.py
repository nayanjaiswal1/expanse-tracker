"""
Invoice upload and processing serializers.
"""

from rest_framework import serializers
from decimal import Decimal
from .models import Transaction, TransactionDetail, Category, Account


class InvoiceLineItemSerializer(serializers.Serializer):
    """Serializer for individual invoice line items."""

    description = serializers.CharField(max_length=500)
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    total_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    category_id = serializers.IntegerField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    selected = serializers.BooleanField(default=True)


class InvoiceUploadSerializer(serializers.Serializer):
    """Serializer for invoice file upload."""

    file = serializers.FileField()

    def validate_file(self, value):
        """Validate file type and size."""
        allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png']
        file_name = value.name.lower()

        if not any(file_name.endswith(ext) for ext in allowed_extensions):
            raise serializers.ValidationError(
                f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
            )

        # Max 10MB
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("File size must be less than 10MB")

        return value


class InvoiceApprovalSerializer(serializers.Serializer):
    """Serializer for approving and creating transactions from invoice."""

    account_id = serializers.IntegerField()
    date = serializers.DateField()
    merchant_name = serializers.CharField(max_length=255)
    invoice_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency = serializers.CharField(max_length=3, default="USD")
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    line_items = InvoiceLineItemSerializer(many=True)
    tax_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    payment_method = serializers.CharField(max_length=50, required=False, allow_blank=True)

    def validate_account_id(self, value):
        """Validate account exists and belongs to user."""
        user = self.context['request'].user
        if not Account.objects.filter(id=value, user=user).exists():
            raise serializers.ValidationError("Account not found or access denied")
        return value

    def validate_line_items(self, value):
        """Validate line items."""
        if not value:
            raise serializers.ValidationError("At least one line item is required")

        selected_items = [item for item in value if item.get('selected', True)]
        if not selected_items:
            raise serializers.ValidationError("At least one line item must be selected")

        return value

    def validate(self, data):
        """Validate total matches sum of line items."""
        line_items = data.get('line_items', [])
        selected_items = [item for item in line_items if item.get('selected', True)]

        calculated_total = sum(
            Decimal(str(item['total_price']))
            for item in selected_items
        )

        provided_total = Decimal(str(data['total_amount']))

        # Allow small rounding differences
        if abs(calculated_total - provided_total) > Decimal('0.01'):
            raise serializers.ValidationError(
                f"Total amount ({provided_total}) doesn't match sum of line items ({calculated_total})"
            )

        return data

    def create(self, validated_data):
        """Create main transaction with sub-transactions."""
        user = self.context['request'].user
        line_items_data = validated_data.pop('line_items')

        # Get account
        account = Account.objects.get(id=validated_data['account_id'], user=user)

        # Get or create transaction group for merchant
        from .models import TransactionGroup
        merchant_group, _ = TransactionGroup.get_or_create_from_name(
            user=user,
            name=validated_data['merchant_name'],
            group_type='merchant'
        )

        # Create main transaction
        transaction = Transaction.objects.create(
            user=user,
            account=account,
            is_credit=False,  # Invoice is an expense (money out)
            amount=validated_data['total_amount'],
            description=f"Invoice from {validated_data['merchant_name']}",
            date=validated_data['date'],
            currency=validated_data['currency'],
            transaction_group=merchant_group,
            notes=validated_data.get('notes', ''),
            status='active',
            metadata={
                'transaction_subtype': 'expense',
                'source': 'invoice',
                'invoice_number': validated_data.get('invoice_number', ''),
                'payment_method': validated_data.get('payment_method', ''),
                'tax_amount': str(validated_data.get('tax_amount') or '0'),
                'has_line_items': True,
            }
        )

        # Create sub-transactions for each selected line item
        for item_data in line_items_data:
            if not item_data.get('selected', True):
                continue

            category = None
            if item_data.get('category_id'):
                try:
                    category = Category.objects.get(id=item_data['category_id'], user=user)
                except Category.DoesNotExist:
                    pass

            TransactionDetail.objects.create(
                user=user,
                transaction=transaction,
                detail_type='line_item',
                name=item_data['description'],
                amount=item_data['total_price'],
                description=item_data['description'],
                notes=item_data.get('notes', ''),
                category=category,
                quantity=item_data.get('quantity'),
                unit_price=item_data.get('unit_price'),
            )

        return transaction


class TransactionDetailSerializerInvoice(serializers.ModelSerializer):
    """Serializer for transaction details (line items)."""

    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = TransactionDetail
        fields = ['id', 'name', 'amount', 'description', 'notes', 'category', 'category_name', 'quantity', 'unit_price', 'created_at']
        read_only_fields = ['id', 'created_at']


class TransactionWithLineItemsSerializer(serializers.ModelSerializer):
    """Serializer for transaction with its line items."""

    line_items = TransactionDetailSerializerInvoice(source='details', many=True, read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id', 'date', 'amount', 'description', 'merchant_name',
            'notes', 'currency', 'metadata', 'account', 'account_name',
            'line_items', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
