import React from 'react';

interface TypographyProps {
  children: React.ReactNode;
  className?: string;
}

// Page Title - H1
export const PageTitle: React.FC<TypographyProps> = ({ children, className = '' }) => (
  <h1 className={`text-3xl font-bold text-gray-900 dark:text-white ${className}`}>{children}</h1>
);

// Page Description
export const PageDescription: React.FC<TypographyProps> = ({ children, className = '' }) => (
  <p className={`text-gray-600 dark:text-gray-400 mt-2 ${className}`}>{children}</p>
);

// Section Title - H2
export const SectionTitle: React.FC<TypographyProps> = ({ children, className = '' }) => (
  <h2 className={`text-lg font-semibold text-gray-900 dark:text-white ${className}`}>{children}</h2>
);

// Section Description
export const SectionDescription: React.FC<TypographyProps> = ({ children, className = '' }) => (
  <p className={`text-sm text-gray-600 dark:text-gray-400 mt-1 ${className}`}>{children}</p>
);

// Subsection Title - H3
export const SubsectionTitle: React.FC<TypographyProps> = ({ children, className = '' }) => (
  <h3 className={`text-base font-medium text-gray-900 dark:text-white ${className}`}>{children}</h3>
);

// Small Heading - H4
export const SmallHeading: React.FC<TypographyProps> = ({ children, className = '' }) => (
  <h4 className={` text-sm font-small text-gray-900 dark:text-white ${className}`}>{children}</h4>
);

// Body Text
export const BodyText: React.FC<TypographyProps> = ({ children, className = '' }) => (
  <p className={`text-sm text-gray-600 dark:text-gray-400 ${className}`}>{children}</p>
);

// Helper Text / Caption
export const HelperText: React.FC<TypographyProps> = ({ children, className = '' }) => (
  <p className={`text-xs text-gray-500 dark:text-gray-400 ${className}`}>{children}</p>
);

// Form Label
export const FormLabel: React.FC<TypographyProps & { htmlFor?: string }> = ({
  children,
  className = '',
  htmlFor,
}) => (
  <label
    htmlFor={htmlFor}
    className={`block text-sm font-medium text-gray-900 dark:text-white ${className}`}
  >
    {children}
  </label>
);

// Error Text
export const ErrorText: React.FC<TypographyProps> = ({ children, className = '' }) => (
  <p className={`text-sm text-red-600 dark:text-red-400 ${className}`}>{children}</p>
);

// Success Text
export const SuccessText: React.FC<TypographyProps> = ({ children, className = '' }) => (
  <p className={`text-sm text-green-600 dark:text-green-400 ${className}`}>{children}</p>
);

// Muted Text
export const MutedText: React.FC<TypographyProps> = ({ children, className = '' }) => (
  <span className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}>{children}</span>
);
