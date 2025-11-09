"""
Reference data models for countries, languages, timezones, and extended currency information.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator


class Country(models.Model):
    """
    Represents a country with its details.
    """
    code = models.CharField(
        max_length=2,
        unique=True,
        db_index=True,
        help_text=_("ISO 3166-1 alpha-2 country code (e.g., US, GB, IN)")
    )
    name = models.CharField(
        max_length=100,
        help_text=_("Full name of the country")
    )
    flag = models.CharField(
        max_length=10,
        blank=True,
        help_text=_("Unicode flag emoji")
    )
    dial_code = models.CharField(
        max_length=10,
        blank=True,
        help_text=_("International dialing code (e.g., +1, +44, +91)")
    )
    default_currency = models.ForeignKey(
        'finance.Currency',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='countries',
        help_text=_("Default currency for this country")
    )
    default_timezone = models.CharField(
        max_length=50,
        blank=True,
        help_text=_("Default timezone for this country (e.g., America/New_York)")
    )
    is_active = models.BooleanField(
        default=True,
        help_text=_("Whether this country is active and can be selected")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Country")
        verbose_name_plural = _("Countries")
        ordering = ['name']

    def __str__(self):
        return f"{self.flag} {self.name} ({self.code})"


class Language(models.Model):
    """
    Represents a language supported by the system.
    """
    code = models.CharField(
        max_length=10,
        unique=True,
        db_index=True,
        help_text=_("ISO 639-1 language code (e.g., en, es, hi)")
    )
    name = models.CharField(
        max_length=100,
        help_text=_("Full name of the language in English")
    )
    native_name = models.CharField(
        max_length=100,
        help_text=_("Name of the language in its native script")
    )
    is_active = models.BooleanField(
        default=True,
        help_text=_("Whether this language is active and can be selected")
    )
    is_rtl = models.BooleanField(
        default=False,
        help_text=_("Whether this language is written right-to-left")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Language")
        verbose_name_plural = _("Languages")
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class Timezone(models.Model):
    """
    Represents a timezone.
    """
    name = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text=_("IANA timezone name (e.g., America/New_York, Europe/London)")
    )
    label = models.CharField(
        max_length=100,
        help_text=_("Display label for the timezone")
    )
    offset = models.CharField(
        max_length=10,
        help_text=_("UTC offset (e.g., UTC-5, UTC+5:30)")
    )
    country_code = models.CharField(
        max_length=2,
        blank=True,
        help_text=_("Associated country code")
    )
    is_common = models.BooleanField(
        default=False,
        help_text=_("Whether this is a commonly used timezone")
    )
    is_active = models.BooleanField(
        default=True,
        help_text=_("Whether this timezone is active and can be selected")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Timezone")
        verbose_name_plural = _("Timezones")
        ordering = ['label']

    def __str__(self):
        return f"{self.label} ({self.name})"


class CurrencyInfo(models.Model):
    """
    Extended currency information to complement the finance.Currency model.
    Stores additional metadata about currencies.
    """
    currency = models.OneToOneField(
        'finance.Currency',
        on_delete=models.CASCADE,
        related_name='info',
        help_text=_("Associated currency")
    )
    symbol_native = models.CharField(
        max_length=10,
        help_text=_("Native currency symbol")
    )
    name_plural = models.CharField(
        max_length=100,
        help_text=_("Plural name of the currency")
    )
    rounding = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text=_("Rounding precision")
    )
    space_between_amount_and_symbol = models.BooleanField(
        default=False,
        help_text=_("Whether to add space between amount and symbol")
    )
    is_common = models.BooleanField(
        default=False,
        help_text=_("Whether this is a commonly used currency")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Currency Info")
        verbose_name_plural = _("Currency Info")

    def __str__(self):
        return f"Info for {self.currency.code}"


class LocaleMapping(models.Model):
    """
    Maps locale codes to currencies, languages, and formatting preferences.
    """
    locale_code = models.CharField(
        max_length=10,
        unique=True,
        db_index=True,
        help_text=_("Locale code (e.g., en-US, en-GB, hi-IN)")
    )
    language = models.ForeignKey(
        Language,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='locales',
        help_text=_("Associated language")
    )
    country = models.ForeignKey(
        Country,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='locales',
        help_text=_("Associated country")
    )
    default_currency = models.ForeignKey(
        'finance.Currency',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='locales',
        help_text=_("Default currency for this locale")
    )
    is_active = models.BooleanField(
        default=True,
        help_text=_("Whether this locale mapping is active")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Locale Mapping")
        verbose_name_plural = _("Locale Mappings")
        ordering = ['locale_code']

    def __str__(self):
        return self.locale_code
