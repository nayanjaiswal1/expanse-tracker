import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { isAccountIconUrl, getAccountIcon } from '../utils/accountIcons';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Camera, Globe, PlusCircle, RefreshCw } from 'lucide-react';
import { HStack } from '../../../components/ui/Layout';

interface AccountIconSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  defaultOptions: Array<{ value: string; label: string }>;
  bankSuggestions?: Array<{
    name: string;
    identifier: string;
    icon_url: string;
    accent_color?: string;
    website?: string;
  }>;
  onSelectBankIcon?: (iconUrl: string) => void;
}

const DEFAULT_UPLOAD_PLACEHOLDER = '';

export const AccountIconSelector: React.FC<AccountIconSelectorProps> = ({
  value,
  onChange,
  defaultOptions,
  bankSuggestions = [],
  onSelectBankIcon,
}) => {
  const [customImageUrl, setCustomImageUrl] = useState('');

  const isCustomImage = value ? isAccountIconUrl(value) : false;

  const activeDefault = useMemo(() => {
    if (!value || isCustomImage) return null;
    return defaultOptions.find((option) => option.value === value) || null;
  }, [value, defaultOptions, isCustomImage]);

  const handleCustomUrlApply = () => {
    if (!customImageUrl.trim()) return;
    onChange(customImageUrl.trim());
    setCustomImageUrl('');
  };

  const renderDefaultIcon = (option: { value: string; label: string }) => {
    const IconComponent = getAccountIcon(option.value);
    const isActive = activeDefault?.value === option.value;

    return (
      <button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        className={clsx(
          'flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all duration-200',
          'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 dark:hover:border-gray-600',
          'hover:shadow-md hover:scale-105',
          isActive &&
            'ring-2 ring-blue-500 bg-blue-50 border-blue-200 dark:ring-blue-400 dark:bg-blue-900/20 dark:border-blue-600'
        )}
      >
        <span className="rounded-full bg-gray-100 dark:bg-gray-700 shadow-sm">
          <HStack className="h-10 w-10">
            <IconComponent className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </HStack>
        </span>
        <span className="text-xs font-medium text-gray-700 dark:text-gray-200 text-center leading-tight">
          {option.label}
        </span>
      </button>
    );
  };

  const renderBankSuggestion = (bank: AccountIconSelectorProps['bankSuggestions'][number]) => {
    const isActive = value === bank.icon_url;

    return (
      <button
        key={bank.identifier}
        type="button"
        onClick={() => {
          onChange(bank.icon_url);
          onSelectBankIcon?.(bank.icon_url);
        }}
        className={clsx(
          'rounded-xl border px-3 py-2 transition shadow-sm w-full',
          'border-transparent bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700',
          isActive &&
            'ring-2 ring-primary-400 bg-primary-50 dark:ring-primary-600 dark:bg-primary-900/30'
        )}
      >
        <HStack gap={3}>
          <span className="overflow-hidden rounded-full border border-gray-100 bg-white">
            <HStack className="h-10 w-10">
              <img
                src={bank.icon_url}
                alt={`${bank.name} logo`}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </HStack>
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
      <div>
        <div className="mb-4">
          <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Default Icons
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Use app-standard icons for quick setup.
          </p>
        </div>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {defaultOptions.map(renderDefaultIcon)}
        </div>
      </div>

      {bankSuggestions.length > 0 && (
        <div>
          <div className="mb-4">
            <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Popular Banks
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Pick popular institutions with ready-made branding.
            </p>
          </div>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            {bankSuggestions.map(renderBankSuggestion)}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-dashed border-gray-300 p-6 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="mb-4">
          <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Custom Image
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Upload or paste a logo URL from your files or brand kit.
          </p>
        </div>
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
            >
              <HStack gap={2}>
                <PlusCircle className="h-4 w-4" />
                Use URL
              </HStack>
            </Button>
            <Button
              type="button"
              variant="outline"
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
              <HStack gap={2}>
                <Camera className="h-4 w-4" />
                Upload
              </HStack>
            </Button>
          </div>
        </div>

        {isCustomImage && value && (
          <HStack
            gap={4}
            className="mt-4 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
          >
            <div className="h-12 w-12 overflow-hidden rounded-lg border border-gray-100 shadow-sm">
              <img
                src={value}
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
              onClick={() => onChange(DEFAULT_UPLOAD_PLACEHOLDER)}
            >
              Remove
            </Button>
          </HStack>
        )}
      </div>
    </div>
  );
};
