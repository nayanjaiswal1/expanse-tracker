from typing import List, Optional

from rest_framework import serializers

from . import models


class EntitySerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Entity
        fields = ["id", "user", "name", "entity_type", "is_active", "created_at"]
        read_only_fields = ["id", "user", "created_at"]


class GroupMemberSerializer(serializers.ModelSerializer):
    balance = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)

    class Meta:
        model = models.GroupMember
        fields = [
            "id",
            "group",
            "user",
            "total_paid",
            "total_owed",
            "is_admin",
            "joined_at",
            "balance",
        ]
        read_only_fields = ["id", "joined_at", "balance"]


class GroupSerializer(serializers.ModelSerializer):
    members = GroupMemberSerializer(many=True, read_only=True)

    class Meta:
        model = models.Group
        fields = [
            "id",
            "created_by",
            "name",
            "description",
            "currency",
            "is_active",
            "created_at",
            "updated_at",
            "members",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at", "members"]


class TransactionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.TransactionItem
        fields = [
            "id",
            "transaction",
            "name",
            "quantity",
            "unit_price",
            "amount",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "transaction", "amount", "created_at", "updated_at"]


class TransactionSplitSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.TransactionSplit
        fields = ["id", "transaction", "member", "amount", "created_at"]
        read_only_fields = ["id", "transaction", "created_at"]


class TransactionSerializer(serializers.ModelSerializer):
    items = TransactionItemSerializer(many=True, required=False)
    splits = TransactionSplitSerializer(many=True, required=False)
    currency = serializers.ReadOnlyField()  # Read-only property from account/group

    class Meta:
        model = models.Transaction
        fields = [
            "id",
            "user",
            "account",
            "amount",
            "currency",  # Now a read-only property
            "is_expense",
            "description",
            "date",
            "entity",
            "group",
            "metadata",
            "is_deleted",
            "created_at",
            "updated_at",
            "items",
            "splits",
        ]
        read_only_fields = ["id", "user", "currency", "created_at", "updated_at"]

    def _validate_group_members(self, group, splits_data: List[dict]) -> None:
        if not splits_data:
            return
        member_ids = {split["member"].id for split in splits_data if isinstance(split["member"], models.GroupMember)}
        member_ids |= {split["member"] for split in splits_data if isinstance(split["member"], int)}
        valid_members = set(group.members.values_list("id", flat=True))
        invalid_members = member_ids - valid_members
        if invalid_members:
            raise serializers.ValidationError("One or more splits reference members outside of the transaction group.")

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        splits_data = validated_data.pop("splits", [])
        transaction = models.Transaction.objects.create(**validated_data)

        for item_data in items_data:
            models.TransactionItem.objects.create(transaction=transaction, **item_data)

        if splits_data and transaction.group:
            self._validate_group_members(transaction.group, splits_data)
        for split_data in splits_data:
            models.TransactionSplit.objects.create(transaction=transaction, **split_data)

        return transaction

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        splits_data = validated_data.pop("splits", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                models.TransactionItem.objects.create(transaction=instance, **item_data)

        if splits_data is not None:
            instance.splits.all().delete()
            if splits_data and instance.group:
                self._validate_group_members(instance.group, splits_data)
            for split_data in splits_data:
                models.TransactionSplit.objects.create(transaction=instance, **split_data)

        return instance


class UploadedFileSerializer(serializers.ModelSerializer):
    processing_status = serializers.ReadOnlyField()
    is_statement = serializers.ReadOnlyField()
    is_linked = serializers.ReadOnlyField()
    linked_to = serializers.SerializerMethodField()

    class Meta:
        model = models.UploadedFile
        fields = [
            "id",
            "user",
            "account",
            "file",
            "file_name",
            "file_type",
            "processing_mode",
            "file_hash",
            "mime_type",
            "ocr_text",
            "metadata",
            "processing_status",
            "linked_to",
            "is_statement",
            "is_linked",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "file_hash",
            "processing_status",
            "is_statement",
            "is_linked",
            "created_at",
        ]

    def get_linked_to(self, obj):
        """Return linked object info if exists."""
        if obj.content_object:
            return {
                "type": obj.content_type.model,
                "id": obj.object_id,
                "str": str(obj.content_object),
            }
        return None

    def validate(self, attrs):
        file_obj = attrs.get("file")
        if file_obj:
            attrs["file_name"] = file_obj.name
            attrs["mime_type"] = getattr(file_obj, "content_type", "")
        return attrs


class PendingTransactionSerializer(serializers.ModelSerializer):
    imported_transaction = TransactionSerializer(read_only=True)

    class Meta:
        model = models.PendingTransaction
        fields = [
            "id",
            "user",
            "source",
            "source_id",
            "amount",
            "is_expense",
            "description",
            "date",
            "account",
            "entity",
            "group",
            "metadata",
            "items",
            "status",
            "imported_transaction",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "status", "imported_transaction", "created_at", "updated_at"]

    def validate_items(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Items must be a list of item dictionaries.")
        return value

    def validate(self, attrs):
        # Removed category validation since we're removing the category field
        return attrs


class ChatMessageSerializer(serializers.ModelSerializer):
    """Serializer for chat messages."""

    class Meta:
        model = models.ChatMessage
        fields = [
            "id",
            "user",
            "conversation_id",
            "message_type",
            "content",
            "metadata",
            "status",
            "related_transaction",
            "related_file",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]

    def create(self, validated_data):
        # Auto-set user from request context
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class StatementPasswordSerializer(serializers.ModelSerializer):
    """Serializer for statement passwords."""

    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = models.StatementPassword
        fields = [
            "id",
            "user",
            "account",
            "password",  # Write-only
            "password_hint",
            "is_default",
            "last_used",
            "success_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "last_used", "success_count", "created_at", "updated_at"]

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        validated_data['user'] = self.context['request'].user

        instance = models.StatementPassword(**validated_data)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)

        instance.save()
        return instance
