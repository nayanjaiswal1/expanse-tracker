import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Investment } from '../../../hooks/finance';

const investmentFormSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required').max(10).toUpperCase(),
  name: z.string().min(1, 'Name is required').max(200),
  type: z.enum(['stock', 'mutual_fund', 'etf', 'bond', 'crypto', 'other']),
  current_price: z
    .string()
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
      'Price must be a positive number'
    ),
  sector: z.string().optional(),
  broker: z.string().optional(),
});

export type InvestmentFormValues = z.infer<typeof investmentFormSchema>;

export function useInvestmentForm(editingInvestment?: Investment | null) {
  const getDefaultValues = (): InvestmentFormValues => {
    if (editingInvestment) {
      return {
        symbol: editingInvestment.symbol,
        name: editingInvestment.name,
        type: (editingInvestment.type as any) || 'stock',
        current_price: editingInvestment.current_price?.toString() || '0',
        sector: editingInvestment.sector || '',
        broker: '',
      };
    }

    return {
      symbol: '',
      name: '',
      type: 'stock',
      current_price: '0',
      sector: '',
      broker: '',
    };
  };

  const form = useForm<InvestmentFormValues>({
    resolver: zodResolver(investmentFormSchema),
    defaultValues: getDefaultValues(),
  });

  const prepareSubmitData = (values: InvestmentFormValues) => ({
    symbol: values.symbol.toUpperCase(),
    name: values.name,
    type: values.type,
    current_price: parseFloat(values.current_price) || 0,
    sector: values.sector || '',
    broker: values.broker || '',
  });

  return {
    form,
    prepareSubmitData,
  };
}
