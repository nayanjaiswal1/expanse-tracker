import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface FormContextType {
  isDirty: boolean;
  setFormDirty: (dirty: boolean) => void;
  resetFormState: () => void;
}

const FormContext = createContext<FormContextType | undefined>(undefined);

export const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) {
    // Return a no-op implementation when not in a FormProvider
    return {
      isDirty: false,
      setFormDirty: () => {},
      resetFormState: () => {},
    };
  }
  return context;
};

interface FormProviderProps {
  children: ReactNode;
}

export const FormProvider: React.FC<FormProviderProps> = ({ children }) => {
  const [isDirty, setIsDirty] = useState(false);

  const setFormDirty = useCallback((dirty: boolean) => {
    setIsDirty(dirty);
  }, []);

  const resetFormState = useCallback(() => {
    setIsDirty(false);
  }, []);

  const value = {
    isDirty,
    setFormDirty,
    resetFormState,
  };

  return <FormContext.Provider value={value}>{children}</FormContext.Provider>;
};
