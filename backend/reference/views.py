"""
Views for reference data API endpoints.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.core.cache import cache
from .models import Country, Language, Timezone, CurrencyInfo, LocaleMapping
from finance.models.currency import Currency
from .serializers import (
    CountrySerializer,
    CurrencyDetailSerializer,
    LanguageSerializer,
    TimezoneSerializer,
    LocaleMappingSerializer,
    ReferenceDataSerializer
)


class ReferenceDataViewSet(viewsets.ViewSet):
    """
    ViewSet for retrieving reference data.
    All endpoints are read-only and publicly accessible.
    """
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'], url_path='all')
    def get_all_reference_data(self, request):
        """
        Get all reference data in a single request.
        This is cached for better performance.
        """
        cache_key = 'reference_data_all'
        cached_data = cache.get(cache_key)

        if cached_data:
            return Response(cached_data)

        # Get all active data
        countries = Country.objects.filter(is_active=True).select_related('default_currency')
        currencies = Currency.objects.filter(is_active=True).prefetch_related('info')
        languages = Language.objects.filter(is_active=True)
        timezones = Timezone.objects.filter(is_active=True)
        locale_mappings = LocaleMapping.objects.filter(is_active=True).select_related(
            'language', 'country', 'default_currency'
        )

        # Build mapping objects
        country_to_currency = {}
        for country in countries:
            if country.default_currency:
                country_to_currency[country.code] = country.default_currency.code

        locale_to_currency = {}
        locale_to_language = {}
        for mapping in locale_mappings:
            if mapping.default_currency:
                locale_to_currency[mapping.locale_code] = mapping.default_currency.code
            if mapping.language:
                locale_to_language[mapping.locale_code] = mapping.language.code

        data = {
            'countries': CountrySerializer(countries, many=True).data,
            'currencies': CurrencyDetailSerializer(currencies, many=True).data,
            'languages': LanguageSerializer(languages, many=True).data,
            'timezones': TimezoneSerializer(timezones, many=True).data,
            'locale_mappings': LocaleMappingSerializer(locale_mappings, many=True).data,
            'country_to_currency': country_to_currency,
            'locale_to_currency': locale_to_currency,
            'locale_to_language': locale_to_language,
        }

        # Cache for 1 hour
        cache.set(cache_key, data, 3600)

        return Response(data)

    @action(detail=False, methods=['get'], url_path='countries')
    def get_countries(self, request):
        """Get all active countries."""
        cache_key = 'reference_data_countries'
        cached_data = cache.get(cache_key)

        if cached_data:
            return Response(cached_data)

        countries = Country.objects.filter(is_active=True).select_related('default_currency')
        serializer = CountrySerializer(countries, many=True)
        data = serializer.data

        cache.set(cache_key, data, 3600)
        return Response(data)

    @action(detail=False, methods=['get'], url_path='currencies')
    def get_currencies(self, request):
        """Get all active currencies with extended info."""
        cache_key = 'reference_data_currencies'
        cached_data = cache.get(cache_key)

        if cached_data:
            return Response(cached_data)

        currencies = Currency.objects.filter(is_active=True).prefetch_related('info')
        serializer = CurrencyDetailSerializer(currencies, many=True)
        data = serializer.data

        cache.set(cache_key, data, 3600)
        return Response(data)

    @action(detail=False, methods=['get'], url_path='currencies/common')
    def get_common_currencies(self, request):
        """Get commonly used currencies."""
        cache_key = 'reference_data_currencies_common'
        cached_data = cache.get(cache_key)

        if cached_data:
            return Response(cached_data)

        currencies = Currency.objects.filter(
            is_active=True,
            info__is_common=True
        ).prefetch_related('info')

        serializer = CurrencyDetailSerializer(currencies, many=True)
        data = serializer.data

        cache.set(cache_key, data, 3600)
        return Response(data)

    @action(detail=False, methods=['get'], url_path='languages')
    def get_languages(self, request):
        """Get all active languages."""
        cache_key = 'reference_data_languages'
        cached_data = cache.get(cache_key)

        if cached_data:
            return Response(cached_data)

        languages = Language.objects.filter(is_active=True)
        serializer = LanguageSerializer(languages, many=True)
        data = serializer.data

        cache.set(cache_key, data, 3600)
        return Response(data)

    @action(detail=False, methods=['get'], url_path='timezones')
    def get_timezones(self, request):
        """Get all active timezones."""
        cache_key = 'reference_data_timezones'
        cached_data = cache.get(cache_key)

        if cached_data:
            return Response(cached_data)

        timezones = Timezone.objects.filter(is_active=True)
        serializer = TimezoneSerializer(timezones, many=True)
        data = serializer.data

        cache.set(cache_key, data, 3600)
        return Response(data)

    @action(detail=False, methods=['get'], url_path='timezones/common')
    def get_common_timezones(self, request):
        """Get commonly used timezones."""
        cache_key = 'reference_data_timezones_common'
        cached_data = cache.get(cache_key)

        if cached_data:
            return Response(cached_data)

        timezones = Timezone.objects.filter(is_active=True, is_common=True)
        serializer = TimezoneSerializer(timezones, many=True)
        data = serializer.data

        cache.set(cache_key, data, 3600)
        return Response(data)

    @action(detail=False, methods=['get'], url_path='locale-mappings')
    def get_locale_mappings(self, request):
        """Get all active locale mappings."""
        cache_key = 'reference_data_locale_mappings'
        cached_data = cache.get(cache_key)

        if cached_data:
            return Response(cached_data)

        mappings = LocaleMapping.objects.filter(is_active=True).select_related(
            'language', 'country', 'default_currency'
        )
        serializer = LocaleMappingSerializer(mappings, many=True)
        data = serializer.data

        cache.set(cache_key, data, 3600)
        return Response(data)
