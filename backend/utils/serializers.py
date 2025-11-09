from rest_framework import serializers

class FlatRelatedMixin:
    """
    Dynamically flattens selected foreign key fields in DRF serializers.
    Example:
        class TranslationSerializer(FlatRelatedMixin, serializers.ModelSerializer):
            flat_relations = {
                "category": ["id", "name", "created_at", "updated_at"]
            }
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        flat_relations = getattr(self, "flat_relations", {})
        for rel_name, fields in flat_relations.items():
            for field in fields:
                flat_name = f"{rel_name}_{field}"
                self.fields[flat_name] = serializers.ReadOnlyField(source=f"{rel_name}.{field}")
