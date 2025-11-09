"""
Goal-related views for the finance app.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from PIL import Image
import os
import uuid

from users.pagination import CustomPageNumberPagination
from ..models import Goal, GoalImage
from ..filters import GoalFilter
from ..serializers import GoalSerializer, GoalImageSerializer


class GoalViewSet(viewsets.ModelViewSet):
    """ViewSet for financial goal management"""

    serializer_class = GoalSerializer
    pagination_class = CustomPageNumberPagination
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = GoalFilter
    ordering_fields = ["name", "target_amount", "deadline", "created_at", "status"]
    ordering = ["-created_at"]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return Goal.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        goal = serializer.save(user=self.request.user)
        self._handle_image_uploads(goal, self.request)

    def perform_update(self, serializer):
        goal = serializer.save()
        self._handle_image_uploads(goal, self.request)

    def _handle_thumbnail_upload(self, goal, request):
        """Handle thumbnail image upload for a goal"""
        thumbnail_file = request.FILES.get('thumbnail_image')

        if thumbnail_file and thumbnail_file.content_type.startswith('image/'):
            try:
                # Generate unique filename
                file_extension = thumbnail_file.name.split('.')[-1]
                filename = f"goals/{goal.id}/thumbnail_{uuid.uuid4()}.{file_extension}"

                # Save file
                path = default_storage.save(filename, ContentFile(thumbnail_file.read()))
                thumbnail_url = default_storage.url(path)

                # Update goal with thumbnail URL
                goal.thumbnail_image = thumbnail_url
                goal.save()

            except Exception as e:
                # Log error but don't fail the goal creation
                print(f"Error uploading thumbnail: {e}")

    def _handle_image_uploads(self, goal, request):
        """Handle image uploads for a goal"""
        uploaded_files = request.FILES.getlist('images')
        captions = request.data.getlist('captions', [])

        for i, uploaded_file in enumerate(uploaded_files):
            if uploaded_file and uploaded_file.content_type.startswith('image/'):
                try:
                    # Generate unique filename
                    file_extension = uploaded_file.name.split('.')[-1]
                    filename = f"goals/{goal.id}/{uuid.uuid4()}.{file_extension}"

                    # Save file
                    path = default_storage.save(filename, ContentFile(uploaded_file.read()))
                    image_url = default_storage.url(path)

                    # Create thumbnail
                    thumbnail_url = self._create_thumbnail(path, uploaded_file)

                    # Get caption if provided
                    caption = captions[i] if i < len(captions) else ""

                    # Check if this is the first image
                    is_first_image = goal.images.count() == 0

                    # Create GoalImage record
                    GoalImage.objects.create(
                        goal=goal,
                        image_url=image_url,
                        thumbnail_url=thumbnail_url,
                        caption=caption,
                        is_primary=is_first_image  # First image is primary
                    )

                    # Set the first image as the goal's thumbnail
                    if is_first_image:
                        goal.thumbnail_image = image_url
                        goal.save()

                except Exception as e:
                    # Log error but don't fail the goal creation
                    print(f"Error uploading image: {e}")

    def _create_thumbnail(self, image_path, uploaded_file):
        """Create a thumbnail for the uploaded image"""
        try:
            # Reset file pointer
            uploaded_file.seek(0)

            # Open image with PIL
            with Image.open(uploaded_file) as img:
                # Convert to RGB if necessary
                if img.mode != 'RGB':
                    img = img.convert('RGB')

                # Create thumbnail
                img.thumbnail((200, 200), Image.Resampling.LANCZOS)

                # Generate thumbnail filename
                base_path = os.path.splitext(image_path)[0]
                thumbnail_path = f"{base_path}_thumb.jpg"

                # Save thumbnail
                from io import BytesIO
                thumb_io = BytesIO()
                img.save(thumb_io, format='JPEG', quality=85)
                thumb_io.seek(0)

                saved_path = default_storage.save(thumbnail_path, ContentFile(thumb_io.read()))
                return default_storage.url(saved_path)

        except Exception as e:
            print(f"Error creating thumbnail: {e}")
            return None

    @action(detail=True, methods=["post"])
    def update_progress(self, request, pk=None):
        """Update goal progress"""
        goal = self.get_object()

        try:
            amount = request.data.get("amount")

            if not amount:
                return Response(
                    {"error": "Amount is required"}, status=status.HTTP_400_BAD_REQUEST
                )

            # Update current amount
            goal.current_amount += amount

            # Check if goal is completed
            if goal.current_amount >= goal.target_amount:
                goal.status = "completed"

            goal.save()

            return Response(
                {
                    "message": "Goal progress updated successfully",
                    "current_amount": goal.current_amount,
                    "progress_percentage": goal.progress_percentage,
                    "status": goal.status,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def mark_completed(self, request, pk=None):
        """Mark goal as completed"""
        goal = self.get_object()

        goal.status = "completed"
        goal.save()

        return Response(
            {"message": "Goal marked as completed", "status": goal.status},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def pause(self, request, pk=None):
        """Pause a goal"""
        goal = self.get_object()

        goal.status = "paused"
        goal.save()

        return Response(
            {"message": "Goal paused", "status": goal.status}, status=status.HTTP_200_OK
        )

    @action(detail=True, methods=["post"])
    def resume(self, request, pk=None):
        """Resume a paused goal"""
        goal = self.get_object()

        if goal.status == "paused":
            goal.status = "active"
            goal.save()

            return Response(
                {"message": "Goal resumed", "status": goal.status},
                status=status.HTTP_200_OK,
            )
        else:
            return Response(
                {"error": "Goal is not paused"}, status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=["post"])
    def toggle_status(self, request, pk=None):
        """Toggle goal status"""
        goal = self.get_object()

        try:
            new_status = request.data.get("status")

            if not new_status:
                return Response(
                    {"error": "Status is required"}, status=status.HTTP_400_BAD_REQUEST
                )

            if new_status not in ["active", "paused", "cancelled", "completed"]:
                return Response(
                    {"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST
                )

            goal.status = new_status
            goal.save()

            return Response(
                {
                    "message": f"Goal status changed to {new_status}",
                    "status": goal.status
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Get goals summary"""
        goals = self.get_queryset()

        summary = {
            "total_goals": goals.count(),
            "active_goals": goals.filter(status="active").count(),
            "completed_goals": goals.filter(status="completed").count(),
            "paused_goals": goals.filter(status="paused").count(),
            "total_target_amount": sum(goal.target_amount for goal in goals),
            "total_current_amount": sum(goal.current_amount for goal in goals),
            "average_progress": 0,
        }

        if summary["total_goals"] > 0:
            summary["average_progress"] = (
                sum(goal.progress_percentage for goal in goals) / summary["total_goals"]
            )

        return Response(summary, status=status.HTTP_200_OK)
