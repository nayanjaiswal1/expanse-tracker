"""
Currency model for storing currency information.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator


class Currency(models.Model):
    """
    Represents a currency with its details.
    """
    code = models.CharField(
        max_length=3,
        unique=True,
        help_text=_("ISO 4217 currency code (e.g., USD, EUR, GBP)")
    )
    name = models.CharField(
        max_length=50,
        help_text=_("Full name of the currency (e.g., US Dollar, Euro)")
    )
    symbol = models.CharField(
        max_length=5,
        help_text=_("Currency symbol (e.g., $, €, £)")
    )
    symbol_position = models.CharField(
        max_length=10,
        choices=[
            ('left', _('Left')),
            ('right', _('Right')),
        ],
        default='left',
        help_text=_("Position of the currency symbol relative to the amount")
    )
    decimal_places = models.PositiveSmallIntegerField(
        default=2,
        validators=[MinValueValidator(0)],
        help_text=_("Number of decimal places to display")
    )
    decimal_separator = models.CharField(
        max_length=1,
        default='.',
        help_text=_("Decimal separator (e.g., . or ,)")
    )
    thousands_separator = models.CharField(
        max_length=1,
        default=',',
        help_text=_("Thousands separator (e.g., , or . or space)")
    )
    is_active = models.BooleanField(
        default=True,
        help_text=_("Whether this currency is active and can be used")
    )
    is_base_currency = models.BooleanField(
        default=False,
        help_text=_("Whether this is the base currency for the system")
    )
    exchange_rate = models.DecimalField(
        max_digits=20,
        decimal_places=6,
        default=1.0,
        help_text=_("Exchange rate to the base currency")
    )
    last_updated = models.DateTimeField(
        auto_now=True,
        help_text=_("When the exchange rate was last updated")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Currency")
        verbose_name_plural = _("Currencies")
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name}"

    def format_amount(self, amount):
        """Format the amount according to the currency's settings."""
        # Format the number with proper separators
        formatted = f"{amount:,.{self.decimal_places}f}"
        
        # Replace the default separators with the currency's separators
        formatted = formatted.replace(',', 'THOUSAND_SEP').replace('.', 'DECIMAL_SEP')
        formatted = formatted.replace('THOUSAND_SEP', self.thousands_separator)
        formatted = formatted.replace('DECIMAL_SEP', self.decimal_separator)
        
        # Add the symbol in the correct position
        if self.symbol_position == 'left':
            return f"{self.symbol}{formatted}"
        return f"{formatted}{self.symbol}"
