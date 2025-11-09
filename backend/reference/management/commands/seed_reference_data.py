"""
Management command to seed reference data (countries, currencies, languages, timezones).
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from reference.models import Country, Language, Timezone, CurrencyInfo, LocaleMapping
from finance.models.currency import Currency


class Command(BaseCommand):
    help = 'Seeds reference data for countries, currencies, languages, and timezones'

    def handle(self, *args, **options):
        self.stdout.write('Starting reference data seeding...')

        with transaction.atomic():
            self.seed_currencies()
            self.seed_countries()
            self.seed_languages()
            self.seed_timezones()
            self.seed_locale_mappings()

        self.stdout.write(self.style.SUCCESS('Successfully seeded reference data!'))

    def seed_currencies(self):
        self.stdout.write('Seeding currencies...')

        currencies_data = [
            # Common currencies
            {'code': 'USD', 'name': 'US Dollar', 'symbol': '$', 'position': 'left', 'decimals': 2, 'dec_sep': '.', 'thou_sep': ',', 'native': '$', 'plural': 'US dollars', 'common': True},
            {'code': 'EUR', 'name': 'Euro', 'symbol': '¬', 'position': 'right', 'decimals': 2, 'dec_sep': ',', 'thou_sep': '.', 'native': '¬', 'plural': 'euros', 'common': True, 'space': True},
            {'code': 'GBP', 'name': 'British Pound', 'symbol': '£', 'position': 'left', 'decimals': 2, 'dec_sep': '.', 'thou_sep': ',', 'native': '£', 'plural': 'British pounds', 'common': True},
            {'code': 'INR', 'name': 'Indian Rupee', 'symbol': '¹', 'position': 'left', 'decimals': 0, 'dec_sep': '.', 'thou_sep': ',', 'native': '¹', 'plural': 'Indian rupees', 'common': True},
            {'code': 'JPY', 'name': 'Japanese Yen', 'symbol': '¥', 'position': 'left', 'decimals': 0, 'dec_sep': '.', 'thou_sep': ',', 'native': '¥', 'plural': 'Japanese yen', 'common': True},
            {'code': 'CNY', 'name': 'Chinese Yuan', 'symbol': '¥', 'position': 'left', 'decimals': 2, 'dec_sep': '.', 'thou_sep': ',', 'native': '¥', 'plural': 'Chinese yuan', 'common': True},
            {'code': 'CAD', 'name': 'Canadian Dollar', 'symbol': 'C$', 'position': 'left', 'decimals': 2, 'dec_sep': '.', 'thou_sep': ',', 'native': '$', 'plural': 'Canadian dollars', 'common': True},
            {'code': 'AUD', 'name': 'Australian Dollar', 'symbol': 'A$', 'position': 'left', 'decimals': 2, 'dec_sep': '.', 'thou_sep': ',', 'native': '$', 'plural': 'Australian dollars', 'common': True},
            {'code': 'SGD', 'name': 'Singapore Dollar', 'symbol': 'S$', 'position': 'left', 'decimals': 2, 'dec_sep': '.', 'thou_sep': ',', 'native': '$', 'plural': 'Singapore dollars', 'common': True},
            {'code': 'HKD', 'name': 'Hong Kong Dollar', 'symbol': 'HK$', 'position': 'left', 'decimals': 2, 'dec_sep': '.', 'thou_sep': ',', 'native': '$', 'plural': 'Hong Kong dollars', 'common': True},
            {'code': 'CHF', 'name': 'Swiss Franc', 'symbol': 'Fr', 'position': 'left', 'decimals': 2, 'dec_sep': '.', 'thou_sep': ',', 'native': 'CHF', 'plural': 'Swiss francs', 'common': True},
            {'code': 'KRW', 'name': 'South Korean Won', 'symbol': '©', 'position': 'left', 'decimals': 0, 'dec_sep': '.', 'thou_sep': ',', 'native': '©', 'plural': 'South Korean won', 'common': True},
            {'code': 'MXN', 'name': 'Mexican Peso', 'symbol': 'Mex$', 'position': 'left', 'decimals': 2, 'dec_sep': '.', 'thou_sep': ',', 'native': '$', 'plural': 'Mexican pesos', 'common': True},
            {'code': 'BRL', 'name': 'Brazilian Real', 'symbol': 'R$', 'position': 'left', 'decimals': 2, 'dec_sep': ',', 'thou_sep': '.', 'native': 'R$', 'plural': 'Brazilian reals', 'common': True},
            {'code': 'ZAR', 'name': 'South African Rand', 'symbol': 'R', 'position': 'left', 'decimals': 2, 'dec_sep': '.', 'thou_sep': ',', 'native': 'R', 'plural': 'South African rand', 'common': True},
            {'code': 'AED', 'name': 'UAE Dirham', 'symbol': '/.%', 'position': 'left', 'decimals': 2, 'dec_sep': '.', 'thou_sep': ',', 'native': '/.%', 'plural': 'UAE dirhams', 'common': True},
            {'code': 'SAR', 'name': 'Saudi Riyal', 'symbol': 'ü', 'position': 'left', 'decimals': 2, 'dec_sep': '.', 'thou_sep': ',', 'native': 'ü', 'plural': 'Saudi riyals', 'common': True},
            {'code': 'NZD', 'name': 'New Zealand Dollar', 'symbol': 'NZ$', 'position': 'left', 'decimals': 2, 'dec_sep': '.', 'thou_sep': ',', 'native': '$', 'plural': 'New Zealand dollars', 'common': True},
            {'code': 'THB', 'name': 'Thai Baht', 'symbol': '?', 'position': 'left', 'decimals': 2, 'dec_sep': '.', 'thou_sep': ',', 'native': '?', 'plural': 'Thai baht', 'common': True},
            {'code': 'MYR', 'name': 'Malaysian Ringgit', 'symbol': 'RM', 'position': 'left', 'decimals': 2, 'dec_sep': '.', 'thou_sep': ',', 'native': 'RM', 'plural': 'Malaysian ringgits', 'common': True},
            {'code': 'IDR', 'name': 'Indonesian Rupiah', 'symbol': 'Rp', 'position': 'left', 'decimals': 0, 'dec_sep': ',', 'thou_sep': '.', 'native': 'Rp', 'plural': 'Indonesian rupiahs', 'common': True},
            {'code': 'PHP', 'name': 'Philippine Peso', 'symbol': '±', 'position': 'left', 'decimals': 2, 'dec_sep': '.', 'thou_sep': ',', 'native': '±', 'plural': 'Philippine pesos', 'common': True},
            {'code': 'NOK', 'name': 'Norwegian Krone', 'symbol': 'kr', 'position': 'right', 'decimals': 2, 'dec_sep': ',', 'thou_sep': '.', 'native': 'kr', 'plural': 'Norwegian kroner', 'common': True, 'space': True},
            {'code': 'SEK', 'name': 'Swedish Krona', 'symbol': 'kr', 'position': 'right', 'decimals': 2, 'dec_sep': ',', 'thou_sep': '.', 'native': 'kr', 'plural': 'Swedish kronor', 'common': True, 'space': True},
            {'code': 'DKK', 'name': 'Danish Krone', 'symbol': 'kr', 'position': 'right', 'decimals': 2, 'dec_sep': ',', 'thou_sep': '.', 'native': 'kr', 'plural': 'Danish kroner', 'common': True, 'space': True},
            {'code': 'PLN', 'name': 'Polish Zloty', 'symbol': 'zB', 'position': 'right', 'decimals': 2, 'dec_sep': ',', 'thou_sep': '.', 'native': 'zB', 'plural': 'Polish zlotys', 'common': True, 'space': True},
            {'code': 'TRY', 'name': 'Turkish Lira', 'symbol': 'º', 'position': 'left', 'decimals': 2, 'dec_sep': ',', 'thou_sep': '.', 'native': 'º', 'plural': 'Turkish liras', 'common': True},
            {'code': 'RUB', 'name': 'Russian Ruble', 'symbol': '½', 'position': 'right', 'decimals': 2, 'dec_sep': ',', 'thou_sep': '.', 'native': '½', 'plural': 'Russian rubles', 'common': True, 'space': True},
        ]

        for data in currencies_data:
            currency, created = Currency.objects.get_or_create(
                code=data['code'],
                defaults={
                    'name': data['name'],
                    'symbol': data['symbol'],
                    'symbol_position': data['position'],
                    'decimal_places': data['decimals'],
                    'decimal_separator': data['dec_sep'],
                    'thousands_separator': data['thou_sep'],
                    'is_active': True,
                    'is_base_currency': data['code'] == 'USD',
                }
            )

            # Create or update CurrencyInfo
            CurrencyInfo.objects.update_or_create(
                currency=currency,
                defaults={
                    'symbol_native': data['native'],
                    'name_plural': data['plural'],
                    'rounding': 0,
                    'space_between_amount_and_symbol': data.get('space', False),
                    'is_common': data.get('common', False),
                }
            )

            if created:
                self.stdout.write(f'  Created currency: {currency.code}')

        self.stdout.write(self.style.SUCCESS(f'Seeded {len(currencies_data)} currencies'))

    def seed_countries(self):
        self.stdout.write('Seeding countries...')

        countries_data = [
            {'code': 'US', 'name': 'United States', 'flag': '<ú<ø', 'dial': '+1', 'currency': 'USD', 'tz': 'America/New_York'},
            {'code': 'GB', 'name': 'United Kingdom', 'flag': '<ì<ç', 'dial': '+44', 'currency': 'GBP', 'tz': 'Europe/London'},
            {'code': 'IN', 'name': 'India', 'flag': '<î<ó', 'dial': '+91', 'currency': 'INR', 'tz': 'Asia/Kolkata'},
            {'code': 'CA', 'name': 'Canada', 'flag': '<è<æ', 'dial': '+1', 'currency': 'CAD', 'tz': 'America/Toronto'},
            {'code': 'AU', 'name': 'Australia', 'flag': '<æ<ú', 'dial': '+61', 'currency': 'AUD', 'tz': 'Australia/Sydney'},
            {'code': 'DE', 'name': 'Germany', 'flag': '<é<ê', 'dial': '+49', 'currency': 'EUR', 'tz': 'Europe/Berlin'},
            {'code': 'FR', 'name': 'France', 'flag': '<ë<÷', 'dial': '+33', 'currency': 'EUR', 'tz': 'Europe/Paris'},
            {'code': 'IT', 'name': 'Italy', 'flag': '<î<ù', 'dial': '+39', 'currency': 'EUR', 'tz': 'Europe/Rome'},
            {'code': 'ES', 'name': 'Spain', 'flag': '<ê<ø', 'dial': '+34', 'currency': 'EUR', 'tz': 'Europe/Madrid'},
            {'code': 'NL', 'name': 'Netherlands', 'flag': '<ó<ñ', 'dial': '+31', 'currency': 'EUR', 'tz': 'Europe/Amsterdam'},
            {'code': 'BE', 'name': 'Belgium', 'flag': '<ç<ê', 'dial': '+32', 'currency': 'EUR', 'tz': 'Europe/Brussels'},
            {'code': 'CH', 'name': 'Switzerland', 'flag': '<è<í', 'dial': '+41', 'currency': 'CHF', 'tz': 'Europe/Zurich'},
            {'code': 'AT', 'name': 'Austria', 'flag': '<æ<ù', 'dial': '+43', 'currency': 'EUR', 'tz': 'Europe/Vienna'},
            {'code': 'SE', 'name': 'Sweden', 'flag': '<ø<ê', 'dial': '+46', 'currency': 'SEK', 'tz': 'Europe/Stockholm'},
            {'code': 'NO', 'name': 'Norway', 'flag': '<ó<ô', 'dial': '+47', 'currency': 'NOK', 'tz': 'Europe/Oslo'},
            {'code': 'DK', 'name': 'Denmark', 'flag': '<é<ð', 'dial': '+45', 'currency': 'DKK', 'tz': 'Europe/Copenhagen'},
            {'code': 'FI', 'name': 'Finland', 'flag': '<ë<î', 'dial': '+358', 'currency': 'EUR', 'tz': 'Europe/Helsinki'},
            {'code': 'PL', 'name': 'Poland', 'flag': '<õ<ñ', 'dial': '+48', 'currency': 'PLN', 'tz': 'Europe/Warsaw'},
            {'code': 'IE', 'name': 'Ireland', 'flag': '<î<ê', 'dial': '+353', 'currency': 'EUR', 'tz': 'Europe/Dublin'},
            {'code': 'PT', 'name': 'Portugal', 'flag': '<õ<ù', 'dial': '+351', 'currency': 'EUR', 'tz': 'Europe/Lisbon'},
            {'code': 'JP', 'name': 'Japan', 'flag': '<ï<õ', 'dial': '+81', 'currency': 'JPY', 'tz': 'Asia/Tokyo'},
            {'code': 'CN', 'name': 'China', 'flag': '<è<ó', 'dial': '+86', 'currency': 'CNY', 'tz': 'Asia/Shanghai'},
            {'code': 'KR', 'name': 'South Korea', 'flag': '<ð<÷', 'dial': '+82', 'currency': 'KRW', 'tz': 'Asia/Seoul'},
            {'code': 'SG', 'name': 'Singapore', 'flag': '<ø<ì', 'dial': '+65', 'currency': 'SGD', 'tz': 'Asia/Singapore'},
            {'code': 'HK', 'name': 'Hong Kong', 'flag': '<í<ð', 'dial': '+852', 'currency': 'HKD', 'tz': 'Asia/Hong_Kong'},
            {'code': 'MY', 'name': 'Malaysia', 'flag': '<ò<þ', 'dial': '+60', 'currency': 'MYR', 'tz': 'Asia/Kuala_Lumpur'},
            {'code': 'TH', 'name': 'Thailand', 'flag': '<ù<í', 'dial': '+66', 'currency': 'THB', 'tz': 'Asia/Bangkok'},
            {'code': 'ID', 'name': 'Indonesia', 'flag': '<î<é', 'dial': '+62', 'currency': 'IDR', 'tz': 'Asia/Jakarta'},
            {'code': 'PH', 'name': 'Philippines', 'flag': '<õ<í', 'dial': '+63', 'currency': 'PHP', 'tz': 'Asia/Manila'},
            {'code': 'VN', 'name': 'Vietnam', 'flag': '<û<ó', 'dial': '+84', 'currency': 'VND', 'tz': 'Asia/Ho_Chi_Minh'},
            {'code': 'NZ', 'name': 'New Zealand', 'flag': '<ó<ÿ', 'dial': '+64', 'currency': 'NZD', 'tz': 'Pacific/Auckland'},
            {'code': 'BR', 'name': 'Brazil', 'flag': '<ç<÷', 'dial': '+55', 'currency': 'BRL', 'tz': 'America/Sao_Paulo'},
            {'code': 'MX', 'name': 'Mexico', 'flag': '<ò<ý', 'dial': '+52', 'currency': 'MXN', 'tz': 'America/Mexico_City'},
            {'code': 'AR', 'name': 'Argentina', 'flag': '<æ<÷', 'dial': '+54', 'currency': 'ARS', 'tz': 'America/Argentina/Buenos_Aires'},
            {'code': 'ZA', 'name': 'South Africa', 'flag': '<ÿ<æ', 'dial': '+27', 'currency': 'ZAR', 'tz': 'Africa/Johannesburg'},
            {'code': 'AE', 'name': 'United Arab Emirates', 'flag': '<æ<ê', 'dial': '+971', 'currency': 'AED', 'tz': 'Asia/Dubai'},
            {'code': 'SA', 'name': 'Saudi Arabia', 'flag': '<ø<æ', 'dial': '+966', 'currency': 'SAR', 'tz': 'Asia/Riyadh'},
            {'code': 'TR', 'name': 'Turkey', 'flag': '<ù<÷', 'dial': '+90', 'currency': 'TRY', 'tz': 'Europe/Istanbul'},
            {'code': 'RU', 'name': 'Russia', 'flag': '<÷<ú', 'dial': '+7', 'currency': 'RUB', 'tz': 'Europe/Moscow'},
            {'code': 'IL', 'name': 'Israel', 'flag': '<î<ñ', 'dial': '+972', 'currency': 'ILS', 'tz': 'Asia/Jerusalem'},
            {'code': 'EG', 'name': 'Egypt', 'flag': '<ê<ì', 'dial': '+20', 'currency': 'EGP', 'tz': 'Africa/Cairo'},
            {'code': 'NG', 'name': 'Nigeria', 'flag': '<ó<ì', 'dial': '+234', 'currency': 'NGN', 'tz': 'Africa/Lagos'},
            {'code': 'KE', 'name': 'Kenya', 'flag': '<ð<ê', 'dial': '+254', 'currency': 'KES', 'tz': 'Africa/Nairobi'},
            {'code': 'GR', 'name': 'Greece', 'flag': '<ì<÷', 'dial': '+30', 'currency': 'EUR', 'tz': 'Europe/Athens'},
            {'code': 'CZ', 'name': 'Czech Republic', 'flag': '<è<ÿ', 'dial': '+420', 'currency': 'CZK', 'tz': 'Europe/Prague'},
            {'code': 'RO', 'name': 'Romania', 'flag': '<÷<ô', 'dial': '+40', 'currency': 'RON', 'tz': 'Europe/Bucharest'},
            {'code': 'HU', 'name': 'Hungary', 'flag': '<í<ú', 'dial': '+36', 'currency': 'HUF', 'tz': 'Europe/Budapest'},
            {'code': 'UA', 'name': 'Ukraine', 'flag': '<ú<æ', 'dial': '+380', 'currency': 'UAH', 'tz': 'Europe/Kyiv'},
            {'code': 'CL', 'name': 'Chile', 'flag': '<è<ñ', 'dial': '+56', 'currency': 'CLP', 'tz': 'America/Santiago'},
            {'code': 'CO', 'name': 'Colombia', 'flag': '<è<ô', 'dial': '+57', 'currency': 'COP', 'tz': 'America/Bogota'},
            {'code': 'PE', 'name': 'Peru', 'flag': '<õ<ê', 'dial': '+51', 'currency': 'PEN', 'tz': 'America/Lima'},
            {'code': 'VE', 'name': 'Venezuela', 'flag': '<û<ê', 'dial': '+58', 'currency': 'VES', 'tz': 'America/Caracas'},
            {'code': 'PK', 'name': 'Pakistan', 'flag': '<õ<ð', 'dial': '+92', 'currency': 'PKR', 'tz': 'Asia/Karachi'},
            {'code': 'BD', 'name': 'Bangladesh', 'flag': '<ç<é', 'dial': '+880', 'currency': 'BDT', 'tz': 'Asia/Dhaka'},
            {'code': 'LK', 'name': 'Sri Lanka', 'flag': '<ñ<ð', 'dial': '+94', 'currency': 'LKR', 'tz': 'Asia/Colombo'},
            {'code': 'NP', 'name': 'Nepal', 'flag': '<ó<õ', 'dial': '+977', 'currency': 'NPR', 'tz': 'Asia/Kathmandu'},
        ]

        for data in countries_data:
            try:
                currency = Currency.objects.get(code=data['currency'])
            except Currency.DoesNotExist:
                currency = None

            country, created = Country.objects.get_or_create(
                code=data['code'],
                defaults={
                    'name': data['name'],
                    'flag': data['flag'],
                    'dial_code': data['dial'],
                    'default_currency': currency,
                    'default_timezone': data['tz'],
                    'is_active': True,
                }
            )

            if created:
                self.stdout.write(f'  Created country: {country.code} - {country.name}')

        self.stdout.write(self.style.SUCCESS(f'Seeded {len(countries_data)} countries'))

    def seed_languages(self):
        self.stdout.write('Seeding languages...')

        languages_data = [
            {'code': 'en', 'name': 'English', 'native': 'English', 'rtl': False},
            {'code': 'es', 'name': 'Spanish', 'native': 'Español', 'rtl': False},
            {'code': 'hi', 'name': 'Hindi', 'native': '9?(M&@', 'rtl': False},
            {'code': 'fr', 'name': 'French', 'native': 'Français', 'rtl': False},
            {'code': 'de', 'name': 'German', 'native': 'Deutsch', 'rtl': False},
            {'code': 'pt', 'name': 'Portuguese', 'native': 'Português', 'rtl': False},
            {'code': 'it', 'name': 'Italian', 'native': 'Italiano', 'rtl': False},
            {'code': 'nl', 'name': 'Dutch', 'native': 'Nederlands', 'rtl': False},
            {'code': 'ja', 'name': 'Japanese', 'native': 'å,ž', 'rtl': False},
            {'code': 'zh', 'name': 'Chinese', 'native': '-‡', 'rtl': False},
            {'code': 'ko', 'name': 'Korean', 'native': '\m´', 'rtl': False},
            {'code': 'ar', 'name': 'Arabic', 'native': ''D91(J)', 'rtl': True},
            {'code': 'ru', 'name': 'Russian', 'native': ' CAA:89', 'rtl': False},
        ]

        for data in languages_data:
            language, created = Language.objects.get_or_create(
                code=data['code'],
                defaults={
                    'name': data['name'],
                    'native_name': data['native'],
                    'is_rtl': data['rtl'],
                    'is_active': True,
                }
            )

            if created:
                self.stdout.write(f'  Created language: {language.code} - {language.name}')

        self.stdout.write(self.style.SUCCESS(f'Seeded {len(languages_data)} languages'))

    def seed_timezones(self):
        self.stdout.write('Seeding timezones...')

        timezones_data = [
            {'name': 'America/New_York', 'label': 'United States (Eastern)', 'offset': 'UTC-5', 'country': 'US', 'common': True},
            {'name': 'America/Chicago', 'label': 'United States (Central)', 'offset': 'UTC-6', 'country': 'US', 'common': True},
            {'name': 'America/Denver', 'label': 'United States (Mountain)', 'offset': 'UTC-7', 'country': 'US', 'common': True},
            {'name': 'America/Los_Angeles', 'label': 'United States (Pacific)', 'offset': 'UTC-8', 'country': 'US', 'common': True},
            {'name': 'America/Toronto', 'label': 'Canada (Eastern)', 'offset': 'UTC-5', 'country': 'CA', 'common': True},
            {'name': 'America/Vancouver', 'label': 'Canada (Pacific)', 'offset': 'UTC-8', 'country': 'CA', 'common': True},
            {'name': 'Europe/London', 'label': 'United Kingdom', 'offset': 'UTC+0', 'country': 'GB', 'common': True},
            {'name': 'Europe/Paris', 'label': 'France', 'offset': 'UTC+1', 'country': 'FR', 'common': True},
            {'name': 'Europe/Berlin', 'label': 'Germany', 'offset': 'UTC+1', 'country': 'DE', 'common': True},
            {'name': 'Europe/Amsterdam', 'label': 'Netherlands', 'offset': 'UTC+1', 'country': 'NL', 'common': True},
            {'name': 'Asia/Kolkata', 'label': 'India', 'offset': 'UTC+5:30', 'country': 'IN', 'common': True},
            {'name': 'Asia/Dubai', 'label': 'United Arab Emirates', 'offset': 'UTC+4', 'country': 'AE', 'common': True},
            {'name': 'Asia/Tokyo', 'label': 'Japan', 'offset': 'UTC+9', 'country': 'JP', 'common': True},
            {'name': 'Asia/Singapore', 'label': 'Singapore', 'offset': 'UTC+8', 'country': 'SG', 'common': True},
            {'name': 'Asia/Hong_Kong', 'label': 'Hong Kong', 'offset': 'UTC+8', 'country': 'HK', 'common': True},
            {'name': 'Australia/Sydney', 'label': 'Australia (Sydney)', 'offset': 'UTC+10', 'country': 'AU', 'common': True},
            {'name': 'UTC', 'label': 'UTC', 'offset': 'UTC+0', 'country': '', 'common': True},
        ]

        for data in timezones_data:
            timezone, created = Timezone.objects.get_or_create(
                name=data['name'],
                defaults={
                    'label': data['label'],
                    'offset': data['offset'],
                    'country_code': data['country'],
                    'is_common': data['common'],
                    'is_active': True,
                }
            )

            if created:
                self.stdout.write(f'  Created timezone: {timezone.name}')

        self.stdout.write(self.style.SUCCESS(f'Seeded {len(timezones_data)} timezones'))

    def seed_locale_mappings(self):
        self.stdout.write('Seeding locale mappings...')

        locale_mappings_data = [
            {'locale': 'en-US', 'lang': 'en', 'country': 'US', 'currency': 'USD'},
            {'locale': 'en-GB', 'lang': 'en', 'country': 'GB', 'currency': 'GBP'},
            {'locale': 'en-IN', 'lang': 'en', 'country': 'IN', 'currency': 'INR'},
            {'locale': 'en-CA', 'lang': 'en', 'country': 'CA', 'currency': 'CAD'},
            {'locale': 'en-AU', 'lang': 'en', 'country': 'AU', 'currency': 'AUD'},
            {'locale': 'es-ES', 'lang': 'es', 'country': 'ES', 'currency': 'EUR'},
            {'locale': 'es-MX', 'lang': 'es', 'country': 'MX', 'currency': 'MXN'},
            {'locale': 'fr-FR', 'lang': 'fr', 'country': 'FR', 'currency': 'EUR'},
            {'locale': 'de-DE', 'lang': 'de', 'country': 'DE', 'currency': 'EUR'},
            {'locale': 'pt-BR', 'lang': 'pt', 'country': 'BR', 'currency': 'BRL'},
            {'locale': 'it-IT', 'lang': 'it', 'country': 'IT', 'currency': 'EUR'},
            {'locale': 'nl-NL', 'lang': 'nl', 'country': 'NL', 'currency': 'EUR'},
            {'locale': 'ja-JP', 'lang': 'ja', 'country': 'JP', 'currency': 'JPY'},
            {'locale': 'zh-CN', 'lang': 'zh', 'country': 'CN', 'currency': 'CNY'},
            {'locale': 'ko-KR', 'lang': 'ko', 'country': 'KR', 'currency': 'KRW'},
            {'locale': 'ar-AE', 'lang': 'ar', 'country': 'AE', 'currency': 'AED'},
            {'locale': 'ru-RU', 'lang': 'ru', 'country': 'RU', 'currency': 'RUB'},
            {'locale': 'hi-IN', 'lang': 'hi', 'country': 'IN', 'currency': 'INR'},
        ]

        for data in locale_mappings_data:
            try:
                language = Language.objects.get(code=data['lang'])
            except Language.DoesNotExist:
                language = None

            try:
                country = Country.objects.get(code=data['country'])
            except Country.DoesNotExist:
                country = None

            try:
                currency = Currency.objects.get(code=data['currency'])
            except Currency.DoesNotExist:
                currency = None

            mapping, created = LocaleMapping.objects.get_or_create(
                locale_code=data['locale'],
                defaults={
                    'language': language,
                    'country': country,
                    'default_currency': currency,
                    'is_active': True,
                }
            )

            if created:
                self.stdout.write(f'  Created locale mapping: {mapping.locale_code}')

        self.stdout.write(self.style.SUCCESS(f'Seeded {len(locale_mappings_data)} locale mappings'))
