from django.apps import AppConfig


class FinanceConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "finance"
    verbose_name = "Finance Management"

    def ready(self):
        """
        Override this method to perform initialization tasks when the app is ready.
        """
        # Import signals when app is ready
        try:
            import finance.signals  # noqa: F401
        except ImportError:
            # Skip if signals module doesn't exist
            pass
