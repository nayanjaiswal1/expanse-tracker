from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """Allows access only to admin users."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, "profile")
            and request.user.profile.role == "admin"
        )


class IsStaff(permissions.BasePermission):
    """Allows access only to staff users."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, "profile")
            and request.user.profile.role == "staff"
        )


class IsClient(permissions.BasePermission):
    """Allows access only to client users."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, "profile")
            and request.user.profile.role == "client"
        )


class IsViewer(permissions.BasePermission):
    """Allows access only to viewer users."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, "profile")
            and request.user.profile.role == "viewer"
        )


class IsAdminOrStaff(permissions.BasePermission):
    """Allows access only to admin or staff users."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, "profile")
            and request.user.profile.role in ["admin", "staff"]
        )


class IsAdminOrStaffOrClient(permissions.BasePermission):
    """Allows access only to admin, staff or client users."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, "profile")
            and request.user.profile.role in ["admin", "staff", "client"]
        )


class IsOwnerOrAdmin(permissions.BasePermission):
    """Custom permission to only allow owners of an object or admin to edit/view it."""

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request, so we'll always allow GET, HEAD, or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner of the snippet.
        return obj.user == request.user or (
            hasattr(request.user, "profile") and request.user.profile.role == "admin"
        )
