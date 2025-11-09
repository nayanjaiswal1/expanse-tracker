/**
 * Select Component Usage Examples (2025)
 *
 * Modern, accessible, and production-ready examples
 */

import { Select } from '../components/ui/Select';
import {
  Select as RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectWithSearch,
} from '../components/ui/RadixSelect';

// ============================================
// Example 1: Simple Select (Most Common)
// ============================================
export function SimpleSelectExample() {
  const [value, setValue] = React.useState('');

  const options = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' },
  ];

  return (
    <Select
      label="Period Type"
      options={options}
      value={value}
      onChange={setValue}
      placeholder="Select period"
      required
    />
  );
}

// ============================================
// Example 2: Select with Descriptions
// ============================================
export function SelectWithDescriptionsExample() {
  const options = [
    {
      value: 'stripe',
      label: 'Stripe',
      description: 'Accept payments globally',
    },
    {
      value: 'paypal',
      label: 'PayPal',
      description: 'Trusted by millions',
    },
  ];

  return <Select label="Payment Provider" options={options} value={value} onChange={setValue} />;
}

// ============================================
// Example 3: Large List with Auto Search
// ============================================
export function LargeSelectExample() {
  // Search automatically enabled when 5+ options
  const countries = [
    { value: 'us', label: 'United States' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'ca', label: 'Canada' },
    { value: 'au', label: 'Australia' },
    { value: 'de', label: 'Germany' },
    { value: 'fr', label: 'France' },
    // ... more countries
  ];

  return (
    <Select
      label="Country"
      options={countries}
      value={value}
      onChange={setValue}
      placeholder="Select country"
    />
  );
}

// ============================================
// Example 4: Advanced Usage (Full Control)
// ============================================
export function AdvancedSelectExample() {
  return (
    <RadixSelect value={value} onValueChange={setValue}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select account type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="checking">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span>Checking Account</span>
          </div>
        </SelectItem>
        <SelectItem value="savings">
          <div className="flex items-center gap-2">
            <PiggyBank className="h-4 w-4" />
            <span>Savings Account</span>
          </div>
        </SelectItem>
      </SelectContent>
    </RadixSelect>
  );
}

// ============================================
// Example 5: Form Integration (React Hook Form)
// ============================================
export function FormSelectExample() {
  const { control } = useForm();

  return (
    <Controller
      name="category"
      control={control}
      render={({ field }) => (
        <Select
          label="Category"
          options={categoryOptions}
          value={field.value}
          onChange={field.onChange}
          required
        />
      )}
    />
  );
}

// ============================================
// Example 6: Dynamic Options
// ============================================
export function DynamicSelectExample() {
  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
  });

  const options = React.useMemo(
    () =>
      accounts?.map((acc) => ({
        value: acc.id,
        label: acc.name,
        description: acc.type,
      })) ?? [],
    [accounts]
  );

  return (
    <Select
      label="Account"
      options={options}
      value={value}
      onChange={setValue}
      disabled={isLoading}
      placeholder={isLoading ? 'Loading...' : 'Select account'}
    />
  );
}

// ============================================
// Example 7: Searchable Select (Explicit)
// ============================================
export function SearchableSelectExample() {
  const [value, setValue] = React.useState('');

  return (
    <SelectWithSearch
      label="Currency"
      options={currencyOptions}
      value={value}
      onChange={setValue}
      searchable={true}
      placeholder="Search currencies..."
    />
  );
}

// ============================================
// Pro Tips
// ============================================

/**
 * 1. Use Simple Select for most cases:
 *    - Automatically optimized
 *    - Search enabled for 5+ items
 *    - Consistent styling
 *
 * 2. Use Radix primitives for custom UI:
 *    - Full control over rendering
 *    - Custom icons/layouts
 *    - Complex interactions
 *
 * 3. Performance:
 *    - Wrap options in useMemo
 *    - Use React.memo for parent components
 *    - Virtual scrolling built-in
 *
 * 4. Accessibility:
 *    - Always include labels
 *    - Use placeholder text
 *    - Mark required fields
 */
