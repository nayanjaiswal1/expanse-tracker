"""
Admin configuration for reference data models.
"""
from django.contrib import admin
from .models import Country, Language, Timezone, CurrencyInfo, LocaleMapping


@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'flag', 'dial_code', 'default_currency', 'is_active']
    list_filter = ['is_active']
    search_fields = ['code', 'name', 'dial_code']
    ordering = ['name']


@admin.register(Language)
class LanguageAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'native_name', 'is_rtl', 'is_active']
    list_filter = ['is_active', 'is_rtl']
    search_fields = ['code', 'name', 'native_name']
    ordering = ['name']


@admin.register(Timezone)
class TimezoneAdmin(admin.ModelAdmin):
    list_display = ['name', 'label', 'offset', 'country_code', 'is_common', 'is_active']
    list_filter = ['is_common', 'is_active', 'country_code']
    search_fields = ['name', 'label']
    ordering = ['label']


@admin.register(CurrencyInfo)
class CurrencyInfoAdmin(admin.ModelAdmin):
    list_display = ['currency', 'symbol_native', 'name_plural', 'is_common']
    list_filter = ['is_common']
    search_fields = ['currency__code', 'currency__name']


@admin.register(LocaleMapping)
class LocaleMappingAdmin(admin.ModelAdmin):
    list_display = ['locale_code', 'language', 'country', 'default_currency', 'is_active']
    list_filter = ['is_active']
    search_fields = ['locale_code']
    ordering = ['locale_code']
