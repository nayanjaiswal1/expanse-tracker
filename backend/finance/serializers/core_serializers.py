"""Core serializers for essential finance models."""

from rest_framework import serializers
from finance.models import Account, Category, Tag


class AccountSerializer(serializers.ModelSerializer):
    """Serializer for Account model."""

    class Meta:
        model = Account
        fields = [
            'id',
            'user',
            'name',
            'account_type',
            'account_number',
            'balance',
            'currency',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class CategorySerializer(serializers.ModelSerializer):
    """Serializer for Category model."""

    class Meta:
        model = Category
        fields = [
            'id',
            'user',
            'name',
            'description',
            'category_type',
            'parent',
            'color',
            'icon',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class TagSerializer(serializers.ModelSerializer):
    """Serializer for Tag model."""

    class Meta:
        model = Tag
        fields = [
            'id',
            'user',
            'name',
            'description',
            'color',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']
