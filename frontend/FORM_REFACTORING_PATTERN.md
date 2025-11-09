# Form Refactoring Pattern - Best Practices

This document outlines the consistent pattern for refactoring all forms in the finance module.

## 📋 **Pattern Overview**

### **1. Custom Hooks Structure**

Each feature should have these hooks in `features/finance/hooks/`:

#### **`use[Feature]Form.ts`** - Form Management
- Uses React Hook Form + Zod validation
- Handles form state and validation
- Provides `prepareSubmitData()` or `prepareFormData()` function
- Manages default values based on editing state

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const formSchema = z.object({
  // Define schema with proper validation
});

export type FormValues = z.infer<typeof formSchema>;

export function use[Feature]Form(editingItem?: Item | null) {
  const getDefaultValues = (): FormValues => {
    if (editingItem) {
      return {
        // Map editing item to form values
      };
    }
    return {
      // Default values for new item
    };
  };
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues()
  });

  const prepareSubmitData = (values: FormValues) => ({
    // Transform form values to API format
  });

  return { form, prepareSubmitData };
}
```

#### **`use[Feature]Modals.ts`** - Modal State Management
- Manages all modal open/close states
- Handles editing/viewing states
- Uses `useCallback` for performance

```typescript
import { useState, useCallback } from 'react';

export function use[Feature]Modals() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const openAddModal = useCallback(() => {
    setEditingItem(null);
    setShowAddModal(true);
  }, []);

  const openEditModal = useCallback((item: Item) => {
    setEditingItem(item);
    setShowAddModal(true);
  }, []);

  const closeAddModal = useCallback(() => {
    setShowAddModal(false);
    setEditingItem(null);
  }, []);

  return {
    showAddModal,
    editingItem,
    openAddModal,
    openEditModal,
    closeAddModal,
  };
}
```

#### **`use[Feature]Operations.ts`** - Business Logic
- Handles all CRUD operations
- Uses React Query mutations
- Manages loading states
- Provides consistent error handling
- Shows toast notifications

```typescript
import { useState } from 'react';
import { useToast } from '../../../components/ui/Toast';

export function use[Feature]Operations() {
  const { showError, showSuccess } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const createMutation = useCreate[Feature]Mutation();
  const updateMutation = useUpdate[Feature]Mutation();
  const deleteMutation = useDelete[Feature]Mutation();

  const handleCreate = async (data: any) => {
    setIsSubmitting(true);
    try {
      await createMutation.mutateAsync(data);
      showSuccess('[Feature] created successfully!');
      return true;
    } catch (error) {
      console.error('Failed to create [feature]:', error);
      showError('Failed to create [feature]', 'Please try again.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: number, data: any) => {
    setIsSubmitting(true);
    try {
      await updateMutation.mutateAsync({ id, data });
      showSuccess('[Feature] updated successfully!');
      return true;
    } catch (error) {
      console.error('Failed to update [feature]:', error);
      showError('Failed to update [feature]', 'Please try again.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id);
      showSuccess('[Feature] deleted successfully!');
      return true;
    } catch (error) {
      console.error('Failed to delete [feature]:', error);
      showError('Failed to delete [feature]', 'Please try again.');
      return false;
    }
  };

  return {
    handleCreate,
    handleUpdate,
    handleDelete,
    isSubmitting,
  };
}
```

#### **`use[Feature]Filters.ts`** (if applicable)
- Uses `useFilters` from `hooks/useFilters`
- Manages URL query params
- Provides filter state and actions

---

### **2. Constants**

Create `constants/[feature]Constants.ts`:
```typescript
export const FEATURE_TYPES = ['type1', 'type2', 'type3'] as const;
export type FeatureType = typeof FEATURE_TYPES[number];

export const FEATURE_STATUSES = ['active', 'inactive'] as const;
export type FeatureStatus = typeof FEATURE_STATUSES[number];

export const DEFAULT_VALUE = 'value';
```

---

### **3. Utilities**

Create `utils/[feature]Utils.ts`:
```typescript
export const filterByStatus = (items: Item[], status: Status): Item[] => {
  return items.filter(item => item.status === status);
};

export const calculateTotal = (items: Item[]): number => {
  return items.reduce((sum, item) => sum + item.value, 0);
};
```

---

### **4. Main Component Structure**

```typescript
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { use[Feature]Filters } from './hooks/use[Feature]Filters';
import { use[Feature]Modals } from './hooks/use[Feature]Modals';
import { use[Feature]Operations } from './hooks/use[Feature]Operations';
import { use[Feature]Form, type [Feature]FormValues } from './hooks/use[Feature]Form';

export const [Feature]: React.FC = () => {
  const { t } = useTranslation('finance');
  const { state: authState } = useAuth();
  
  // Filters
  const { filters, setFilter, clearAllFilters } = use[Feature]Filters();
  
  // Modals
  const modals = use[Feature]Modals();
  
  // Operations
  const operations = use[Feature]Operations();
  
  // Form
  const { form, prepareSubmitData } = use[Feature]Form(modals.editingItem);
  
  // UI state (minimal)
  const [localState, setLocalState] = useState(initialValue);

  // Data fetching
  const query = use[Feature]Data(filters);
  const items = query.data || [];

  // Handlers
  const handleSubmit = async (values: [Feature]FormValues) => {
    const data = prepareSubmitData(values);
    
    const success = modals.editingItem
      ? await operations.handleUpdate(modals.editingItem.id, data)
      : await operations.handleCreate(data);

    if (success) {
      modals.closeAddModal();
      form.reset();
    }
  };

  return (
    <>
      <div className="min-h-screen">
        {/* Content */}
      </div>

      {/* Modals */}
      <Modal
        isOpen={modals.showAddModal}
        onClose={modals.closeAddModal}
        title={t('[feature].form.title')}
      >
        <Form
          onSubmit={form.handleSubmit(handleSubmit)}
          isSubmitting={operations.isSubmitting}
        />
      </Modal>
    </>
  );
};
```

---

### **5. Internationalization (i18n)**

Add translations in `public/locales/en/finance.json`:

```json
{
  "[feature]": {
    "toolbar": {
      "add[Feature]": "Add [Feature]",
      "search[Features]": "Search [features]"
    },
    "form": {
      "addTitle": "Add New [Feature]",
      "editTitle": "Edit [Feature]",
      "fields": {
        "name": "Name",
        "description": "Description"
      },
      "validation": {
        "nameRequired": "Name is required"
      },
      "submit": "Save",
      "cancel": "Cancel"
    },
    "notifications": {
      "createSuccess": "[Feature] created successfully!",
      "updateSuccess": "[Feature] updated successfully!",
      "deleteSuccess": "[Feature] deleted successfully!",
      "createError": "Failed to create [feature]",
      "updateError": "Failed to update [feature]",
      "deleteError": "Failed to delete [feature]"
    }
  }
}
```

---

## ✅ **Checklist for Refactoring**

- [ ] Create `use[Feature]Form.ts` with React Hook Form + Zod
- [ ] Create `use[Feature]Modals.ts` for modal state
- [ ] Create `use[Feature]Operations.ts` for CRUD operations
- [ ] Create `use[Feature]Filters.ts` (if needed)
- [ ] Create `constants/[feature]Constants.ts`
- [ ] Create `utils/[feature]Utils.ts`
- [ ] Add i18n translations
- [ ] Refactor main component to use hooks
- [ ] Remove all manual `useState` for form fields
- [ ] Replace hardcoded strings with `t()` function
- [ ] Add TypeScript types for all data
- [ ] Test all operations (create, update, delete)

---

## 🎯 **Benefits**

1. **Consistency** - All forms follow the same pattern
2. **Maintainability** - Easy to find and update logic
3. **Testability** - Hooks can be tested independently
4. **Type Safety** - Zod validation + TypeScript
5. **i18n Ready** - All strings translatable
6. **Performance** - Proper memoization with hooks
7. **Separation of Concerns** - Clear responsibility separation
8. **Reusability** - Hooks can be shared/composed

---

## 📁 **File Structure**

```
features/finance/
├── [Feature].tsx              # Main component
├── constants/
│   └── [feature]Constants.ts  # Constants & types
├── utils/
│   └── [feature]Utils.ts      # Utility functions
├── hooks/
│   ├── use[Feature]Form.ts        # Form management
│   ├── use[Feature]Modals.ts      # Modal state
│   ├── use[Feature]Operations.ts  # CRUD operations
│   └── use[Feature]Filters.ts     # Filter management
└── components/
    └── [feature]/
        └── [FeatureComponent].tsx
```

---

## 🚀 **Next Steps**

Apply this pattern to:
1. ✅ Goals - **DONE**
2. 🔄 InvestmentTracker - **IN PROGRESS**
3. ⏳ Budgets
4. ⏳ ExpenseTracker
5. ⏳ GroupExpenses
6. ⏳ AccountsManagement
7. ⏳ RecurringInvestments
8. ⏳ GmailAccounts
9. ⏳ MerchantPatterns
10. ⏳ BankStatementUpload
