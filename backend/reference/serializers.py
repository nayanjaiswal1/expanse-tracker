"""
Serializers for reference data models.
"""
from rest_framework import serializers
from .models import Country, Language, Timezone, CurrencyInfo, LocaleMapping
from finance.models.currency import Currency


class CurrencySerializer(serializers.ModelSerializer):
    """Serializer for Currency model."""

    class Meta:
        model = Currency
        fields = [
            'id', 'code', 'name', 'symbol', 'symbol_position',
            'decimal_places', 'decimal_separator', 'thousands_separator',
            'is_active', 'is_base_currency', 'exchange_rate'
        ]


class CurrencyInfoSerializer(serializers.ModelSerializer):
    """Serializer for extended currency information."""

    class Meta:
        model = CurrencyInfo
        fields = [
            'symbol_native', 'name_plural', 'rounding',
            'space_between_amount_and_symbol', 'is_common'
        ]


class CurrencyDetailSerializer(serializers.ModelSerializer):
    """Detailed currency serializer with extended info."""
    info = CurrencyInfoSerializer(read_only=True)

    # Additional computed fields for frontend compatibility
    symbolOnLeft = serializers.SerializerMethodField()
    decimalDigits = serializers.SerializerMethodField()
    spaceBetweenAmountAndSymbol = serializers.SerializerMethodField()
    symbol_native = serializers.SerializerMethodField()
    decimal_digits = serializers.SerializerMethodField()
    name_plural = serializers.SerializerMethodField()

    class Meta:
        model = Currency
        fields = [
            'id', 'code', 'name', 'symbol', 'symbol_position',
            'decimal_places', 'decimal_separator', 'thousands_separator',
            'is_active', 'is_base_currency', 'exchange_rate',
            'info',
            # Frontend compatibility fields
            'symbolOnLeft', 'decimalDigits', 'spaceBetweenAmountAndSymbol',
            'symbol_native', 'decimal_digits', 'name_plural'
        ]

    def get_symbolOnLeft(self, obj):
        return obj.symbol_position == 'left'

    def get_decimalDigits(self, obj):
        return obj.decimal_places

    def get_spaceBetweenAmountAndSymbol(self, obj):
        if hasattr(obj, 'info'):
            return obj.info.space_between_amount_and_symbol
        return False

    def get_symbol_native(self, obj):
        if hasattr(obj, 'info'):
            return obj.info.symbol_native
        return obj.symbol

    def get_decimal_digits(self, obj):
        return obj.decimal_places

    def get_name_plural(self, obj):
        if hasattr(obj, 'info'):
            return obj.info.name_plural
        return f"{obj.name}s"


class CountrySerializer(serializers.ModelSerializer):
    """Serializer for Country model."""
    default_currency_code = serializers.CharField(source='default_currency.code', read_only=True)

    class Meta:
        model = Country
        fields = [
            'id', 'code', 'name', 'flag', 'dial_code',
            'default_currency', 'default_currency_code',
            'default_timezone', 'is_active'
        ]


class LanguageSerializer(serializers.ModelSerializer):
    """Serializer for Language model."""

    class Meta:
        model = Language
        fields = [
            'id', 'code', 'name', 'native_name',
            'is_active', 'is_rtl'
        ]


class TimezoneSerializer(serializers.ModelSerializer):
    """Serializer for Timezone model."""
    value = serializers.CharField(source='name', read_only=True)

    class Meta:
        model = Timezone
        fields = [
            'id', 'name', 'label', 'offset',
            'country_code', 'is_common', 'is_active',
            'value'  # For frontend compatibility
        ]


class LocaleMappingSerializer(serializers.ModelSerializer):
    """Serializer for LocaleMapping model."""
    language_code = serializers.CharField(source='language.code', read_only=True)
    country_code = serializers.CharField(source='country.code', read_only=True)
    currency_code = serializers.CharField(source='default_currency.code', read_only=True)

    class Meta:
        model = LocaleMapping
        fields = [
            'id', 'locale_code', 'language', 'language_code',
            'country', 'country_code', 'default_currency',
            'currency_code', 'is_active'
        ]


class ReferenceDataSerializer(serializers.Serializer):
    """Combined serializer for all reference data."""
    countries = CountrySerializer(many=True, read_only=True)
    currencies = CurrencyDetailSerializer(many=True, read_only=True)
    languages = LanguageSerializer(many=True, read_only=True)
    timezones = TimezoneSerializer(many=True, read_only=True)
    locale_mappings = LocaleMappingSerializer(many=True, read_only=True)

    # Mapping objects for quick lookup
    country_to_currency = serializers.DictField(read_only=True)
    locale_to_currency = serializers.DictField(read_only=True)
    locale_to_language = serializers.DictField(read_only=True)
