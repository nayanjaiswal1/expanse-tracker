import { FormConfig } from '../../../shared/schemas';
import { loginSchema, registerSchema, LoginFormData, RegisterFormData } from '../schemas';

export const createLoginFormConfig = (
  onSubmit: (data: LoginFormData) => Promise<void>,
  isLoading?: boolean
): FormConfig<LoginFormData> => ({
  schema: loginSchema,
  title: 'Sign In to Your Account',
  description: 'Welcome back! Please enter your details.',
  fields: [
    {
      name: 'username',
      type: 'input',
      label: 'Email or Phone',
      placeholder: 'Enter your email or phone number',
      validation: { required: true },
    },
    {
      name: 'password',
      type: 'password',
      label: 'Password',
      placeholder: 'Enter your password',
      validation: { required: true },
    },
  ],
  layout: 'vertical',
  submission: {
    onSubmit,
    submitText: 'Sign In',
    loading: isLoading,
  },
  validation: {
    mode: 'onBlur',
    shouldFocusError: true,
  },
  defaultValues: {
    username: '',
    password: '',
  },
});

export const createRegisterFormConfig = (
  onSubmit: (data: RegisterFormData) => Promise<void>,
  isLoading?: boolean
): FormConfig<RegisterFormData> => ({
  schema: registerSchema,
  title: 'Create Your Account',
  description: 'Join us today! Please fill in your information.',
  fields: [
    {
      name: 'fullName',
      type: 'input',
      label: 'Full Name',
      placeholder: 'Enter your full name',
      validation: { required: true },
    },
    {
      name: 'email',
      type: 'email',
      label: 'Email Address',
      placeholder: 'Enter your email',
      validation: { required: true },
    },
    {
      name: 'password',
      type: 'password',
      label: 'Password',
      placeholder: 'Create a strong password',
      description: 'Must contain at least 8 characters with uppercase, lowercase, and a number',
      validation: { required: true },
    },
    {
      name: 'confirmPassword',
      type: 'password',
      label: 'Confirm Password',
      placeholder: 'Confirm your password',
      validation: { required: true },
    },
  ],
  layout: 'vertical',
  submission: {
    onSubmit,
    submitText: 'Create Account',
    loading: isLoading,
  },
  validation: {
    mode: 'onBlur',
    shouldFocusError: true,
  },
  defaultValues: {
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  },
});
