import { forwardRef, useMemo, useState } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '../../lib/utils';

// Modern React 19: Compound component pattern with Radix UI primitives

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      // Clean, consistent design system
      'flex h-10 w-full items-center justify-between rounded-md',
      'border border-gray-300 dark:border-gray-600',
      'bg-white dark:bg-gray-800',
      'px-3 py-2 text-sm',
      'text-gray-900 dark:text-white',
      'placeholder:text-gray-400 dark:placeholder:text-gray-500',
      // Modern transitions
      'transition-colors duration-200',
      'hover:border-gray-400 dark:hover:border-gray-500',
      // Focus states with ring
      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
      'dark:focus:ring-offset-gray-900 focus:border-blue-500 dark:focus:border-blue-400',
      // Disabled state
      'disabled:cursor-not-allowed disabled:opacity-50',
      // Data states for better UX
      'data-[placeholder]:text-gray-400 dark:data-[placeholder]:text-gray-500',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50 transition-transform duration-200 data-[state=open]:rotate-180" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn('flex cursor-default items-center justify-center py-1', className)}
    {...props}
  >
    <ChevronDown className="h-4 w-4 rotate-180" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn('flex cursor-default items-center justify-center py-1', className)}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        // Modern portal positioning with animations
        'relative z-50 max-h-96 min-w-[8rem] overflow-hidden',
        'rounded-lg border border-gray-300 dark:border-gray-600',
        'bg-white dark:bg-gray-800',
        'text-gray-900 dark:text-white shadow-lg',
        // 2025 animations using data attributes
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
        'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        position === 'popper' &&
          'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          'p-1',
          position === 'popper' &&
            'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]'
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('px-2 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300', className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      // 2025 interactive states
      'relative flex w-full cursor-pointer select-none items-center',
      'rounded-md py-2 pl-8 pr-2 text-sm outline-none',
      // Hover & focus states
      'transition-colors duration-150',
      'hover:bg-gray-100 dark:hover:bg-gray-700/50',
      'focus:bg-gray-100 dark:focus:bg-gray-700',
      // Selected state
      'data-[state=checked]:bg-blue-50 dark:data-[state=checked]:bg-blue-900/30',
      'data-[state=checked]:text-blue-700 dark:data-[state=checked]:text-blue-300',
      // Disabled state
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-gray-200 dark:bg-gray-700', className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

// Enhanced wrapper component with search functionality (2025 pattern)
interface Option {
  value: string | number;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface SelectWithSearchProps {
  options: Option[];
  value?: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  allowClear?: boolean;
  searchable?: boolean;
  className?: string;
  wrapperClassName?: string;
}

export function SelectWithSearch({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  label,
  required = false,
  disabled = false,
  searchable = true,
  className,
  wrapperClassName,
}: SelectWithSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Modern useMemo for performance
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchTerm) return options;

    const term = searchTerm.toLowerCase();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(term) ||
        option.description?.toLowerCase().includes(term)
    );
  }, [options, searchTerm, searchable]);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  return (
    <div className={cn('w-full', wrapperClassName)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <Select value={value?.toString()} onValueChange={(val) => onChange(val)} disabled={disabled}>
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder}>
            {selectedOption && (
              <div className="flex flex-col">
                <span className="text-sm text-gray-900 dark:text-white">
                  {selectedOption.label}
                </span>
                {selectedOption.description && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedOption.description}
                  </span>
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {searchable && options.length > 5 && (
            <div className="p-2 border-b border-gray-200 dark:border-gray-600">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search options..."
                  className="w-full pl-8 pr-2 py-1.5 text-sm bg-transparent text-gray-900 dark:text-white border-0 focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  autoComplete="off"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}
          <SelectGroup>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value.toString()}
                  disabled={option.disabled}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {option.description}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))
            ) : (
              <div className="px-4 py-6 text-center">
                <div className="text-sm text-gray-500 dark:text-gray-400">No options found</div>
              </div>
            )}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

SelectWithSearch.displayName = 'SelectWithSearch';

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
