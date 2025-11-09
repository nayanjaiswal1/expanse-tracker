import { type ElementType, forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { getTextStyle, type TypographyScaleKey } from '@/theme/config';

type TypographyTone = 'primary' | 'secondary' | 'muted' | 'inverted';
type TypographyWeight = 'regular' | 'medium' | 'semibold';

const defaultElement: Record<TypographyScaleKey, ElementType> = {
  'body-sm': 'p',
  'body-md': 'p',
  'body-lg': 'p',
  'label-sm': 'span',
  'label-md': 'span',
  'label-lg': 'span',
  'heading-xs': 'h6',
  'heading-sm': 'h5',
  'heading-md': 'h4',
  'heading-lg': 'h3',
  'heading-xl': 'h2',
};

const toneClass: Record<TypographyTone, string> = {
  primary: 'text-text-primary dark:text-surface-default',
  secondary: 'text-text-secondary dark:text-surface-dark-subtle',
  muted: 'text-text-muted dark:text-surface-dark-muted',
  inverted: 'text-surface-default dark:text-text-primary',
};

const weightClass: Record<TypographyWeight, string> = {
  regular: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
};

export interface TypographyProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  variant: TypographyScaleKey;
  tone?: TypographyTone;
  weight?: TypographyWeight;
  translationKey?: string;
}

export const Typography = forwardRef<HTMLElement, TypographyProps>(
  (
    { as, variant, tone = 'primary', weight, translationKey, children, className, style, ...props },
    ref
  ) => {
    const Component = (as ?? defaultElement[variant]) as ElementType;
    const { t } = useTranslation('common');
    const styles = getTextStyle(variant);

    return (
      <Component
        ref={ref}
        className={clsx(toneClass[tone], weight ? weightClass[weight] : null, className)}
        style={{
          fontSize: styles.fontSize,
          lineHeight: styles.lineHeight,
          fontWeight: weight ? undefined : styles.fontWeight,
          ...style,
        }}
        {...props}
      >
        {translationKey ? t(translationKey) : children}
      </Component>
    );
  }
);

Typography.displayName = 'Typography';
