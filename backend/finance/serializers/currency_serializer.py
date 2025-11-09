from rest_framework import serializers
from ..models.currency import Currency

class CurrencyInfoSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for public currency information
    """
    symbol_native = serializers.CharField(source='symbol')
    decimal_digits = serializers.IntegerField(source='decimal_places')
    name_plural = serializers.SerializerMethodField()
    
    class Meta:
        model = Currency
        fields = [
            'code',
            'name',
            'symbol',
            'symbol_native',
            'decimal_digits',
            'rounding',
            'name_plural'
        ]
        read_only_fields = fields
    
    def get_name_plural(self, obj):
        # Simple pluralization - in a real app, you might want to use a proper i18n solution
        return f"{obj.name}s"
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Ensure we always have a rounding value
        data['rounding'] = 0  # Default to 0 decimal places for rounding
        return data

class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = [
            'id',
            'code',
            'name',
            'symbol',
            'symbol_position',
            'decimal_places',
            'decimal_separator',
            'thousands_separator',
            'is_active',
            'is_base_currency',
            'exchange_rate',
            'last_updated',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
            'last_updated'
        ]

class CurrencyListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = [
            'code',
            'name',
            'symbol',
            'is_base_currency',
            'exchange_rate',
            'decimal_places',
            'is_active'
        ]
