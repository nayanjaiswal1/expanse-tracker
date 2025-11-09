import React from 'react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { ObjectForm } from '../../../components/forms/ObjectForm';
import { createProfileFormConfig, ProfileFormData } from '../../settings/profileForms/forms';
import { COUNTRIES } from '../../../utils/countries';
import { COMMON_CURRENCIES, COMMON_TIMEZONES } from '../../../utils/geoDetection';
import { Input } from '../../../components/ui/Input';

// Support both old and new interfaces for backward compatibility
interface ProfileFormPropsNew {
  onSubmit: (data: ProfileFormData) => Promise<void>;
  initialData?: Partial<ProfileFormData>;
  isLoading?: boolean;
  register?: never;
  errors?: never;
}

interface ProfileFormPropsOld {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  onSubmit?: never;
  initialData?: never;
  isLoading?: never;
}

type ProfileFormProps = ProfileFormPropsNew | ProfileFormPropsOld;

export const ProfileForm: React.FC<ProfileFormProps> = (props) => {
  // Old interface (for OnboardingFlow backward compatibility)
  if ('register' in props && props.register) {
    const { register, errors } = props;
    return (
      <div className="space-y-4 max-w-xl">
        <div>
          <Input
            {...register('full_name')}
            label="Full name"
            type="text"
            placeholder="e.g. Alex Johnson"
            required
          />
          {errors.full_name && (
            <p className="mt-1 text-sm text-red-500">{errors.full_name.message as string}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Phone number
          </label>
          <div className="flex gap-2">
            <select
              {...register('phoneCountryCode')}
              className="flex h-10 w-28 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-2 text-sm text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-colors duration-200 hover:border-gray-400 dark:hover:border-gray-500"
            >
              {COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.flag} {country.dialCode}
                </option>
              ))}
            </select>
            <input
              {...register('phone')}
              type="tel"
              placeholder="555 123 4567"
              className="flex h-10 flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-colors duration-200 hover:border-gray-400 dark:hover:border-gray-500"
            />
          </div>
          {errors.phone && (
            <p className="mt-1 text-sm text-red-500">{errors.phone.message as string}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Currency
              <span className="text-red-500">*</span>
            </label>
            <select
              {...register('default_currency')}
              className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-colors duration-200 hover:border-gray-400 dark:hover:border-gray-500"
            >
              {COMMON_CURRENCIES.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.symbol} {currency.code} · {currency.name}
                </option>
              ))}
            </select>
            {errors.default_currency && (
              <p className="mt-1 text-sm text-red-500">
                {errors.default_currency.message as string}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Timezone
              <span className="text-red-500">*</span>
            </label>
            <select
              {...register('timezone')}
              className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-colors duration-200 hover:border-gray-400 dark:hover:border-gray-500"
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label} ({tz.offset})
                </option>
              ))}
            </select>
            {errors.timezone && (
              <p className="mt-1 text-sm text-red-500">{errors.timezone.message as string}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // New interface (ObjectForm)
  const { onSubmit, initialData, isLoading = false } = props;

  const formConfig = createProfileFormConfig({
    onSubmit: onSubmit!,
    isLoading,
    initialData,
    countries: COUNTRIES,
    currencies: COMMON_CURRENCIES,
    timezones: COMMON_TIMEZONES,
  });

  return <ObjectForm config={formConfig} />;
};
