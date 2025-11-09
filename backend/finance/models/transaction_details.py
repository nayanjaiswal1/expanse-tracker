"""
Transaction Detail models - Enhanced SubTransaction for flexible detail tracking.
"""

from django.db import models
from decimal import Decimal
from .base import UserOwnedModel


class TransactionDetail(UserOwnedModel):
    """
    Universal detail model for all transaction detail types.
    Replaces and enhances the old SubTransaction model.

    Supports multiple detail types:
    - line_item: Individual items in a purchase (groceries, receipt items)
    - split_share: Group expense split details
    - investment_detail: Stock/crypto transaction details
    - lending_terms: Loan/lending transaction details
    - installment: Installment payment details
    - tax_detail: Tax breakdown details
    """

    DETAIL_TYPE_CHOICES = [
        ('line_item', 'Line Item'),
        ('split_share', 'Split Share'),
        ('investment_detail', 'Investment Detail'),
        ('lending_terms', 'Lending Terms'),
        ('installment', 'Installment'),
        ('tax_detail', 'Tax Detail'),
        ('fee', 'Fee'),
        ('discount', 'Discount'),
        ('other', 'Other'),
    ]

    # Core fields
    transaction = models.ForeignKey(
        'Transaction',
        on_delete=models.CASCADE,
        related_name='details',
        db_index=True
    )
    detail_type = models.CharField(
        max_length=20,
        choices=DETAIL_TYPE_CHOICES,
        default='line_item',
        db_index=True
    )

    # Common fields for all detail types
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)

    # Optional category (for categorizing individual items)
    category = models.ForeignKey(
        'Category',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transaction_details'
    )

    # Quantity support for line items and investments
    quantity = models.DecimalField(
        max_digits=15,
        decimal_places=6,
        null=True,
        blank=True,
        help_text="Quantity for line items or investment shares"
    )
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        null=True,
        blank=True,
        help_text="Price per unit/share"
    )

    # Flexible metadata for type-specific data
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Type-specific data: investment symbols, lending terms, split ratios, etc."
    )

    # Verification and notes
    verified = models.BooleanField(default=False)
    notes = models.TextField(blank=True)

    class Meta:
        app_label = 'finance'
        verbose_name = 'Transaction Detail'
        verbose_name_plural = 'Transaction Details'
        ordering = ['transaction', '-amount']
        indexes = [
            models.Index(fields=['transaction', 'detail_type']),
            models.Index(fields=['user', 'detail_type']),
            models.Index(fields=['user', 'category']),
            models.Index(fields=['transaction', 'category']),
        ]

    def __str__(self):
        return f"{self.get_detail_type_display()}: {self.name} - {self.amount}"

    def clean(self):
        """Validate detail data based on type"""
        from django.core.exceptions import ValidationError

        super().clean()

        # Validate investment details
        if self.detail_type == 'investment_detail':
            if not self.quantity or not self.unit_price:
                raise ValidationError({
                    'quantity': 'Investment details require quantity and unit_price',
                    'unit_price': 'Investment details require quantity and unit_price'
                })

            # Validate amount matches quantity × unit_price
            expected_amount = Decimal(str(self.quantity)) * Decimal(str(self.unit_price))
            if abs(self.amount - expected_amount) > Decimal('0.01'):
                raise ValidationError({
                    'amount': f'Amount should match quantity × unit_price (expected: {expected_amount})'
                })

        # Validate lending terms have required metadata
        if self.detail_type == 'lending_terms':
            required_fields = ['due_date', 'interest_rate']
            missing = [f for f in required_fields if f not in self.metadata]
            if missing:
                raise ValidationError({
                    'metadata': f'Lending terms require: {", ".join(missing)}'
                })

    @property
    def calculated_amount(self):
        """Calculate amount from quantity and unit_price if available"""
        if self.quantity and self.unit_price:
            return Decimal(str(self.quantity)) * Decimal(str(self.unit_price))
        return self.amount

    @classmethod
    def create_line_item(cls, transaction, name, amount, category=None, quantity=None, unit_price=None, **kwargs):
        """
        Helper method to create a line item detail.

        Args:
            transaction: Parent Transaction instance
            name: Item name
            amount: Item amount
            category: Optional Category instance
            quantity: Optional item quantity
            unit_price: Optional price per unit
            **kwargs: Additional fields (metadata, notes, etc.)
        """
        return cls.objects.create(
            transaction=transaction,
            user=transaction.user,
            detail_type='line_item',
            name=name,
            amount=amount,
            category=category,
            quantity=quantity,
            unit_price=unit_price,
            **kwargs
        )

    @classmethod
    def create_investment_detail(cls, transaction, symbol, shares, price_per_share, fees=None, **kwargs):
        """
        Helper method to create an investment detail.

        Args:
            transaction: Parent Transaction instance
            symbol: Stock/crypto symbol
            shares: Number of shares
            price_per_share: Price per share
            fees: Optional trading fees
            **kwargs: Additional metadata
        """
        total_amount = Decimal(str(shares)) * Decimal(str(price_per_share))
        if fees:
            total_amount += Decimal(str(fees))

        metadata = kwargs.pop('metadata', {})
        metadata.update({
            'symbol': symbol,
            'fees': str(fees) if fees else '0.00',
        })

        return cls.objects.create(
            transaction=transaction,
            user=transaction.user,
            detail_type='investment_detail',
            name=f"{symbol} - {shares} shares",
            amount=total_amount,
            quantity=shares,
            unit_price=price_per_share,
            metadata=metadata,
            **kwargs
        )

    @classmethod
    def create_lending_detail(cls, transaction, due_date, interest_rate, name=None, **kwargs):
        """
        Helper method to create a lending detail.

        Args:
            transaction: Parent Transaction instance
            due_date: Due date (YYYY-MM-DD string or date object)
            interest_rate: Interest rate percentage
            name: Optional detail name
            **kwargs: Additional metadata
        """
        metadata = kwargs.pop('metadata', {})
        metadata.update({
            'due_date': str(due_date),
            'interest_rate': str(interest_rate),
        })

        return cls.objects.create(
            transaction=transaction,
            user=transaction.user,
            detail_type='lending_terms',
            name=name or 'Lending Terms',
            amount=transaction.amount,
            metadata=metadata,
            **kwargs
        )
