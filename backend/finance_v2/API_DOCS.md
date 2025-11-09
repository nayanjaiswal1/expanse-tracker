# Finance V2 API - Mobile Developer Guide

**Base URL:** `https://api.yourapp.com/api/v2/finance/`

---

## Authentication

```bash
# Login
POST /api/auth/login/
{"username": "user", "password": "pass"}
→ Response: {"token": "abc123..."}

# Use token in all requests
Authorization: Token abc123...
```

**Store token securely:**
- iOS: Keychain
- Android: EncryptedSharedPreferences

---

## Quick Start

### Swift
```swift
let baseURL = "https://api.yourapp.com/api/v2/finance"
var request = URLRequest(url: URL(string: "\(baseURL)/transactions/")!)
request.setValue("Token \(token)", forHTTPHeaderField: "Authorization")

let (data, _) = try await URLSession.shared.data(for: request)
let response = try JSONDecoder().decode(PaginatedResponse<Transaction>.self, from: data)
```

### Kotlin
```kotlin
interface FinanceApi {
    @GET("transactions/")
    suspend fun getTransactions(): PaginatedResponse<Transaction>
}

val api = retrofit.create(FinanceApi::class.java)
val transactions = api.getTransactions()
```

---

## Core Endpoints

### Accounts
```bash
GET    /accounts/                    # List accounts
POST   /accounts/                    # Create account
GET    /accounts/{id}/               # Get account
PATCH  /accounts/{id}/               # Update account

# Create account
POST /accounts/
{
  "name": "Main Checking",
  "account_type": "checking",
  "balance": "1000.00",
  "currency": "USD"
}
```

### Transactions
```bash
GET    /transactions/                # List transactions
POST   /transactions/                # Create transaction
GET    /transactions/{id}/           # Get transaction
PATCH  /transactions/{id}/           # Update transaction
DELETE /transactions/{id}/           # Delete (soft)

# List with filters
GET /transactions/?date__gte=2025-01-01&date__lte=2025-01-31&account=1

# Create transaction
POST /transactions/
{
  "account": 1,
  "amount": "50.00",
  "is_expense": true,
  "description": "Coffee",
  "date": "2025-01-07",
  "entity": 5
}

# Create with items
POST /transactions/
{
  "account": 1,
  "amount": "25.50",
  "is_expense": true,
  "description": "Lunch",
  "date": "2025-01-07",
  "items": [
    {"name": "Burger", "quantity": "1", "unit_price": "12.99", "category": 5}
  ]
}
```

### Categories
```bash
GET    /categories/                  # List categories
POST   /categories/                  # Create category

# Create category
POST /categories/
{
  "name": "Food",
  "icon": "🍔",
  "color": "#FF5722",
  "parent": null
}
```

### Entities (Merchants)
```bash
GET    /entities/?search=star        # Search entities
POST   /entities/                    # Create entity
```

---

## Receipt OCR Flow

```bash
# 1. Upload image
POST /uploaded-files/
Content-Type: multipart/form-data
file: [image data]
file_type: receipt

→ Response: {"id": 10, "processing_status": "pending"}

# 2. Poll status (every 2 seconds)
GET /uploaded-files/10/processing-status/

→ Response: {
  "processing_status": "completed",
  "metadata": {"pending_transaction_id": 25}
}

# 3. Get pending transaction
GET /pending-transactions/25/

# 4. Approve
POST /pending-transactions/25/approve/
→ Creates final Transaction
```

### Swift Implementation
```swift
func scanReceipt(image: UIImage) async throws {
    // Upload
    let uploaded = try await uploadFile(image, fileType: "receipt")

    // Poll status
    while true {
        let status = try await getProcessingStatus(uploaded.id)
        if status.processing_status == "completed" {
            let pendingId = status.metadata["pending_transaction_id"]
            return pendingId
        }
        try await Task.sleep(nanoseconds: 2_000_000_000)
    }
}
```

### Kotlin Implementation
```kotlin
suspend fun scanReceipt(imageUri: Uri): Int {
    // Upload
    val uploaded = api.uploadFile(imageUri, "receipt")

    // Poll status
    repeat(30) {
        val status = api.getProcessingStatus(uploaded.id)
        if (status.processing_status == "completed") {
            return status.metadata["pending_transaction_id"]!!
        }
        delay(2000)
    }
    throw TimeoutException()
}
```

---

## Statement Import Flow

```bash
# 1. Upload CSV
POST /uploaded-files/
Content-Type: multipart/form-data
file: [CSV data]
file_type: statement
account: 1
processing_mode: ai  # or parser (default)

# 2. Poll status
GET /uploaded-files/11/processing-status/
→ {"processing_status": "completed", "metadata": {"transactions_created": 42}}

# 3. Get pending transactions
GET /pending-transactions/?source=file

# 4. Approve each
POST /pending-transactions/{id}/approve/
```

---

## Split Bill

```bash
# 1. Create group
POST /groups/
{"name": "Roommates", "currency": "USD"}

# 2. Add members
POST /group-members/
{"group": 1, "user": 2, "is_admin": false}

# 3. Create split transaction
POST /transactions/
{
  "group": 1,
  "amount": "100.00",
  "is_expense": true,
  "description": "Dinner",
  "date": "2025-01-07",
  "splits": [
    {"member": 1, "amount": "50.00"},
    {"member": 2, "amount": "50.00"}
  ]
}

# 4. Get balances
GET /group-members/?group=1
→ Returns total_paid, total_owed, balance for each member
```

---

## Budgets

```bash
POST /budgets/
{
  "name": "Monthly Groceries",
  "amount": "500.00",
  "category": 5,
  "start_date": "2025-01-01",
  "end_date": "2025-01-31"
}

GET /budgets/1/
→ {"amount": "500.00", "spent_amount": "342.56", ...}
```

---

## Common Queries

```bash
# Recent transactions
GET /transactions/?ordering=-date&limit=20

# This month
GET /transactions/?date__gte=2025-01-01&date__lte=2025-01-31

# By account
GET /transactions/?account=1

# Search
GET /transactions/?search=coffee

# Expenses only
GET /transactions/?is_expense=true

# Multiple filters
GET /transactions/?account=1&is_expense=true&date__gte=2025-01-01
```

---

## Pagination

```bash
# Page-based
GET /transactions/?page=1&limit=50

# Response includes next URL
{
  "count": 500,
  "next": "https://.../transactions/?page=2",
  "results": [...]
}
```

---

## Data Models

```swift
// Swift
struct Transaction: Codable {
    let id: Int
    let account: Int?
    let amount: String  // Use String or Decimal for money
    let currency: String  // Read-only, from account/group
    let isExpense: Bool
    let description: String
    let date: String  // "2025-01-07"
    let entity: Int?
    let items: [TransactionItem]

    enum CodingKeys: String, CodingKey {
        case id, account, amount, currency, description, date, entity, items
        case isExpense = "is_expense"
    }
}

struct PaginatedResponse<T: Codable>: Codable {
    let count: Int
    let next: String?
    let results: [T]
}
```

```kotlin
// Kotlin
@Serializable
data class Transaction(
    val id: Int,
    val account: Int?,
    val amount: String,
    val currency: String,
    @SerialName("is_expense") val isExpense: Boolean,
    val description: String,
    val date: String,
    val entity: Int?,
    val items: List<TransactionItem> = emptyList()
)

@Serializable
data class PaginatedResponse<T>(
    val count: Int,
    val next: String?,
    val results: List<T>
)
```

---

## Error Handling

```bash
# 400 Bad Request
{"account": ["This field is required."]}

# 401 Unauthorized
{"detail": "Invalid token."}
→ Re-login

# 404 Not Found
{"detail": "Not found."}

# 429 Rate Limited
→ Wait and retry

# 500 Server Error
→ Retry with exponential backoff
```

### Swift Error Handling
```swift
do {
    let transactions = try await fetchTransactions()
} catch {
    if let httpError = error as? HTTPError {
        switch httpError.statusCode {
        case 401:
            await reLogin()
            return try await fetchTransactions()
        case 429:
            try await Task.sleep(nanoseconds: 60_000_000_000)
            return try await fetchTransactions()
        default:
            throw error
        }
    }
}
```

---

## Best Practices

### 1. Secure Token Storage
```swift
// iOS - Keychain
KeychainWrapper.standard.set(token, forKey: "api_token")
let token = KeychainWrapper.standard.string(forKey: "api_token")
```

```kotlin
// Android - EncryptedSharedPreferences
val prefs = EncryptedSharedPreferences.create(...)
prefs.edit().putString("api_token", token).apply()
```

### 2. Cache Reference Data
Cache locally (refresh daily):
- Accounts
- Categories
- Entities

### 3. Offline Support
```swift
// Queue locally if offline
if !isOnline {
    localDB.save(transaction)
    return
}

// Sync when online
if isOnline {
    let pending = await localDB.getPending()
    for txn in pending {
        try await api.create(txn)
        await localDB.markSynced(txn.id)
    }
}
```

### 4. Optimistic Updates
```swift
// Add to UI immediately
transactions.insert(newTransaction, at: 0)

// Sync to server
Task {
    do {
        let created = try await api.create(newTransaction)
        updateLocalId(newTransaction.id, with: created.id)
    } catch {
        transactions.removeFirst()
        showError()
    }
}
```

### 5. Image Compression
```swift
func compress(_ image: UIImage) -> Data? {
    var compression: CGFloat = 0.8
    var data = image.jpegData(compressionQuality: compression)

    while let imageData = data, imageData.count > 500_000, compression > 0.1 {
        compression -= 0.1
        data = image.jpegData(compressionQuality: compression)
    }
    return data
}
```

---

## Complete Example: Add Transaction Screen

### Swift + SwiftUI
```swift
struct AddTransactionView: View {
    @StateObject var vm = AddTransactionViewModel()

    var body: some View {
        Form {
            Picker("Account", selection: $vm.account) {
                ForEach(vm.accounts) { Text($0.name).tag($0) }
            }
            TextField("Amount", value: $vm.amount, format: .currency(code: "USD"))
            Toggle("Expense", isOn: $vm.isExpense)
            TextField("Description", text: $vm.description)
            DatePicker("Date", selection: $vm.date)
        }
        .toolbar {
            Button("Save") { vm.save() }
        }
    }
}

@MainActor
class AddTransactionViewModel: ObservableObject {
    @Published var account: Account?
    @Published var amount: Decimal = 0
    @Published var isExpense = true
    @Published var description = ""
    @Published var date = Date()

    func save() {
        Task {
            try await api.createTransaction([
                "account": account!.id,
                "amount": "\(amount)",
                "is_expense": isExpense,
                "description": description,
                "date": date.ISO8601Format()
            ])
        }
    }
}
```

### Kotlin + Compose
```kotlin
@Composable
fun AddTransactionScreen(vm: AddTransactionViewModel) {
    Column {
        DropdownMenu(
            items = vm.accounts,
            selected = vm.selectedAccount,
            onSelect = { vm.selectedAccount = it }
        )

        TextField(
            value = vm.amount,
            onValueChange = { vm.amount = it },
            label = { Text("Amount") }
        )

        Switch(
            checked = vm.isExpense,
            onCheckedChange = { vm.isExpense = it }
        )

        Button(onClick = { vm.save() }) {
            Text("Save")
        }
    }
}

class AddTransactionViewModel : ViewModel() {
    fun save() = viewModelScope.launch {
        api.createTransaction(
            CreateTransactionRequest(
                account = selectedAccount.id,
                amount = amount,
                isExpense = isExpense,
                description = description,
                date = date.toISOString()
            )
        )
    }
}
```

---

## Testing

```bash
# Test endpoints with curl
curl -H "Authorization: Token YOUR_TOKEN" \
  https://api.yourapp.com/api/v2/finance/transactions/
```

**Postman Collection:** Import `finance_v2_postman_collection.json`

---

## Resources

- **Postman Collection:** `finance_v2_postman_collection.json`
- **Support:** api-support@example.com

---

**Version:** 1.0.0 | **Updated:** 2025-01-07
