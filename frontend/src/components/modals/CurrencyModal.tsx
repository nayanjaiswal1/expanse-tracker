import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import { CURRENCIES, Currency } from '../../types/currency';
import { Button } from '../ui/Button';

interface CurrencyModalProps {
  isOpen: boolean;
  selectedCurrency: string;
  onSelect: (currencyCode: string) => void;
  onClose: () => void;
}

export const CurrencyModal: React.FC<CurrencyModalProps> = ({
  isOpen,
  selectedCurrency,
  onSelect,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCurrencies = Object.entries(CURRENCIES).filter(([code, currency]) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      code.toLowerCase().includes(searchLower) ||
      currency.name.toLowerCase().includes(searchLower) ||
      currency.symbol.includes(searchTerm)
    );
  });

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-6">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
              Select Currency
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Search currency..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="max-h-96 overflow-y-auto">
            {filteredCurrencies.map(([code, currency]) => (
              <button
                key={code}
                className={`w-full flex items-center justify-between p-3 rounded-md mb-1 ${
                  selectedCurrency === code
                    ? 'bg-blue-100 dark:bg-blue-900/50'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                onClick={() => {
                  onSelect(code);
                  onClose();
                }}
              >
                <div className="flex items-center">
                  <span className="font-medium text-gray-900 dark:text-white">{currency.name}</span>
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">{code}</span>
                </div>
                <span className="text-gray-600 dark:text-gray-300">{currency.symbol}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default CurrencyModal;
