import { useState, useCallback } from 'react';
import { CURRENCIES, Currency } from '../types/currency';

export const useCurrencyModal = (initialCurrency: string = 'USD') => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(initialCurrency);

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSelect = useCallback((currencyCode: string) => {
    if (CURRENCIES[currencyCode]) {
      setSelectedCurrency(currencyCode);
    }
  }, []);

  const getCurrency = useCallback((): Currency => {
    return CURRENCIES[selectedCurrency] || CURRENCIES.USD;
  }, [selectedCurrency]);

  return {
    isOpen,
    selectedCurrency,
    openModal,
    closeModal,
    handleSelect,
    getCurrency,
  };
};

export default useCurrencyModal;
