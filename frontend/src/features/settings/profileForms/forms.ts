import { FormConfig } from '../../../shared/schemas';
import { profileSchema } from '../schemas/forms';
import { z } from 'zod';

// Extended profile schema for the form (includes phone country code and preferences)
const profileFormSchema = profileSchema.extend({
  phoneCountryCode: z.string().optional(),
  default_currency: z.string().length(3, 'Currency must be a 3-letter code'),
  timezone: z.string().min(1, 'Timezone is required'),
});

export type ProfileFormData = z.infer<typeof profileFormSchema>;

interface ProfileFormConfigOptions {
  onSubmit: (data: ProfileFormData) => Promise<void>;
  isLoading?: boolean;
  initialData?: Partial<ProfileFormData>;
  countries?: Array<{ code: string; flag: string; dialCode: string }>;
  currencies?: Array<{ code: string; symbol: string; name: string }>;
  timezones?: Array<{ value: string; label: string; offset: string }>;
  onCancel?: () => void;
}

export const createProfileFormConfig = ({
  onSubmit,
  isLoading = false,
  initialData,
  countries = [],
  currencies = [],
  timezones = [],
  onCancel,
}: ProfileFormConfigOptions): FormConfig<ProfileFormData> => {
  const countryOptions = countries.map((country) => ({
    value: country.code,
    label: `${country.flag} ${country.dialCode}`,
  }));

  const currencyOptions = currencies.map((currency) => ({
    value: currency.code,
    label: `${currency.symbol} ${currency.code} · ${currency.name}`,
  }));

  const timezoneOptions = timezones.map((tz) => ({
    value: tz.value,
    label: `${tz.label} (${tz.offset})`,
  }));

  return {
    schema: profileFormSchema,
    titleKey: 'settings.profile.form.title',
    title: 'Profile Settings',
    descriptionKey: 'settings.profile.form.description',
    description: 'Update your profile information',
    showHeader: false, // Title shown in Modal header when used in Modal
    fields: [
      {
        name: 'full_name',
        type: 'input',
        label: 'Full name',
        labelKey: 'settings.profile.form.fields.fullName',
        placeholder: 'e.g. Alex Johnson',
        placeholderKey: 'settings.profile.form.fields.fullNamePlaceholder',
        validation: { required: true },
        descriptionKey: 'settings.profile.form.fields.fullNameDescription',
        className: 'col-span-full',
      },
      {
        name: 'email',
        type: 'email',
        label: 'Email',
        labelKey: 'settings.profile.form.fields.email',
        placeholder: 'your.email@example.com',
        placeholderKey: 'settings.profile.form.fields.emailPlaceholder',
        validation: { required: true },
        descriptionKey: 'settings.profile.form.fields.emailDescription',
        className: 'col-span-full',
      },
      {
        name: 'phoneCountryCode',
        type: 'select',
        label: 'Country Code',
        labelKey: 'settings.profile.form.fields.phoneCountryCode',
        options: countryOptions,
        descriptionKey: 'settings.profile.form.fields.phoneCountryCodeDescription',
        className: 'md:col-span-1',
      },
      {
        name: 'phone',
        type: 'input',
        label: 'Phone number',
        labelKey: 'settings.profile.form.fields.phone',
        placeholder: '555 123 4567',
        placeholderKey: 'settings.profile.form.fields.phonePlaceholder',
        descriptionKey: 'settings.profile.form.fields.phoneDescription',
        className: 'md:col-span-1',
      },
      {
        name: 'default_currency',
        type: 'select',
        label: 'Currency',
        labelKey: 'settings.profile.form.fields.currency',
        options: currencyOptions,
        validation: { required: true },
        descriptionKey: 'settings.profile.form.fields.currencyDescription',
        className: 'md:col-span-1',
      },
      {
        name: 'timezone',
        type: 'select',
        label: 'Timezone',
        labelKey: 'settings.profile.form.fields.timezone',
        options: timezoneOptions,
        validation: { required: true },
        descriptionKey: 'settings.profile.form.fields.timezoneDescription',
        className: 'md:col-span-1',
      },
    ],
    advancedFields: [
      {
        name: 'bio',
        type: 'textarea',
        label: 'Bio',
        labelKey: 'settings.profile.form.fields.bio',
        placeholder: 'Tell us about yourself...',
        placeholderKey: 'settings.profile.form.fields.bioPlaceholder',
        rows: 3,
        descriptionKey: 'settings.profile.form.fields.bioDescription',
      },
      {
        name: 'website',
        type: 'input',
        label: 'Website',
        labelKey: 'settings.profile.form.fields.website',
        placeholder: 'https://yourwebsite.com',
        placeholderKey: 'settings.profile.form.fields.websitePlaceholder',
        descriptionKey: 'settings.profile.form.fields.websiteDescription',
      },
      {
        name: 'location',
        type: 'input',
        label: 'Location',
        labelKey: 'settings.profile.form.fields.location',
        placeholder: 'e.g., San Francisco, CA',
        placeholderKey: 'settings.profile.form.fields.locationPlaceholder',
        descriptionKey: 'settings.profile.form.fields.locationDescription',
      },
    ],
    layout: 'profile',
    submission: {
      onSubmit,
      onCancel,
      submitText: 'Save Changes',
      submitTextKey: 'settings.profile.form.submit',
      cancelText: 'Cancel',
      cancelTextKey: 'common.actions.cancel',
      loading: isLoading,
    },
    defaultValues: {
      full_name: '',
      email: '',
      phoneCountryCode: countries[0]?.code || 'US',
      phone: '',
      default_currency: currencies[0]?.code || 'USD',
      timezone: timezones[0]?.value || 'America/New_York',
      bio: '',
      website: '',
      location: '',
      ...initialData,
    },
  };
};
