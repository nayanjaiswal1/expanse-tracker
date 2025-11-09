import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  fetchReferenceData,
  ReferenceData,
  Country,
  Currency,
  Language,
  Timezone,
} from '../services/referenceDataService';

interface ReferenceDataContextType {
  referenceData: ReferenceData | null;
  countries: Country[];
  currencies: Currency[];
  languages: Language[];
  timezones: Timezone[];
  commonTimezones: Timezone[];
  commonCurrencies: Currency[];
  isLoading: boolean;
  error: Error | null;
  getCurrencyByCode: (code: string) => Currency | undefined;
  getCountryByCode: (code: string) => Country | undefined;
  getLanguageByCode: (code: string) => Language | undefined;
  getTimezoneByName: (name: string) => Timezone | undefined;
  getCurrencyForCountry: (countryCode: string) => string | undefined;
  getCurrencyForLocale: (localeCode: string) => string | undefined;
  getLanguageForLocale: (localeCode: string) => string | undefined;
  refreshReferenceData: () => Promise<void>;
}

const ReferenceDataContext = createContext<ReferenceDataContextType | undefined>(undefined);

export const ReferenceDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [referenceData, setReferenceData] = useState<ReferenceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadReferenceData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchReferenceData();
      setReferenceData(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load reference data');
      setError(error);
      console.error('Error loading reference data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  const getCurrencyByCode = useCallback(
    (code: string): Currency | undefined => {
      return referenceData?.currencies.find((c) => c.code === code.toUpperCase());
    },
    [referenceData]
  );

  const getCountryByCode = useCallback(
    (code: string): Country | undefined => {
      return referenceData?.countries.find((c) => c.code === code.toUpperCase());
    },
    [referenceData]
  );

  const getLanguageByCode = useCallback(
    (code: string): Language | undefined => {
      return referenceData?.languages.find((l) => l.code === code.toLowerCase());
    },
    [referenceData]
  );

  const getTimezoneByName = useCallback(
    (name: string): Timezone | undefined => {
      return referenceData?.timezones.find((t) => t.name === name);
    },
    [referenceData]
  );

  const getCurrencyForCountry = useCallback(
    (countryCode: string): string | undefined => {
      return referenceData?.country_to_currency[countryCode.toUpperCase()];
    },
    [referenceData]
  );

  const getCurrencyForLocale = useCallback(
    (localeCode: string): string | undefined => {
      return referenceData?.locale_to_currency[localeCode];
    },
    [referenceData]
  );

  const getLanguageForLocale = useCallback(
    (localeCode: string): string | undefined => {
      return referenceData?.locale_to_language[localeCode];
    },
    [referenceData]
  );

  const refreshReferenceData = useCallback(async () => {
    await loadReferenceData();
  }, [loadReferenceData]);

  const countries = referenceData?.countries || [];
  const currencies = referenceData?.currencies || [];
  const languages = referenceData?.languages || [];
  const timezones = referenceData?.timezones || [];
  const commonTimezones = timezones.filter((t) => t.is_common);
  const commonCurrencies = currencies.filter((c) =>
    c.code === 'USD' || c.code === 'EUR' || c.code === 'GBP' || c.code === 'INR' ||
    c.code === 'JPY' || c.code === 'CAD' || c.code === 'AUD'
  );

  const value: ReferenceDataContextType = {
    referenceData,
    countries,
    currencies,
    languages,
    timezones,
    commonTimezones,
    commonCurrencies,
    isLoading,
    error,
    getCurrencyByCode,
    getCountryByCode,
    getLanguageByCode,
    getTimezoneByName,
    getCurrencyForCountry,
    getCurrencyForLocale,
    getLanguageForLocale,
    refreshReferenceData,
  };

  return (
    <ReferenceDataContext.Provider value={value}>
      {children}
    </ReferenceDataContext.Provider>
  );
};

export const useReferenceData = (): ReferenceDataContextType => {
  const context = useContext(ReferenceDataContext);
  if (context === undefined) {
    throw new Error('useReferenceData must be used within a ReferenceDataProvider');
  }
  return context;
};

// Convenience hooks for specific data types
export const useCountries = () => {
  const { countries, isLoading } = useReferenceData();
  return { countries, isLoading };
};

export const useCurrencies = () => {
  const { currencies, commonCurrencies, isLoading } = useReferenceData();
  return { currencies, commonCurrencies, isLoading };
};

export const useLanguages = () => {
  const { languages, isLoading } = useReferenceData();
  return { languages, isLoading };
};

export const useTimezones = () => {
  const { timezones, commonTimezones, isLoading } = useReferenceData();
  return { timezones, commonTimezones, isLoading };
};
