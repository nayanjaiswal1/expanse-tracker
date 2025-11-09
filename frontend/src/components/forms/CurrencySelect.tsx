import React from 'react';
import { CURRENCIES } from '../../types/currency';
import { Select } from '../ui/Select';

interface CurrencySelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export const CurrencySelect: React.FC<CurrencySelectProps> = ({
  value,
  onChange,
  className = '',
  disabled = false,
}) => {
  const currencyOptions = Object.entries(CURRENCIES).map(([code, currency]) => ({
    value: code,
    label: `${currency.code} - ${currency.name} (${currency.symbol})`,
  }));

  return (
    <Select
      options={currencyOptions}
      value={value}
      onChange={onChange}
      className={className}
      disabled={disabled}
    />
  );
};

export default CurrencySelect;
