from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from django.db import transaction
from ..models.currency import Currency
from ..serializers import CurrencySerializer, CurrencyListSerializer, CurrencyInfoSerializer

class CurrencyViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows currencies to be viewed or edited.
    """
    queryset = Currency.objects.all()
    serializer_class = CurrencySerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'list':
            if self.request.query_params.get('public') == 'true':
                return CurrencyInfoSerializer
            return CurrencyListSerializer
        return CurrencySerializer
    
    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'set_as_base']:
            permission_classes = [IsAdminUser]
        elif self.action == 'list' and self.request.query_params.get('public') == 'true':
            # Public access for currency info
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
        
    def get_queryset(self):
        """
        Optionally restricts the returned currencies to active ones for public access
        """
        queryset = super().get_queryset()
        if self.request.query_params.get('public') == 'true':
            queryset = queryset.filter(is_active=True)
        return queryset
    
    @action(detail=True, methods=['post'])
    def set_as_base(self, request, pk=None):
        """
        Set a currency as the base currency.
        """
        currency = self.get_object()
        
        with transaction.atomic():
            # Set all currencies to not be base
            Currency.objects.filter(is_base_currency=True).update(is_base_currency=False)
            
            # Set the selected currency as base
            currency.is_base_currency = True
            currency.exchange_rate = 1.0  # Base currency always has rate 1.0
            currency.save()
            
            # Update all other currencies' exchange rates relative to the new base
            # In a real app, you would fetch these from an exchange rate API
            pass  # Implementation for updating exchange rates would go here
            
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def popular(self, request):
        """
        Get a list of popular currencies with basic info
        """
        popular_codes = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR']
        currencies = Currency.objects.filter(
            code__in=popular_codes,
            is_active=True
        ).order_by('code')
        serializer = self.get_serializer(currencies, many=True)
        return Response(serializer.data)
        return Response({'status': 'Base currency updated'})
    
    def list(self, request, *args, **kwargs):
        """
        Override to provide a list of active currencies by default.
        """
        queryset = self.filter_queryset(self.get_queryset().filter(is_active=True))
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
