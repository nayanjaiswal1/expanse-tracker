import stripe
from django.conf import settings
from django.contrib.auth import get_user_model
from .ai_models import (
    SubscriptionPlan,
    Subscription,
    Transaction,
)  # Import Subscription and Transaction
from users.models import UserProfile  # Import UserProfile
from typing import Tuple, Dict, Any

User = get_user_model()


class StripeService:
    def __init__(self):
        stripe.api_key = settings.STRIPE_SECRET_KEY

    def create_customer(self, user: User) -> stripe.Customer:
        """Creates a new Stripe customer for the given user."""
        customer = stripe.Customer.create(
            email=user.email, name=user.username, metadata={"django_user_id": user.id}
        )
        # Store the customer ID in UserProfile
        profile, created = UserProfile.objects.get_or_create(user=user)
        profile.stripe_customer_id = customer.id
        profile.save()
        return customer

    def create_subscription(
        self, user: User, plan: SubscriptionPlan, payment_method_id: str
    ) -> Tuple[stripe.Subscription, str]:
        """Creates a new Stripe subscription for a user and plan."""
        try:
            profile = user.profile
            customer_id = profile.stripe_customer_id

            if not customer_id:
                customer = self.create_customer(user)
                customer_id = customer.id

            # Attach payment method to customer if not already attached
            try:
                stripe.PaymentMethod.attach(
                    payment_method_id,
                    customer=customer_id,
                )
            except stripe.error.StripeError as e:
                # Payment method might already be attached or invalid
                print(f"Error attaching payment method: {e}")

            # Set default payment method
            stripe.Customer.modify(
                customer_id,
                invoice_settings={"default_payment_method": payment_method_id},
            )

            # Create subscription
            subscription = stripe.Subscription.create(
                customer=customer_id,
                items=[
                    {"price": plan.stripe_price_id}
                ],  # Assuming plan has a stripe_price_id
                default_payment_method=payment_method_id,
                expand=["latest_invoice.payment_intent"],
            )

            # Handle payment intent if needed (for 3D Secure etc.)
            latest_invoice = subscription.latest_invoice
            if (
                latest_invoice
                and latest_invoice.payment_intent
                and latest_invoice.payment_intent.status == "requires_action"
            ):
                return subscription, latest_invoice.payment_intent.client_secret

            return subscription, None

        except stripe.error.CardError as e:
            return None, str(e.user_message)
        except Exception as e:
            return None, str(e)

    def cancel_subscription(self, stripe_subscription_id: str) -> stripe.Subscription:
        """Cancels a Stripe subscription."""
        subscription = stripe.Subscription.delete(stripe_subscription_id)
        return subscription

    def handle_webhook(self, payload: bytes, sig_header: str) -> Dict[str, Any]:
        """Handles incoming Stripe webhooks."""
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError as e:
            # Invalid payload
            raise ValueError("Invalid payload") from e
        except stripe.error.SignatureVerificationError as e:
            # Invalid signature
            raise ValueError("Invalid signature") from e
        except Exception as e:
            # Catch any other exceptions during webhook handling
            print(f"Error in handle_webhook: {e}")  # Log for debugging
            raise e

        # Handle the event
        event_type = event["type"]
        data = event["data"]["object"]

        if event_type == "customer.subscription.created":
            self._handle_subscription_created(data)
        elif event_type == "customer.subscription.updated":
            self._handle_subscription_updated(data)
        elif event_type == "customer.subscription.deleted":
            self._handle_subscription_deleted(data)
        elif event_type == "invoice.payment_succeeded":
            self._handle_invoice_payment_succeeded(data)
        elif event_type == "invoice.payment_failed":
            self._handle_invoice_payment_failed(data)
        # ... handle other event types

        return {"status": "success"}

    def _handle_subscription_created(self, data: Dict[str, Any]):
        print(f"Handling subscription created: {data['id']}")
        # Retrieve user based on customer ID or client_reference_id
        user_id = data.get("metadata", {}).get(
            "plan_id"
        )  # Assuming plan_id is passed as client_reference_id
        if not user_id:
            user_id = data.get(
                "customer"
            )  # Fallback to customer ID if user_id not in metadata

        try:
            user_profile = UserProfile.objects.get(stripe_customer_id=data["customer"])
            user = user_profile.user
        except UserProfile.DoesNotExist:
            print(f"UserProfile not found for customer {data['customer']}")
            return

        plan_id = data.get("metadata", {}).get("plan_id")
        try:
            subscription_plan = SubscriptionPlan.objects.get(id=plan_id)
        except SubscriptionPlan.DoesNotExist:
            print(f"SubscriptionPlan not found for ID {plan_id}")
            return

        # Create or update local Subscription object
        Subscription.objects.update_or_create(
            stripe_subscription_id=data["id"],
            defaults={
                "user": user,
                "plan": subscription_plan,
                "start_date": timezone.datetime.fromtimestamp(
                    data["current_period_start"], tz=timezone.utc
                ),
                "end_date": timezone.datetime.fromtimestamp(
                    data["current_period_end"], tz=timezone.utc
                ),
                "is_active": True,
                "current_credits": subscription_plan.credits_per_month,
            },
        )
        print(f"Local subscription created/updated for {user.email}")

    def _handle_subscription_updated(self, data: Dict[str, Any]):
        print(f"Handling subscription updated: {data['id']}")
        try:
            subscription = Subscription.objects.get(stripe_subscription_id=data["id"])
            subscription.is_active = data["status"] == "active"
            subscription.start_date = timezone.datetime.fromtimestamp(
                data["current_period_start"], tz=timezone.utc
            )
            subscription.end_date = timezone.datetime.fromtimestamp(
                data["current_period_end"], tz=timezone.utc
            )
            # Update credits if plan changed, or reset monthly credits
            # This logic might need to be more sophisticated based on your credit system
            subscription.save()
            print(f"Local subscription updated for {subscription.user.email}")
        except Subscription.DoesNotExist:
            print(f"Local subscription not found for Stripe ID {data['id']}")

    def _handle_subscription_deleted(self, data: Dict[str, Any]):
        print(f"Handling subscription deleted: {data['id']}")
        try:
            subscription = Subscription.objects.get(stripe_subscription_id=data["id"])
            subscription.is_active = False
            subscription.end_date = timezone.now()
            subscription.save()
            print(f"Local subscription deleted for {subscription.user.email}")
        except Subscription.DoesNotExist:
            print(f"Local subscription not found for Stripe ID {data['id']}")

    def _handle_invoice_payment_succeeded(self, data: Dict[str, Any]):
        print(f"Handling invoice payment succeeded: {data['id']}")
        # Find the related subscription
        stripe_subscription_id = data.get("subscription")
        if not stripe_subscription_id:
            print(f"No subscription ID found for invoice {data['id']}")
            return

        try:
            subscription = Subscription.objects.get(
                stripe_subscription_id=stripe_subscription_id
            )
            # Record a transaction in your local system
            Transaction.objects.create(
                user=subscription.user,
                subscription=subscription,
                amount=Decimal(data["amount_due"] / 100),  # Convert cents to dollars
                currency=data["currency"].upper(),
                transaction_id=data["id"],
                status="completed",
            )
            # Add credits to user's current subscription if applicable
            subscription.current_credits += subscription.plan.credits_per_month
            subscription.save()
            print(f"Payment recorded and credits added for {subscription.user.email}")
        except Subscription.DoesNotExist:
            print(
                f"Local subscription not found for Stripe ID {stripe_subscription_id}"
            )
        except Exception as e:
            print(f"Error handling invoice payment succeeded: {e}")

    def _handle_invoice_payment_failed(self, data: Dict[str, Any]):
        print(f"Handling invoice payment failed: {data['id']}")
        # Update local subscription status or notify user
        stripe_subscription_id = data.get("subscription")
        if not stripe_subscription_id:
            print(f"No subscription ID found for invoice {data['id']}")
            return
        try:
            subscription = Subscription.objects.get(
                stripe_subscription_id=stripe_subscription_id
            )
            subscription.is_active = False  # Or set to a 'past_due' status
            subscription.save()
            print(
                f"Subscription marked as inactive/past_due for {subscription.user.email}"
            )
        except Subscription.DoesNotExist:
            print(
                f"Local subscription not found for Stripe ID {stripe_subscription_id}"
            )


# You might want to instantiate this service globally or pass it around
stripe_service = StripeService()
