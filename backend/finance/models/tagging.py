"""
Generic tagging models and mixin for finance entities.
"""

from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey, GenericRelation
from django.contrib.contenttypes.models import ContentType

from .base import UserOwnedModel


class Tag(UserOwnedModel):
    """Reusable tag definition."""

    DEFAULT_COLOR = "#6B7280"

    name = models.CharField(max_length=50)
    color = models.CharField(max_length=7, default=DEFAULT_COLOR)

    class Meta:
        app_label = "finance"
        unique_together = ["user", "name"]

    def __str__(self):
        return self.name


class TagAssignment(UserOwnedModel):
    """Generic tag linkage to any taggable model."""

    tag = models.ForeignKey(
        Tag,
        on_delete=models.CASCADE,
        related_name="assignments",
    )
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        related_name="finance_tag_assignments",
    )
    object_id = models.PositiveBigIntegerField()
    content_object = GenericForeignKey("content_type", "object_id")

    class Meta:
        app_label = "finance"
        unique_together = ["user", "tag", "content_type", "object_id"]
        indexes = [
            models.Index(fields=["user", "content_type", "object_id"]),
            models.Index(fields=["tag"]),
        ]

    def __str__(self):
        return f"{self.tag.name} -> {self.content_type.app_label}.{self.content_type.model}:{self.object_id}"


class TaggableMixin(models.Model):
    """Abstract mixin that adds tagging helpers to a model."""

    tag_links = GenericRelation(
        "finance.TagAssignment",
        related_query_name="tagged_%(class)s",
    )

    class Meta:
        abstract = True

    # ---- Helpers ----
    def _prefetched_assignments(self):
        cache = getattr(self, "_prefetched_objects_cache", None)
        if cache and "tag_links" in cache:
            return cache["tag_links"]
        return None

    def _load_tag_assignments(self):
        assignments = self._prefetched_assignments()
        if assignments is None:
            assignments = self.tag_links.select_related("tag")
        return assignments

    @property
    def tag_list(self):
        if hasattr(self, "_tag_list_cache"):
            return self._tag_list_cache
        tags = [assignment.tag for assignment in self._load_tag_assignments() if assignment.tag_id]
        self._tag_list_cache = tags
        return tags

    @tag_list.setter
    def tag_list(self, value):
        self._tag_list_cache = list(value or [])

    @property
    def tag_names(self):
        return [tag.name for tag in self.tag_list]

    def _assert_persisted(self):
        if not self.pk:
            raise ValueError("Instance must be saved before assigning tags.")

    def _content_type(self):
        return ContentType.objects.get_for_model(self.__class__)

    def _clear_tag_cache(self):
        if hasattr(self, "_tag_list_cache"):
            delattr(self, "_tag_list_cache")
        cache = getattr(self, "_prefetched_objects_cache", None)
        if cache and "tag_links" in cache:
            del cache["tag_links"]

    def set_tags(self, tags):
        """Replace tag assignments with the provided Tag objects."""
        self._assert_persisted()
        tags = list(tags or [])
        content_type = self._content_type()

        assignments_qs = TagAssignment.objects.filter(
            user=self.user,
            content_type=content_type,
            object_id=self.pk,
        )

        new_tag_ids = {tag.id for tag in tags}
        assignments_qs.exclude(tag_id__in=new_tag_ids).delete()

        existing_ids = set(
            assignments_qs.filter(tag_id__in=new_tag_ids).values_list("tag_id", flat=True)
        )

        new_assignments = [
            TagAssignment(
                user=self.user,
                tag=tag,
                content_type=content_type,
                object_id=self.pk,
            )
            for tag in tags
            if tag.id not in existing_ids
        ]
        if new_assignments:
            TagAssignment.objects.bulk_create(new_assignments, ignore_conflicts=True)

        self._clear_tag_cache()
        self.tag_list = tags

    def add_tags(self, tags):
        """Attach Tag objects without removing existing ones."""
        self._assert_persisted()
        tags = [tag for tag in (tags or []) if tag]
        if not tags:
            return

        content_type = self._content_type()
        existing_ids = set(
            TagAssignment.objects.filter(
                user=self.user,
                content_type=content_type,
                object_id=self.pk,
                tag__in=tags,
            ).values_list("tag_id", flat=True)
        )

        new_assignments = [
            TagAssignment(
                user=self.user,
                tag=tag,
                content_type=content_type,
                object_id=self.pk,
            )
            for tag in tags
            if tag.id not in existing_ids
        ]
        if new_assignments:
            TagAssignment.objects.bulk_create(new_assignments, ignore_conflicts=True)

        self._clear_tag_cache()

    def add_tags_by_names(self, tag_names):
        """Create (if needed) and attach tags by name."""
        cleaned_names = [name.strip() for name in (tag_names or []) if name and name.strip()]
        if not cleaned_names:
            return

        tags = []
        for name in cleaned_names:
            tag, _ = Tag.objects.get_or_create(
                user=self.user,
                name=name,
                defaults={"color": Tag.DEFAULT_COLOR},
            )
            tags.append(tag)

        self.add_tags(tags)
