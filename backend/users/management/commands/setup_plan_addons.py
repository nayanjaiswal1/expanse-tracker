"""
Management command to set up initial plan add-ons and templates
"""

from django.core.management.base import BaseCommand
from users.models import Plan as PlanAddon, Plan as SubscriptionPlan, Plan as PlanTemplate
# Note: TemplateAddon model has been replaced by included_addons ManyToMany relationship


class Command(BaseCommand):
    help = "Set up initial plan add-ons and templates"

    def handle(self, *args, **options):
        # Create add-ons
        addons_data = [
            {
                "name": "Extra AI Credits - 100",
                "addon_type": "credits",
                "description": "Add 100 additional AI credits per month",
                "price": 5.99,
                "billing_cycle": "monthly",
                "credits_amount": 100,
                "is_stackable": True,
                "max_quantity": 10,
                "feature_flags": {},
            },
            {
                "name": "Extra AI Credits - 500",
                "addon_type": "credits",
                "description": "Add 500 additional AI credits per month",
                "price": 24.99,
                "billing_cycle": "monthly",
                "credits_amount": 500,
                "is_stackable": True,
                "max_quantity": 5,
                "feature_flags": {},
            },
            {
                "name": "Transaction Boost",
                "addon_type": "transactions",
                "description": "Increase transaction limit by 5,000 per month",
                "price": 9.99,
                "billing_cycle": "monthly",
                "transaction_increase": 5000,
                "is_stackable": True,
                "max_quantity": 20,
                "feature_flags": {},
            },
            {
                "name": "Extra Accounts",
                "addon_type": "accounts",
                "description": "Add 5 more account connections",
                "price": 7.99,
                "billing_cycle": "monthly",
                "account_increase": 5,
                "is_stackable": True,
                "max_quantity": 10,
                "feature_flags": {},
            },
            {
                "name": "Premium Storage",
                "addon_type": "storage",
                "description": "10GB additional cloud storage for documents",
                "price": 4.99,
                "billing_cycle": "monthly",
                "storage_gb": 10,
                "is_stackable": True,
                "max_quantity": 100,
                "feature_flags": {},
            },
            {
                "name": "API Access",
                "addon_type": "integrations",
                "description": "Full REST API access with 10,000 requests/month",
                "price": 19.99,
                "billing_cycle": "monthly",
                "feature_flags": {
                    "api_access": True,
                    "webhook_support": True,
                    "custom_integrations": True,
                },
                "is_stackable": False,
                "max_quantity": 1,
            },
            {
                "name": "Priority Support",
                "addon_type": "support",
                "description": "24/7 priority email and chat support",
                "price": 14.99,
                "billing_cycle": "monthly",
                "feature_flags": {
                    "priority_support": True,
                    "dedicated_support": True,
                    "phone_support": True,
                },
                "is_stackable": False,
                "max_quantity": 1,
            },
            {
                "name": "Advanced AI Features",
                "addon_type": "features",
                "description": "Custom AI models, advanced analytics, and forecasting",
                "price": 29.99,
                "billing_cycle": "monthly",
                "feature_flags": {
                    "custom_ai_models": True,
                    "advanced_analytics": True,
                    "financial_forecasting": True,
                    "custom_reports": True,
                },
                "is_stackable": False,
                "max_quantity": 1,
            },
            {
                "name": "White Label",
                "addon_type": "features",
                "description": "Remove branding and customize with your logo",
                "price": 49.99,
                "billing_cycle": "monthly",
                "feature_flags": {
                    "white_label": True,
                    "custom_branding": True,
                    "custom_domain": True,
                },
                "is_stackable": False,
                "max_quantity": 1,
            },
            {
                "name": "Yearly AI Credits - 2000",
                "addon_type": "credits",
                "description": "2000 AI credits charged yearly (save 20%)",
                "price": 199.99,
                "billing_cycle": "yearly",
                "credits_amount": 167,  # 2000/12 per month
                "is_stackable": True,
                "max_quantity": 3,
                "feature_flags": {},
            },
        ]

        created_addons = {}
        for addon_data in addons_data:
            addon, created = PlanAddon.objects.get_or_create(
                name=addon_data["name"], defaults=addon_data
            )

            if created:
                self.stdout.write(self.style.SUCCESS(f"Created add-on: {addon.name}"))
            else:
                # Update existing addon
                for key, value in addon_data.items():
                    setattr(addon, key, value)
                addon.save()
                self.stdout.write(self.style.WARNING(f"Updated add-on: {addon.name}"))

            created_addons[addon.name] = addon

        # Set up plan compatibility
        try:
            free_plan = SubscriptionPlan.objects.get(plan_type="free")
            basic_plan = SubscriptionPlan.objects.get(plan_type="basic")
            premium_plan = SubscriptionPlan.objects.get(plan_type="premium")
            enterprise_plan = SubscriptionPlan.objects.get(plan_type="enterprise")

            # Free plan - only basic add-ons
            free_compatible = [
                "Extra AI Credits - 100",
                "Transaction Boost",
                "Extra Accounts",
            ]

            # Basic plan - most add-ons
            basic_compatible = [
                "Extra AI Credits - 100",
                "Extra AI Credits - 500",
                "Transaction Boost",
                "Extra Accounts",
                "Premium Storage",
                "API Access",
                "Priority Support",
                "Yearly AI Credits - 2000",
            ]

            # Premium and Enterprise - all add-ons
            premium_compatible = list(created_addons.keys())

            # Set compatibility
            for addon_name in free_compatible:
                if addon_name in created_addons:
                    created_addons[addon_name].compatible_plans.add(free_plan)

            for addon_name in basic_compatible:
                if addon_name in created_addons:
                    created_addons[addon_name].compatible_plans.add(basic_plan)

            for addon_name in premium_compatible:
                if addon_name in created_addons:
                    created_addons[addon_name].compatible_plans.add(
                        premium_plan, enterprise_plan
                    )

        except SubscriptionPlan.DoesNotExist:
            self.stdout.write(
                self.style.WARNING(
                    "Subscription plans not found. Run setup_subscription_plans first."
                )
            )

        # Create plan templates
        templates_data = [
            {
                "name": "Freelancer Pro",
                "description": "Perfect for freelancers and consultants who need AI-powered invoicing",
                "base_plan": "basic",
                "addons": [("Extra AI Credits - 100", 2), ("API Access", 1)],
                "discount_percentage": 10,
                "is_featured": True,
                "target_user_types": ["freelancer", "consultant"],
            },
            {
                "name": "Agency Powerhouse",
                "description": "Comprehensive solution for agencies managing multiple clients",
                "base_plan": "premium",
                "addons": [
                    ("Extra AI Credits - 500", 1),
                    ("Transaction Boost", 2),
                    ("Extra Accounts", 3),
                    ("Priority Support", 1),
                ],
                "discount_percentage": 15,
                "is_featured": True,
                "target_user_types": ["agency", "business"],
            },
            {
                "name": "Enterprise Suite",
                "description": "Full-featured solution with white labeling and advanced features",
                "base_plan": "enterprise",
                "addons": [
                    ("Advanced AI Features", 1),
                    ("White Label", 1),
                    ("Priority Support", 1),
                    ("Premium Storage", 5),
                ],
                "discount_percentage": 20,
                "is_featured": False,
                "target_user_types": ["enterprise", "corporation"],
            },
            {
                "name": "AI Power User",
                "description": "Maximum AI credits for heavy automation users",
                "base_plan": "premium",
                "addons": [("Extra AI Credits - 500", 3), ("Advanced AI Features", 1)],
                "discount_percentage": 12,
                "is_featured": False,
                "target_user_types": ["power_user", "developer"],
            },
        ]

        for template_data in templates_data:
            try:
                base_plan = SubscriptionPlan.objects.get(
                    plan_type=template_data["base_plan"]
                )

                template, created = PlanTemplate.objects.get_or_create(
                    name=template_data["name"],
                    defaults={
                        "description": template_data["description"],
                        "base_plan": base_plan,
                        "discount_percentage": template_data["discount_percentage"],
                        "is_featured": template_data["is_featured"],
                        "target_user_types": template_data["target_user_types"],
                        "total_price": 0,  # Will be calculated
                    },
                )

                if created or True:  # Always update for now
                    # Clear existing template addons
                    template.template_addons.all().delete()

                    # Add template addons
                    for addon_name, quantity in template_data["addons"]:
                        if addon_name in created_addons:
                            TemplateAddon.objects.create(
                                template=template,
                                addon=created_addons[addon_name],
                                quantity=quantity,
                            )

                    # Calculate total price
                    template.calculate_total_price()

                    if created:
                        self.stdout.write(
                            self.style.SUCCESS(f"Created template: {template.name}")
                        )
                    else:
                        self.stdout.write(
                            self.style.WARNING(f"Updated template: {template.name}")
                        )

            except SubscriptionPlan.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(
                        f"Base plan not found for template: {template_data['name']}"
                    )
                )

        self.stdout.write(
            self.style.SUCCESS("Successfully set up plan add-ons and templates")
        )
