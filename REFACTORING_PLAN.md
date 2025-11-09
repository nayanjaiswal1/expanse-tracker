# 🧹 Codebase Refactoring Plan

## Current State Analysis

### Apps Structure
1. **finance_v2** - ✅ NEW architecture (KEEP ALL)
2. **finance** - ⚠️ OLD architecture (KEEP MINIMAL)
3. **users** - ✅ User management (KEEP)
4. **reference** - ✅ Reference data (KEEP)
5. **services** - ⚠️ Integration services (REVIEW)
6. **training** - ❌ ML training data (REMOVE)

---

## Redundant/Duplicate Models

### Finance App (OLD) - 18 model files
**Duplicates with finance_v2:**
- ❌ `Transaction` → Replaced by `finance_v2.Transaction`
- ❌ `ExpenseGroup`, `GroupExpense` → Replaced by `finance_v2.Group`
- ❌ `TransactionDocument` → Replaced by `finance_v2.UploadedFile`
- ❌ `StatementImport`, `UploadSession` → Replaced by new upload system
- ❌ `TransactionImport`, `TransactionLink` → Not needed with v2

**Training/Learning (Non-essential):**
- ❌ `InvoiceParsingAttempt`, `InvoiceFieldCorrection`, `InvoiceTrainingDataset`
- ❌ `ParsingAttempt`, `ColumnMapping`, `RegexPattern`, `LearningDataset`
- ❌ `ParsingMetrics`

**Keep (Still Used):**
- ✅ `Account` - Referenced by finance_v2.Transaction
- ✅ `Category` - Categorization system
- ✅ `Budget`, `BudgetTemplate`, `BudgetCategory` - Budget features
- ✅ `Tag`, `TagAssignment` - Tagging system
- ⚠️ `Goal`, `Investment` - Review if used
- ⚠️ `FinanceAssistantConversation` - Review if used

---

## Simplified Architecture

### Core Models to Keep

#### finance_v2 (Primary)
```python
✅ Transaction - Core transaction model
✅ Entity - Merchants/people/companies
✅ Group - Shared expense groups
✅ GroupMember - Group membership
✅ TransactionSplit - Flexible splits
✅ TransactionItem - Line items
✅ UploadedFile - Universal file storage
✅ PendingTransaction - Review workflow
✅ ChatMessage - NEW chat interface
✅ StatementPassword - NEW password storage
```

#### finance (Supporting)
```python
✅ Account - Bank accounts (referenced by Transaction)
✅ Category - Transaction categories
✅ Budget - Budget management
✅ BudgetTemplate - Budget templates
✅ Tag - Tagging system
```

#### users
```python
✅ User - Authentication
✅ UserProfile - User info
✅ UserPreferences - UI preferences (enhanced)
✅ AISettings - AI provider settings (enhanced)
✅ Plan, UserSubscription - Subscription management
```

#### reference
```python
✅ Country, Language, Timezone
✅ CurrencyInfo - Currency data
✅ LocaleMapping - Internationalization
```

---

## API Endpoints to Keep

### finance_v2 (Primary API)
```
✅ /api/v1/entities/
✅ /api/v1/groups/
✅ /api/v1/group-members/
✅ /api/v1/transactions/
✅ /api/v1/pending-transactions/
✅ /api/v1/uploaded-files/
✅ /api/v1/chat/messages/          # NEW
✅ /api/v1/statement-passwords/    # NEW
```

### finance (Supporting API)
```
✅ /api/accounts/
✅ /api/categories/
✅ /api/budgets/
✅ /api/budget-templates/
✅ /api/tags/
```

### users
```
✅ /api/auth/*
✅ /api/users/profile/
✅ /api/users/preferences/
✅ /api/users/ai-settings/
```

### reference
```
✅ /api/reference/currencies/
✅ /api/reference/countries/
```

---

## Files to Remove/Deprecate

### Models (Remove)
```
❌ finance/models/invoice_training.py
❌ finance/models/parsing_attempts.py
❌ finance/models/transaction_details.py
❌ finance/models/transaction_groups.py
❌ finance/models/uploads.py (old upload system)
❌ finance/models/documents.py
❌ finance/models/expense_groups.py (replaced by finance_v2.Group)
```

### Views (Remove old endpoints)
```
❌ finance/views/invoice_views.py (if exists)
❌ finance/views/parsing_views.py (if exists)
❌ finance/views/upload_views.py (old upload)
```

### Keep Minimal (Core only)
```
✅ finance/views/accounts.py
✅ finance/views/categories.py
✅ finance/views/budgets.py
✅ finance/views/tags.py
```

---

## Refactoring Steps

### Phase 1: Document Deprecation
1. Mark old models as deprecated in docstrings
2. Add migration to prevent new data in old models
3. Create deprecation warnings

### Phase 2: Clean API Surface
1. Keep only essential endpoints in URLs
2. Remove unused ViewSets
3. Remove unused serializers

### Phase 3: Remove Dead Code
1. Remove training/learning models
2. Remove old upload models
3. Remove duplicate transaction models
4. Clean up imports

### Phase 4: Consolidate
1. Merge essential finance models into finance_v2 if possible
2. Update all references
3. Run migrations

---

## Simplified File Structure

### Recommended Final Structure
```
backend/
├── finance_v2/          # PRIMARY app (80% of functionality)
│   ├── models.py        # All v2 models in one file (DONE)
│   ├── serializers.py   # All serializers (DONE)
│   ├── views.py         # All ViewSets (DONE)
│   ├── urls.py          # API routes (DONE)
│   ├── tasks.py         # Celery tasks (DONE)
│   └── admin.py         # Admin interface (DONE)
│
├── finance/             # SUPPORTING app (20% of functionality)
│   ├── models/
│   │   ├── accounts.py  # ✅ Keep (referenced by v2)
│   │   ├── budgets.py   # ✅ Keep
│   │   ├── tagging.py   # ✅ Keep
│   │   └── currency.py  # ⚠️ Maybe move to reference
│   ├── views/           # Minimal ViewSets
│   ├── serializers/     # Minimal serializers
│   └── urls.py          # Supporting routes
│
├── users/               # ✅ Keep all
├── reference/           # ✅ Keep all
└── services/            # ⚠️ Review and keep only used
```

---

## Migration Strategy

### Conservative Approach (Recommended)
1. **DON'T delete models yet** - Mark as deprecated
2. **Remove from API** - Don't expose old endpoints
3. **Stop creating new data** - Add validation
4. **Monitor usage** - Log any access to old models
5. **Remove after 30 days** - If no usage detected

### Aggressive Approach (Risk)
1. Create backup
2. Remove old models immediately
3. Remove old views/URLs
4. Test thoroughly
5. Deploy

---

## Clean API Documentation

### Primary Endpoints (finance_v2)
```bash
# Transactions
GET    /api/v1/transactions/
POST   /api/v1/transactions/
GET    /api/v1/transactions/{id}/
PUT    /api/v1/transactions/{id}/
DELETE /api/v1/transactions/{id}/

# Chat (NEW)
POST   /api/v1/chat/messages/
POST   /api/v1/chat/messages/{id}/parse/
POST   /api/v1/chat/messages/{id}/save-transaction/

# Groups
GET    /api/v1/groups/
POST   /api/v1/groups/
GET    /api/v1/groups/{id}/
```

### Supporting Endpoints (finance)
```bash
# Accounts
GET    /api/accounts/
POST   /api/accounts/

# Budgets
GET    /api/budgets/
POST   /api/budgets/
GET    /api/budget-templates/
```

---

## Next Actions

1. ✅ **Document current state** (this file)
2. ⏳ **Create clean API-only version** - Expose only used endpoints
3. ⏳ **Remove unused imports** - Clean up dependencies
4. ⏳ **Deprecate old models** - Add warnings
5. ⏳ **Update documentation** - Reflect new structure
6. ⏳ **Test all endpoints** - Ensure nothing breaks

---

## Estimated Impact

### Code Reduction
- **Models**: Remove ~1,500 lines (training/parsing models)
- **Views**: Remove ~500 lines (old endpoints)
- **Serializers**: Remove ~300 lines
- **Total**: ~2,300 lines removed

### Performance Improvement
- Fewer models = faster migrations
- Cleaner API = better performance
- Less complexity = easier maintenance

### Risk Level
- **Low**: Deprecate and remove training models (not used in core flow)
- **Medium**: Remove old upload models (replaced by v2)
- **High**: Remove old Transaction model (ensure all using v2)

---

## Conclusion

**Recommended Approach:**
1. Keep current implementation as-is (it works)
2. Create new minimal API layer that only exposes needed endpoints
3. Hide old/unused endpoints without deleting models
4. Monitor for 30 days
5. Remove unused code after verification

This ensures zero downtime and safe refactoring.