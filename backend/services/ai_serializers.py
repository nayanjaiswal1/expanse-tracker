from rest_framework import serializers
from .ai_models import (
    APIKey,
    SubscriptionPlan,
    Subscription,
    Transaction,
    AITask,
    Workflow,
    PromptTemplate,
    Document,
    AITaskTemplate,
)


class APIKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = APIKey
        fields = "__all__"
        read_only_fields = ("user", "created_at", "updated_at")


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = "__all__"


class SubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = "__all__"
        read_only_fields = ("user", "created_at", "updated_at")


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = "__all__"
        read_only_fields = ("created_at",)


class AITaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = AITask
        fields = "__all__"
        read_only_fields = ("user", "created_at", "updated_at", "output_data", "status")


class WorkflowSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workflow
        fields = "__all__"
        read_only_fields = ("user", "created_at", "updated_at")


class PromptTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromptTemplate
        fields = "__all__"
        read_only_fields = ("user", "created_at", "updated_at")


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = "__all__"
        read_only_fields = ("user", "uploaded_at", "processed_data")


class AITaskTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AITaskTemplate
        fields = [
            "id",
            "user",
            "name",
            "task_type",
            "description",
            "prompt_template",
            "parameters",
            "preferred_provider",
            "provider_model",
            "is_public",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]
