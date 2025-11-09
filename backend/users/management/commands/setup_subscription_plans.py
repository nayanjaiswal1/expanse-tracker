"""
Management command to set up initial subscription plans
"""

from django.core.management.base import BaseCommand
from users.models import Plan as SubscriptionPlan


class Command(BaseCommand):
    help = "Set up initial subscription plans"

    def handle(self, *args, **options):
        plans_data = [
            {
                "name": "Free Trial",
                "plan_type": "free",
                "price": 0.00,
                "ai_credits_per_month": 10,
                "max_transactions_per_month": 100,
                "max_accounts": 2,
                "features": {
                    "basic_tracking": True,
                    "ai_categorization": True,
                    "basic_analytics": True,
                    "file_upload": False,
                    "custom_categories": False,
                    "ai_invoice_generation": False,
                    "premium_support": False,
                    "api_access": False,
                },
            },
            {
                "name": "Basic Plan",
                "plan_type": "basic",
                "price": 9.99,
                "ai_credits_per_month": 100,
                "max_transactions_per_month": 1000,
                "max_accounts": 5,
                "features": {
                    "basic_tracking": True,
                    "ai_categorization": True,
                    "basic_analytics": True,
                    "file_upload": True,
                    "custom_categories": True,
                    "ai_invoice_generation": True,
                    "premium_support": False,
                    "api_access": False,
                },
            },
            {
                "name": "Premium Plan",
                "plan_type": "premium",
                "price": 24.99,
                "ai_credits_per_month": 500,
                "max_transactions_per_month": 10000,
                "max_accounts": 20,
                "features": {
                    "basic_tracking": True,
                    "ai_categorization": True,
                    "basic_analytics": True,
                    "advanced_analytics": True,
                    "file_upload": True,
                    "custom_categories": True,
                    "ai_invoice_generation": True,
                    "ai_data_analysis": True,
                    "premium_support": True,
                    "api_access": True,
                    "custom_ai_models": True,
                },
            },
            {
                "name": "Enterprise Plan",
                "plan_type": "enterprise",
                "price": 99.99,
                "ai_credits_per_month": 2000,
                "max_transactions_per_month": 100000,
                "max_accounts": 100,
                "features": {
                    "basic_tracking": True,
                    "ai_categorization": True,
                    "basic_analytics": True,
                    "advanced_analytics": True,
                    "file_upload": True,
                    "custom_categories": True,
                    "ai_invoice_generation": True,
                    "ai_data_analysis": True,
                    "premium_support": True,
                    "api_access": True,
                    "custom_ai_models": True,
                    "white_label": True,
                    "dedicated_support": True,
                    "custom_integrations": True,
                },
            },
        ]

        for plan_data in plans_data:
            plan, created = SubscriptionPlan.objects.get_or_create(
                plan_type=plan_data["plan_type"], defaults=plan_data
            )

            if created:
                self.stdout.write(
                    self.style.SUCCESS(f"Created subscription plan: {plan.name}")
                )
            else:
                # Update existing plan
                for key, value in plan_data.items():
                    setattr(plan, key, value)
                plan.save()
                self.stdout.write(
                    self.style.WARNING(f"Updated subscription plan: {plan.name}")
                )

        self.stdout.write(self.style.SUCCESS("Successfully set up subscription plans"))
