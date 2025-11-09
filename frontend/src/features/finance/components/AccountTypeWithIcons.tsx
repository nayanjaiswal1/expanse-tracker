import React, { useState } from 'react';
import clsx from 'clsx';
import { isAccountIconUrl, getAccountIcon } from '../utils/accountIcons';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Camera, Globe, PlusCircle } from 'lucide-react';
import { HStack } from '../../../components/ui/Layout';

interface AccountTypeWithIconsProps {
  value?: string;
  onChange: (value: string) => void;
  accountTypeOptions: Array<{ value: string; label: string; icon: string }>;
  defaultIconOptions: Array<{ value: string; label: string }>;
  bankSuggestions?: Array<{
    name: string;
    identifier: string;
    icon_url: string;
    accent_color?: string;
    website?: string;
  }>;
  onSelectBankIcon?: (iconUrl: string) => void;
}

export const AccountTypeWithIcons: React.FC<AccountTypeWithIconsProps> = ({
  value,
  onChange,
  accountTypeOptions,
  defaultIconOptions,
  bankSuggestions = [],
  onSelectBankIcon,
}) => {
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [selectedAccountType, setSelectedAccountType] = useState<string>('');
  const [selectedIcon, setSelectedIcon] = useState<string>('');

  // Parse the current value to determine account type and icon
  React.useEffect(() => {
    if (value) {
      // Check if it's a custom image URL
      if (isAccountIconUrl(value)) {
        setSelectedIcon(value);
        setSelectedAccountType('');
      } else {
        // It's a default icon, find matching account type
        const matchingType = accountTypeOptions.find((type) => type.icon === value);
        if (matchingType) {
          setSelectedAccountType(matchingType.value);
          setSelectedIcon(value);
        } else {
          setSelectedIcon(value);
        }
      }
    }
  }, [value, accountTypeOptions]);

  const handleAccountTypeSelect = (accountType: string) => {
    const typeOption = accountTypeOptions.find((type) => type.value === accountType);
    if (typeOption) {
      setSelectedAccountType(accountType);
      setSelectedIcon(typeOption.icon);
      onChange(typeOption.icon);
    }
  };

  const handleIconSelect = (icon: string) => {
    setSelectedIcon(icon);
    onChange(icon);
  };

  const handleCustomUrlApply = () => {
    if (!customImageUrl.trim()) return;
    onChange(customImageUrl.trim());
    setCustomImageUrl('');
  };

  const renderAccountTypeOption = (option: { value: string; label: string; icon: string }) => {
    const IconComponent = getAccountIcon(option.icon);
    const isActive = selectedAccountType === option.value;

    // Define unique colors for each account type
    const getAccountTypeColor = (type: string) => {
      const colors = {
        checking: 'blue',
        savings: 'green',
        credit: 'purple',
        investment: 'orange',
        loan: 'red',
        cash: 'yellow',
        other: 'gray',
      };
      return colors[type as keyof typeof colors] || 'gray';
    };

    const color = getAccountTypeColor(option.value);
    const colorClasses = {
      blue: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-600',
        ring: 'ring-blue-500 dark:ring-blue-400',
        icon: 'text-blue-600 dark:text-blue-400',
        iconBg: 'bg-blue-100 dark:bg-blue-800',
      },
      green: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-600',
        ring: 'ring-green-500 dark:ring-green-400',
        icon: 'text-green-600 dark:text-green-400',
        iconBg: 'bg-green-100 dark:bg-green-800',
      },
      purple: {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-200 dark:border-purple-600',
        ring: 'ring-purple-500 dark:ring-purple-400',
        icon: 'text-purple-600 dark:text-purple-400',
        iconBg: 'bg-purple-100 dark:bg-purple-800',
      },
      orange: {
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        border: 'border-orange-200 dark:border-orange-600',
        ring: 'ring-orange-500 dark:ring-orange-400',
        icon: 'text-orange-600 dark:text-orange-400',
        iconBg: 'bg-orange-100 dark:bg-orange-800',
      },
      red: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-600',
        ring: 'ring-red-500 dark:ring-red-400',
        icon: 'text-red-600 dark:text-red-400',
        iconBg: 'bg-red-100 dark:bg-red-800',
      },
      yellow: {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        border: 'border-yellow-200 dark:border-yellow-600',
        ring: 'ring-yellow-500 dark:ring-yellow-400',
        icon: 'text-yellow-600 dark:text-yellow-400',
        iconBg: 'bg-yellow-100 dark:bg-yellow-800',
      },
      gray: {
        bg: 'bg-gray-50 dark:bg-gray-900/20',
        border: 'border-gray-200 dark:border-gray-600',
        ring: 'ring-gray-500 dark:ring-gray-400',
        icon: 'text-gray-600 dark:text-gray-400',
        iconBg: 'bg-gray-100 dark:bg-gray-800',
      },
    };

    const colorClass = colorClasses[color as keyof typeof colorClasses];

    return (
      <button
        key={option.value}
        type="button"
        onClick={() => handleAccountTypeSelect(option.value)}
        className={clsx(
          'group flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border-2 transition-all duration-300',
          'bg-white dark:bg-gray-800 hover:shadow-lg hover:scale-105 hover:-translate-y-1',
          'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
          isActive && [
            `ring-2 ${colorClass.ring}`,
            colorClass.bg,
            colorClass.border,
            'shadow-lg scale-105 -translate-y-1',
          ]
        )}
      >
        <span
          className={clsx(
            'flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg transition-all duration-300',
            'group-hover:scale-110 group-hover:shadow-xl',
            isActive ? colorClass.iconBg : 'bg-gray-100 dark:bg-gray-700'
          )}
        >
          <IconComponent
            className={clsx(
              'h-7 w-7 transition-colors duration-300',
              isActive ? colorClass.icon : 'text-gray-600 dark:text-gray-300'
            )}
          />
        </span>
        <div className="text-center">
          <span
            className={clsx(
              'text-sm font-semibold transition-colors duration-300',
              isActive ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-200'
            )}
          >
            {option.label}
          </span>
        </div>
      </button>
    );
  };

  const renderDefaultIcon = (option: { value: string; label: string }) => {
    const IconComponent = getAccountIcon(option.value);
    const isActive = selectedIcon === option.value && !selectedAccountType;

    return (
      <button
        key={option.value}
        type="button"
        onClick={() => handleIconSelect(option.value)}
        className={clsx(
          'flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all duration-300',
          'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 dark:hover:border-gray-600',
          'hover:shadow-md hover:scale-105',
          isActive &&
            'ring-2 ring-blue-500 bg-blue-50 border-blue-200 dark:ring-blue-400 dark:bg-blue-900/20 dark:border-blue-600'
        )}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700 shadow-sm">
          <IconComponent className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </span>
        <span className="text-xs font-medium text-gray-700 dark:text-gray-200 text-center leading-tight">
          {option.label}
        </span>
      </button>
    );
  };

  const renderBankSuggestion = (bank: AccountTypeWithIconsProps['bankSuggestions'][number]) => {
    const isActive = selectedIcon === bank.icon_url;

    return (
      <button
        key={bank.identifier}
        type="button"
        onClick={() => {
          handleIconSelect(bank.icon_url);
          onSelectBankIcon?.(bank.icon_url);
        }}
        className={clsx(
          'rounded-xl border px-3 py-2 transition shadow-sm w-full',
          'border-transparent bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700',
          isActive && 'ring-2 ring-blue-500 bg-blue-50 dark:ring-blue-400 dark:bg-blue-900/20'
        )}
      >
        <HStack gap={3}>
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-gray-100 bg-white">
            <img
              src={bank.icon_url}
              alt={`${bank.name} logo`}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </span>
          <div className="flex-1 text-left">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-100">
              {bank.name}
            </div>
            {bank.website && (
              <HStack gap={1} className="text-xs text-gray-400">
                <Globe className="h-3 w-3" />
                {new URL(bank.website).hostname}
              </HStack>
            )}
          </div>
        </HStack>
      </button>
    );
  };

  return (
    <div className="space-y-8">
      {/* Account Type Selection with Default Icons */}
      <div>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {accountTypeOptions.map(renderAccountTypeOption)}
        </div>

        {/* Additional Default Icons */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">
            More Icon Options
          </h4>
          <div className="grid gap-2 grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {defaultIconOptions.map(renderDefaultIcon)}
          </div>
        </div>
      </div>

      {/* Custom Icon Options */}
      <div>
        <div className="mb-4">
          <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Customize Icon
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Upload or paste a logo URL from your files or brand kit.
          </p>
        </div>

        {/* Bank Suggestions */}
        {bankSuggestions.length > 0 && (
          <div className="mb-6">
            <h5 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">
              Popular Banks
            </h5>
            <div className="grid gap-2 grid-cols-1 md:grid-cols-2">
              {bankSuggestions.map(renderBankSuggestion)}
            </div>
          </div>
        )}

        {/* Custom Image Upload */}
        <div className="rounded-xl border border-dashed border-gray-300 p-4 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <h5 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
            Custom Image
          </h5>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
            Upload or paste a logo URL from your files or brand kit.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              type="url"
              placeholder="https://example.com/logo.png"
              value={customImageUrl}
              onChange={(event) => setCustomImageUrl(event.target.value)}
              className="flex-1"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCustomUrlApply}
                disabled={!customImageUrl.trim()}
                className="inline-flex items-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                Use URL
              </Button>
              <Button
                type="button"
                variant="outline"
                className="inline-flex items-center gap-2"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/png,image/jpeg,image/svg+xml';
                  input.onchange = (event: any) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (file.size > 250 * 1024) {
                      window.alert('Please choose an image smaller than 250KB.');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === 'string') {
                        onChange(reader.result);
                      }
                    };
                    reader.readAsDataURL(file);
                  };
                  input.click();
                }}
              >
                <Camera className="h-4 w-4" />
                Upload
              </Button>
            </div>
          </div>

          {isAccountIconUrl(selectedIcon) && selectedIcon && (
            <div className="mt-4 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <HStack gap={4}>
                <div className="h-12 w-12 overflow-hidden rounded-lg border border-gray-100 shadow-sm">
                  <img
                    src={selectedIcon}
                    alt="Custom icon preview"
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 text-sm text-gray-600 dark:text-gray-300">
                  Currently using custom image. You can replace it with another upload or URL.
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => onChange('')}
                >
                  Remove
                </Button>
              </HStack>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
