import clsx from 'clsx';

type VariantsConfig = Record<string, Record<string, string>>;

type VariantSelection<TConfig extends VariantsConfig> = Partial<{
  [VariantName in keyof TConfig]: keyof TConfig[VariantName] | null | undefined;
}>;

type DefaultVariants<TConfig extends VariantsConfig> = {
  [VariantName in keyof TConfig]?: keyof TConfig[VariantName];
};

type CompoundVariant<TConfig extends VariantsConfig> = {
  class: string;
} & {
  [VariantName in keyof TConfig]?: Array<keyof TConfig[VariantName]> | keyof TConfig[VariantName];
};

interface CvaOptions<TConfig extends VariantsConfig> {
  variants?: TConfig;
  defaultVariants?: DefaultVariants<TConfig>;
  compoundVariants?: Array<CompoundVariant<TConfig>>;
}

// Minimal cva implementation supporting variants and compound variants.
export const cva = <TConfig extends VariantsConfig>(
  base: string,
  options: CvaOptions<TConfig> = {}
) => {
  const {
    variants = {} as TConfig,
    defaultVariants = {} as DefaultVariants<TConfig>,
    compoundVariants = [] as Array<CompoundVariant<TConfig>>,
  } = options;

  return (selection: VariantSelection<TConfig> = {}) => {
    const resolved: VariantSelection<TConfig> = {
      ...defaultVariants,
      ...selection,
    };

    const variantEntries = Object.entries(variants) as Array<
      [keyof TConfig, TConfig[keyof TConfig]]
    >;

    const variantClasses = variantEntries.map(([variantName, variantValues]) => {
      const selected = resolved[variantName];
      if (selected == null) {
        return '';
      }

      return variantValues[selected as keyof typeof variantValues] ?? '';
    });

    const compoundClasses = compoundVariants
      .filter((compound) => {
        return variantEntries.every(([variantName]) => {
          const constraint = compound[variantName];

          if (constraint === undefined) {
            return true;
          }

          const selected = resolved[variantName];

          if (Array.isArray(constraint)) {
            return selected != null && constraint.map(String).includes(String(selected));
          }

          return selected === constraint;
        });
      })
      .map((compound) => compound.class);

    return clsx(base, variantClasses, compoundClasses);
  };
};

export type VariantProps<T extends (...args: any[]) => string> = NonNullable<Parameters<T>[0]>;
