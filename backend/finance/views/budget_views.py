"""
Budget-related views for the finance app.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Prefetch
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal

from users.pagination import CustomPageNumberPagination
from ..models import (
    Budget, BudgetCategory, BudgetTemplate,
    BudgetTemplateCategory, Category
)
from ..serializers import (
    BudgetSerializer, BudgetCategorySerializer,
    BudgetTemplateSerializer, BudgetTemplateCategorySerializer,
    BudgetCreateFromTemplateSerializer, BudgetSummarySerializer
)

from ..filters import BudgetFilter

class BudgetViewSet(viewsets.ModelViewSet):
    """ViewSet for budget management"""

    serializer_class = BudgetSerializer
    pagination_class = CustomPageNumberPagination
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = BudgetFilter
    ordering_fields = ["name", "amount", "start_date", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return Budget.objects.filter(user=self.request.user).prefetch_related(
            'category_allocations__category'
        )

    def get_serializer_class(self):
        if self.action == 'list':
            return BudgetSummarySerializer
        return BudgetSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current active budget"""
        today = timezone.now().date()
        current_budget = Budget.objects.filter(
            user=request.user,
            is_active=True,
            start_date__lte=today,
            end_date__gte=today
        ).prefetch_related('category_allocations__category').first()

        if current_budget:
            serializer = self.get_serializer(current_budget)
            return Response(serializer.data)
        else:
            return Response(
                {'detail': 'No active budget found for current period'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def create_from_template(self, request, pk=None):
        """Create budget from template"""
        serializer = BudgetCreateFromTemplateSerializer(
            data=request.data, context={'request': request}
        )
        if serializer.is_valid():
            try:
                template = BudgetTemplate.objects.get(id=serializer.validated_data['template_id'])

                # Create budget
                budget = Budget.objects.create(
                    user=request.user,
                    name=serializer.validated_data['name'],
                    start_date=serializer.validated_data['start_date'],
                    end_date=serializer.validated_data['end_date'],
                    total_amount=serializer.validated_data.get('total_amount', template.total_amount),
                    period_type=template.period_type
                )

                # Create category allocations from template
                for template_category in template.category_allocations.all():
                    if template_category.allocation_type == 'percentage':
                        # Calculate amount from percentage
                        allocated_amount = (budget.total_amount * template_category.allocation_value) / 100
                    else:
                        allocated_amount = template_category.allocation_value

                    BudgetCategory.objects.create(
                        budget=budget,
                        category=template_category.category,
                        allocated_amount=allocated_amount,
                        alert_threshold=template_category.alert_threshold,
                        is_essential=template_category.is_essential,
                        notes=template_category.notes
                    )

                # Update template usage count
                template.usage_count += 1
                template.save()

                response_serializer = BudgetSerializer(budget, context={'request': request})
                return Response(response_serializer.data, status=status.HTTP_201_CREATED)

            except BudgetTemplate.DoesNotExist:
                return Response(
                    {'error': 'Template not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """Get budget analytics and insights"""
        budget = self.get_object()

        # Calculate spending trends by day - OPTIMIZED: single query instead of N queries
        from django.db.models import Sum
        from ..models import Transaction

        # Get all spending for the date range in a single query
        end_date = min(budget.end_date, timezone.now().date())
        daily_totals = Transaction.objects.filter(
            user=request.user,
            date__gte=budget.start_date,
            date__lte=end_date,
            is_credit=False,  # Expenses only
            status='active'
        ).values('date').annotate(
            total=Sum('amount')
        ).order_by('date')

        # Create lookup dict for O(1) access
        spending_by_date = {item['date']: abs(item['total'] or Decimal('0')) for item in daily_totals}

        # Build complete daily spending list (including zero days)
        daily_spending = []
        current_date = budget.start_date
        while current_date <= end_date:
            daily_spending.append({
                'date': current_date,
                'amount': spending_by_date.get(current_date, Decimal('0'))
            })
            current_date += timedelta(days=1)

        # Category spending breakdown
        category_breakdown = []
        for allocation in budget.category_allocations.all():
            category_breakdown.append({
                'category': allocation.category.name,
                'allocated': allocation.allocated_amount,
                'spent': allocation.spent_amount,
                'remaining': allocation.remaining_amount,
                'percentage_used': allocation.spent_percentage,
                'is_over_budget': allocation.is_over_budget,
                'color': allocation.category.color
            })

        return Response({
            'daily_spending': daily_spending,
            'category_breakdown': category_breakdown,
            'total_budget': budget.total_amount,
            'total_spent': sum(a.spent_amount for a in budget.category_allocations.all()),
            'days_remaining': budget.days_remaining,
            'average_daily_spending': sum(day['amount'] for day in daily_spending) / len(daily_spending) if daily_spending else 0
        })



    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get budgets summary statistics"""
        budgets = self.get_queryset()
        today = timezone.now().date()

        active_budgets = budgets.filter(
            is_active=True,
            start_date__lte=today,
            end_date__gte=today
        )

        total_budget_amount = sum(b.total_amount for b in budgets)
        total_spent = sum(
            sum(a.spent_amount for a in b.category_allocations.all())
            for b in budgets
        )

        return Response({
            'total_budgets': budgets.count(),
            'active_budgets': active_budgets.count(),
            'total_budget_amount': total_budget_amount,
            'total_spent': total_spent,
        }, status=status.HTTP_200_OK)


class BudgetCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for budget category allocations"""

    serializer_class = BudgetCategorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return BudgetCategory.objects.filter(
            budget__user=self.request.user
        ).select_related('budget', 'category')

    def perform_create(self, serializer):
        # Ensure the budget belongs to the user
        budget = serializer.validated_data['budget']
        if budget.user != self.request.user:
            raise permissions.PermissionDenied("Budget not found")
        serializer.save()


class BudgetTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for budget templates"""

    serializer_class = BudgetTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Return user's own templates and public templates
        return BudgetTemplate.objects.filter(
            Q(user=self.request.user) | Q(is_public=True)
        ).prefetch_related('category_allocations__category')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def my_templates(self, request):
        """Get only user's own templates"""
        templates = BudgetTemplate.objects.filter(user=request.user)
        serializer = self.get_serializer(templates, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def public_templates(self, request):
        """Get only public templates"""
        templates = BudgetTemplate.objects.filter(is_public=True)
        serializer = self.get_serializer(templates, many=True)
        return Response(serializer.data)


class BudgetTemplateCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for budget template category allocations"""

    serializer_class = BudgetTemplateCategorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return BudgetTemplateCategory.objects.filter(
            Q(template__user=self.request.user) | Q(template__is_public=True)
        ).select_related('template', 'category')

    def perform_create(self, serializer):
        # Ensure the template belongs to the user
        template = serializer.validated_data['template']
        if template.user != self.request.user:
            raise permissions.PermissionDenied("Template not found")
        serializer.save()