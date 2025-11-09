import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label?: string;
  wrapperClassName?: string;
  as?: 'input' | 'textarea';
  multiline?: boolean;
  rows?: number;
  icon?: LucideIcon;
  inputRef?: React.Ref<HTMLInputElement | HTMLTextAreaElement>;
}

export const Input = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  (
    {
      label,
      className = '',
      wrapperClassName = '',
      as = 'input',
      multiline = false,
      rows = 3,
      icon: Icon,
      inputRef,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
    flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background
    file:border-0 file:bg-transparent file:text-sm file:font-medium
    placeholder:text-muted-foreground
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
    disabled:cursor-not-allowed disabled:opacity-50
    transition-colors duration-200
    border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white
    hover:border-gray-400 dark:hover:border-gray-500
    focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500/20
  `
      .trim()
      .replace(/\s+/g, ' ');

    // Determine component type
    const isTextarea = multiline || as === 'textarea';
    const Component = isTextarea ? 'textarea' : 'input';

    // Add rows for textarea
    const componentProps = Component === 'textarea' ? { ...props, rows } : props;

    return (
      <div className={wrapperClassName}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {label}
            {props.required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
              <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </div>
          )}
          {isTextarea ? (
            <textarea
              className={`${baseStyles} ${Icon ? 'pl-10' : ''} ${className} relative`.trim()}
              ref={
                (inputRef as React.Ref<HTMLTextAreaElement>) ||
                (ref as React.Ref<HTMLTextAreaElement>)
              }
              {...(componentProps as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
            />
          ) : (
            <input
              className={`${baseStyles} ${Icon ? 'pl-10' : ''} ${className} relative`.trim()}
              ref={
                (inputRef as React.Ref<HTMLInputElement>) || (ref as React.Ref<HTMLInputElement>)
              }
              {...(componentProps as React.InputHTMLAttributes<HTMLInputElement>)}
            />
          )}
        </div>
      </div>
    );
  }
);

Input.displayName = 'Input';
