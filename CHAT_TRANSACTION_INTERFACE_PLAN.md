# 💬 Chat-Based Transaction Interface - Implementation Plan

## Executive Summary

This document outlines the implementation plan for a **WhatsApp Business-style chat interface** integrated directly into the Transaction page. Users can quickly add transactions through natural language, @ mentions, and file uploads with AI parsing - all without leaving the transaction view.

---

## 🎨 UI/UX Design

### Layout Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Transaction Page Header                          │
│  [Filters] [Sort] [Export] [+ New Transaction]                      │
└─────────────────────────────────────────────────────────────────────┘
┌──────────────────────────┬──────────────────────────────────────────┐
│                          │                                          │
│  Transaction List (Left) │  Quick Add Chat (Right)                 │
│  60% width               │  40% width                               │
│                          │                                          │
│  ┌────────────────────┐ │  ┌────────────────────────────────────┐ │
│  │ Transaction Card   │ │  │  Chat Mode: [AI] [Normal]          │ │
│  │ $50.00 - Lunch     │ │  │                                     │ │
│  │ Pizza Hut          │ │  ├────────────────────────────────────┤ │
│  │ ✓ 2025-11-09      │ │  │                                     │ │
│  └────────────────────┘ │  │  📝 Message History                 │ │
│                          │  │                                     │ │
│  ┌────────────────────┐ │  │  [User] "@john $50 lunch"          │ │
│  │ Transaction Card   │ │  │                                     │ │
│  │ $120.00 - Grocery  │ │  │  [System] ✓ Transaction parsed     │ │
│  │ Whole Foods        │ │  │  ┌──────────────────────────────┐ │ │
│  │ ✓ 2025-11-08      │ │  │  │ Amount: $50.00               │ │ │
│  └────────────────────┘ │  │  │ Desc: lunch                  │ │ │
│                          │  │  │ Split with: @john            │ │ │
│  ┌────────────────────┐ │  │  │ [Edit] [Save Transaction]    │ │ │
│  │ Transaction Card   │ │  │  └──────────────────────────────┘ │ │
│  │ $25.00 - Transport │ │  │                                     │ │
│  │ Uber               │ │  │  [User] "Uploaded statement.pdf"   │ │
│  │ ✓ 2025-11-07      │ │  │                                     │ │
│  └────────────────────┘ │  │  [System] 🔄 Processing...         │ │
│                          │  │                                     │ │
│  [Load More...]          │  │                                     │ │
│                          │  ├────────────────────────────────────┤ │
│                          │  │  📎 [Attach] 💬 [Type message...]  │ │
│                          │  │  @ [Mention] [Send]                │ │
│                          │  └────────────────────────────────────┘ │
│                          │                                          │
└──────────────────────────┴──────────────────────────────────────────┘
```

### Responsive Behavior

**Desktop (> 1024px):**
- Split view: 60% transactions, 40% chat

**Tablet (768px - 1024px):**
- Split view: 50% transactions, 50% chat

**Mobile (< 768px):**
- Tabbed view: [Transactions] [Quick Add]
- User switches between tabs

---

## 🗄️ Database Schema Changes

### 1. **No New Tables Needed** ✅

The existing models from the previous implementation plan are sufficient:
- `ChatMessage` - Already designed ✅
- `Transaction` with `chat_metadata` field - Already in plan ✅
- `TransactionMention` - Already in plan ✅

### 2. **Enhanced `ChatMessage` Metadata Structure**

```python
# ChatMessage.metadata JSON structure
{
  "mode": "ai" | "normal" | "shortcut",  # Chat mode used
  "input_type": "text" | "file" | "voice",  # How user input
  "mentions": [
    {
      "type": "user" | "group" | "category" | "tag",
      "id": 123,
      "text": "@john",
      "position": 0  # Character position in message
    }
  ],
  "parsed": {
    "amount": 50.00,
    "currency": "USD",
    "description": "lunch at pizza place",
    "date": "2025-11-09",
    "category": "dining",
    "is_expense": true,
    "split_type": "equal" | "percentage" | "custom",
    "split_with": [5, 8],  # User IDs
    "confidence": 0.95,
    "transaction_type": "personal" | "group" | "transfer" | "lending"
  },
  "file_info": {  # If file uploaded
    "filename": "statement.pdf",
    "file_id": 456,
    "mime_type": "application/pdf",
    "size_bytes": 102400,
    "processing_status": "pending" | "processing" | "completed" | "failed"
  },
  "ai_provider": "openai" | "claude" | "gemini" | null,
  "processing_time_ms": 1250,
  "user_edits": [
    {
      "field": "amount",
      "original": 50.00,
      "edited": 45.00,
      "timestamp": "2025-11-09T12:34:56Z"
    }
  ]
}
```

### 3. **Enhanced `Transaction` Chat Metadata**

```python
# Transaction.chat_metadata JSON structure
{
  "created_via_chat": true,
  "chat_message_id": 789,
  "original_input": "@john $50 lunch at pizza place",
  "mode_used": "ai",
  "confidence_score": 0.95,
  "auto_categorized": true,
  "user_confirmed_at": "2025-11-09T12:35:30Z"
}
```

### 4. **User Preferences Addition**

Add to existing `UserPreferences` model:

```python
# New fields for UserPreferences
chat_default_mode = models.CharField(
    max_length=20,
    choices=[
        ('ai', 'AI Mode - Full parsing'),
        ('normal', 'Normal - Basic parsing'),
        ('shortcut', 'Shortcut - @person $amount format')
    ],
    default='ai'
)
chat_auto_save = models.BooleanField(
    default=False,
    help_text="Auto-save transactions without confirmation"
)
chat_default_split_method = models.CharField(
    max_length=20,
    choices=[('equal', 'Equal'), ('percentage', 'Percentage'), ('custom', 'Custom')],
    default='equal'
)
```

**Migration:**
```bash
cd backend
python manage.py makemigrations users
python manage.py migrate
```

---

## 🔧 Backend Implementation

### New API Endpoints

#### 1. Chat Quick Add API

```python
# finance_v2/views.py

class QuickAddChatViewSet(viewsets.ModelViewSet):
    """
    Chat interface for quick transaction entry
    """
    queryset = ChatMessage.objects.all()
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Filter by user and conversation_id='quick-add'
        return ChatMessage.objects.filter(
            user=self.request.user,
            conversation_id='quick-add'
        ).order_by('-created_at')

    @action(detail=False, methods=['post'])
    def parse_message(self, request):
        """
        Parse user message into transaction suggestion
        POST /api/v1/quick-add/parse_message/
        Body: { "content": "@john $50 lunch", "mode": "ai" }
        """
        content = request.data.get('content')
        mode = request.data.get('mode', 'ai')  # ai, normal, shortcut

        # Create chat message
        message = ChatMessage.objects.create(
            user=request.user,
            conversation_id='quick-add',
            message_type='user',
            content=content,
            status='processing',
            metadata={'mode': mode, 'input_type': 'text'}
        )

        # Dispatch Celery task for AI parsing
        if mode == 'ai':
            parse_chat_message_with_ai.delay(message.id)
        elif mode == 'shortcut':
            # Quick regex parsing for "@person $amount description"
            parse_shortcut_message.delay(message.id)
        else:
            # Basic parsing
            parse_normal_message.delay(message.id)

        return Response(
            ChatMessageSerializer(message).data,
            status=status.HTTP_202_ACCEPTED
        )

    @action(detail=False, methods=['post'])
    def upload_file(self, request):
        """
        Upload file for parsing (PDF, CSV, image)
        POST /api/v1/quick-add/upload_file/
        Body: multipart/form-data with file
        """
        file = request.FILES.get('file')
        mode = request.data.get('mode', 'ai')

        if not file:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Save to UploadedFile
        uploaded_file = UploadedFile.objects.create(
            user=request.user,
            file=file,
            filename=file.name,
            file_type='statement',  # or auto-detect
            upload_source='chat',
            processing_mode='ai' if mode == 'ai' else 'parser'
        )

        # Create chat message
        message = ChatMessage.objects.create(
            user=request.user,
            conversation_id='quick-add',
            message_type='user',
            content=f"Uploaded file: {file.name}",
            status='processing',
            related_file=uploaded_file,
            metadata={
                'mode': mode,
                'input_type': 'file',
                'file_info': {
                    'filename': file.name,
                    'file_id': uploaded_file.id,
                    'mime_type': file.content_type,
                    'size_bytes': file.size
                }
            }
        )

        # Dispatch file processing task
        process_chat_file_upload.delay(message.id, uploaded_file.id)

        return Response(
            ChatMessageSerializer(message).data,
            status=status.HTTP_202_ACCEPTED
        )

    @action(detail=True, methods=['post'])
    def save_transaction(self, request, pk=None):
        """
        Save parsed transaction from chat message
        POST /api/v1/quick-add/{message_id}/save_transaction/
        Body: { "edits": { "amount": 45.00, "description": "updated" } }
        """
        message = self.get_object()
        edits = request.data.get('edits', {})

        # Get parsed data from metadata
        parsed = message.metadata.get('parsed', {})

        # Apply user edits
        for field, value in edits.items():
            if field in parsed:
                # Track edit history
                if 'user_edits' not in message.metadata:
                    message.metadata['user_edits'] = []
                message.metadata['user_edits'].append({
                    'field': field,
                    'original': parsed[field],
                    'edited': value,
                    'timestamp': timezone.now().isoformat()
                })
                parsed[field] = value

        # Create transaction
        transaction = Transaction.objects.create(
            user=request.user,
            amount=parsed.get('amount'),
            description=parsed.get('description'),
            date=parsed.get('date', timezone.now().date()),
            is_expense=parsed.get('is_expense', True),
            chat_message=message,
            chat_metadata={
                'created_via_chat': True,
                'chat_message_id': message.id,
                'original_input': message.content,
                'mode_used': message.metadata.get('mode'),
                'confidence_score': parsed.get('confidence'),
                'user_confirmed_at': timezone.now().isoformat()
            }
        )

        # Handle mentions (create TransactionMention records)
        mentions = message.metadata.get('mentions', [])
        for mention in mentions:
            if mention['type'] == 'user':
                TransactionMention.objects.create(
                    transaction=transaction,
                    created_by=request.user,
                    mention_type='user',
                    mentioned_user_id=mention['id'],
                    mentioned_text=mention['text']
                )

        # Handle splits (if group transaction)
        split_with = parsed.get('split_with', [])
        if split_with:
            # Create transaction splits
            for user_id in split_with:
                TransactionSplit.objects.create(
                    transaction=transaction,
                    user_id=user_id,
                    amount=parsed['amount'] / len(split_with),
                    split_method=parsed.get('split_type', 'equal')
                )

        # Update message status
        message.status = 'completed'
        message.related_transaction = transaction
        message.save()

        return Response(
            {
                'message': 'Transaction saved successfully',
                'transaction': TransactionSerializer(transaction).data,
                'chat_message': ChatMessageSerializer(message).data
            },
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['get'])
    def mention_autocomplete(self, request):
        """
        Get autocomplete suggestions for @ mentions
        GET /api/v1/quick-add/mention_autocomplete/?q=john&type=user
        """
        query = request.query_params.get('q', '')
        mention_type = request.query_params.get('type', 'user')

        results = []

        if mention_type == 'user':
            # Search users (friends, group members)
            users = User.objects.filter(
                Q(first_name__icontains=query) |
                Q(last_name__icontains=query) |
                Q(username__icontains=query)
            )[:10]
            results = [
                {
                    'type': 'user',
                    'id': user.id,
                    'text': f"@{user.username}",
                    'display': f"{user.get_full_name()} (@{user.username})",
                    'avatar': user.profile.profile_photo if hasattr(user, 'profile') else None
                }
                for user in users
            ]

        elif mention_type == 'group':
            # Search groups
            groups = Group.objects.filter(
                user=request.user,
                name__icontains=query,
                is_active=True
            )[:10]
            results = [
                {
                    'type': 'group',
                    'id': group.id,
                    'text': f"@{group.name}",
                    'display': group.name,
                    'members_count': group.members.count()
                }
                for group in groups
            ]

        elif mention_type == 'category':
            # Search categories
            categories = Category.objects.filter(
                Q(user=request.user) | Q(user__isnull=True),
                name__icontains=query
            )[:10]
            results = [
                {
                    'type': 'category',
                    'id': cat.id,
                    'text': f"#{cat.name}",
                    'display': cat.name,
                    'icon': cat.icon
                }
                for cat in categories
            ]

        return Response(results)
```

#### 2. URL Routing

```python
# finance_v2/urls.py

from rest_framework.routers import DefaultRouter
from .views import QuickAddChatViewSet

router = DefaultRouter()
router.register('quick-add', QuickAddChatViewSet, basename='quick-add')

urlpatterns = router.urls
```

### Celery Tasks

```python
# finance_v2/tasks.py

from celery import shared_task
from .models import ChatMessage, UploadedFile
from .services.ai_service import LLMProvider
import re

@shared_task
def parse_chat_message_with_ai(message_id):
    """
    Parse chat message using AI
    """
    try:
        message = ChatMessage.objects.get(id=message_id)
        user = message.user

        # Get user's AI settings
        ai_settings = user.ai_settings
        provider = LLMProvider(provider=ai_settings.preferred_provider)

        # Prepare prompt
        prompt = f"""
Extract transaction details from this message: "{message.content}"

Identify:
1. Amount (numeric value)
2. Currency (if mentioned, default to user's currency)
3. Description/purpose
4. Date (if mentioned, default to today)
5. Any @ mentions (people or groups)
6. Transaction type (personal, group, transfer, lending)
7. Expense category

Respond in JSON format:
{{
  "amount": float,
  "currency": "USD",
  "description": "string",
  "date": "YYYY-MM-DD",
  "category": "category_name",
  "is_expense": boolean,
  "transaction_type": "personal|group|transfer|lending",
  "mentions": [
    {{"type": "user|group", "text": "@name"}}
  ],
  "confidence": 0.0-1.0
}}
        """

        # Call AI
        response = provider.generate_json(
            prompt=prompt,
            model=ai_settings.openai_model if ai_settings.preferred_provider == 'openai' else None
        )

        # Update message with parsed data
        message.metadata['parsed'] = response
        message.metadata['ai_provider'] = ai_settings.preferred_provider
        message.status = 'completed'
        message.save()

        # Create system response message
        ChatMessage.objects.create(
            user=user,
            conversation_id='quick-add',
            message_type='suggestion',
            content=f"Transaction parsed: ${response.get('amount')} - {response.get('description')}",
            metadata={'suggestion_data': response},
            status='completed'
        )

    except Exception as e:
        message.status = 'failed'
        message.metadata['error'] = str(e)
        message.save()

@shared_task
def parse_shortcut_message(message_id):
    """
    Parse shortcut format: "@person $amount description"
    """
    try:
        message = ChatMessage.objects.get(id=message_id)
        content = message.content

        # Regex pattern: @username $amount description
        pattern = r'@(\w+)\s+\$?([\d.,]+)\s+(.*)'
        match = re.match(pattern, content)

        if match:
            username, amount, description = match.groups()
            amount = float(amount.replace(',', ''))

            # Find user by username
            mentioned_user = User.objects.filter(username=username).first()

            parsed = {
                'amount': amount,
                'currency': message.user.preferences.preferred_currency,
                'description': description.strip(),
                'date': timezone.now().date().isoformat(),
                'is_expense': True,
                'transaction_type': 'group',
                'mentions': [
                    {
                        'type': 'user',
                        'id': mentioned_user.id if mentioned_user else None,
                        'text': f'@{username}'
                    }
                ],
                'split_with': [mentioned_user.id] if mentioned_user else [],
                'confidence': 0.98  # High confidence for explicit format
            }

            message.metadata['parsed'] = parsed
            message.status = 'completed'
            message.save()
        else:
            message.status = 'failed'
            message.metadata['error'] = 'Invalid shortcut format. Use: @person $amount description'
            message.save()

    except Exception as e:
        message.status = 'failed'
        message.metadata['error'] = str(e)
        message.save()

@shared_task
def process_chat_file_upload(message_id, file_id):
    """
    Process file uploaded in chat
    """
    try:
        message = ChatMessage.objects.get(id=message_id)
        uploaded_file = UploadedFile.objects.get(id=file_id)

        # Update message status
        message.metadata['file_info']['processing_status'] = 'processing'
        message.save()

        # Process file based on type
        if uploaded_file.filename.lower().endswith('.pdf'):
            # Parse bank statement
            from .services.statement_parser import parse_bank_statement
            transactions = parse_bank_statement(uploaded_file, use_ai=True)

            parsed = {
                'file_type': 'statement',
                'transactions_found': len(transactions),
                'transactions': transactions,
                'confidence': 0.85
            }

        elif uploaded_file.filename.lower().endswith(('.jpg', '.jpeg', '.png')):
            # OCR receipt
            from .services.ocr_service import extract_receipt_data
            data = extract_receipt_data(uploaded_file)

            parsed = {
                'file_type': 'receipt',
                'amount': data.get('total'),
                'description': data.get('merchant'),
                'date': data.get('date'),
                'items': data.get('line_items', []),
                'confidence': data.get('confidence', 0.75)
            }

        # Update message
        message.metadata['parsed'] = parsed
        message.metadata['file_info']['processing_status'] = 'completed'
        message.status = 'completed'
        message.save()

        # Create system response
        ChatMessage.objects.create(
            user=message.user,
            conversation_id='quick-add',
            message_type='suggestion',
            content=f"File processed: Found {len(parsed.get('transactions', [parsed]))} transaction(s)",
            metadata={'file_parsed_data': parsed},
            status='completed'
        )

    except Exception as e:
        message.metadata['file_info']['processing_status'] = 'failed'
        message.metadata['error'] = str(e)
        message.status = 'failed'
        message.save()
```

---

## 🎨 Frontend Implementation

### Component Structure

```
frontend/src/features/finance/
├── TransactionsPage.tsx              # Main page with split view
├── components/
│   ├── TransactionList.tsx          # Left panel - transaction cards
│   ├── QuickAddChat/                # Right panel - chat interface
│   │   ├── QuickAddChat.tsx        # Main container
│   │   ├── ChatHeader.tsx          # Mode selector, settings
│   │   ├── ChatMessageList.tsx     # Message history
│   │   ├── ChatMessage.tsx         # Individual message
│   │   ├── TransactionSuggestion.tsx # Parsed transaction card
│   │   ├── ChatInput.tsx           # Input with mentions
│   │   ├── MentionAutocomplete.tsx # @ mention dropdown
│   │   ├── FileUploadZone.tsx      # Drag-drop area
│   │   └── ChatModeToggle.tsx      # AI/Normal/Shortcut toggle
│   └── ...
```

### Main Page Component

```typescript
// frontend/src/features/finance/TransactionsPage.tsx

import React, { useState } from 'react';
import { TransactionList } from './components/TransactionList';
import { QuickAddChat } from './components/QuickAddChat/QuickAddChat';

export const TransactionsPage: React.FC = () => {
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState<'transactions' | 'quick-add'>('transactions');

  return (
    <div className="h-screen flex flex-col">
      {/* Page Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Transactions</h1>
          <div className="flex gap-3">
            <button className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
              Filters
            </button>
            <button className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
              Export
            </button>
            <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              + New Transaction
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Tabs */}
      {isMobileView && (
        <div className="bg-white border-b px-6 flex gap-4">
          <button
            className={`px-4 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'transactions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600'
            }`}
            onClick={() => setActiveTab('transactions')}
          >
            Transactions
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'quick-add'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600'
            }`}
            onClick={() => setActiveTab('quick-add')}
          >
            Quick Add
          </button>
        </div>
      )}

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Transaction List */}
        <div
          className={`${
            isMobileView
              ? activeTab === 'transactions' ? 'w-full' : 'hidden'
              : 'w-3/5'
          } border-r overflow-y-auto`}
        >
          <TransactionList />
        </div>

        {/* Right: Quick Add Chat */}
        <div
          className={`${
            isMobileView
              ? activeTab === 'quick-add' ? 'w-full' : 'hidden'
              : 'w-2/5'
          } bg-gray-50 overflow-hidden`}
        >
          <QuickAddChat />
        </div>
      </div>
    </div>
  );
};
```

### Chat Container Component

```typescript
// frontend/src/features/finance/components/QuickAddChat/QuickAddChat.tsx

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChatHeader } from './ChatHeader';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import { quickAddAPI } from '../../api/quickAdd';

type ChatMode = 'ai' | 'normal' | 'shortcut';

export const QuickAddChat: React.FC = () => {
  const [mode, setMode] = useState<ChatMode>('ai');
  const queryClient = useQueryClient();

  // Fetch chat messages
  const { data: messages, isLoading } = useQuery({
    queryKey: ['quick-add-messages'],
    queryFn: quickAddAPI.getMessages,
    refetchInterval: 3000, // Poll every 3s for updates
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: (content: string) =>
      quickAddAPI.parseMessage({ content, mode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-add-messages'] });
    },
  });

  // Upload file mutation
  const uploadFile = useMutation({
    mutationFn: (file: File) =>
      quickAddAPI.uploadFile(file, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-add-messages'] });
    },
  });

  // Save transaction mutation
  const saveTransaction = useMutation({
    mutationFn: ({ messageId, edits }: { messageId: number; edits: any }) =>
      quickAddAPI.saveTransaction(messageId, edits),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-add-messages'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <ChatHeader mode={mode} onModeChange={setMode} />

      {/* Messages */}
      <ChatMessageList
        messages={messages || []}
        isLoading={isLoading}
        onSaveTransaction={(messageId, edits) =>
          saveTransaction.mutate({ messageId, edits })
        }
      />

      {/* Input */}
      <ChatInput
        mode={mode}
        onSendMessage={(content) => sendMessage.mutate(content)}
        onUploadFile={(file) => uploadFile.mutate(file)}
      />
    </div>
  );
};
```

### Chat Input with Mentions

```typescript
// frontend/src/features/finance/components/QuickAddChat/ChatInput.tsx

import React, { useState, useRef } from 'react';
import { Paperclip, Send, AtSign } from 'lucide-react';
import { MentionAutocomplete } from './MentionAutocomplete';

interface ChatInputProps {
  mode: 'ai' | 'normal' | 'shortcut';
  onSendMessage: (content: string) => void;
  onUploadFile: (file: File) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  mode,
  onSendMessage,
  onUploadFile,
}) => {
  const [input, setInput] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart;

    setInput(value);
    setCursorPosition(cursor);

    // Detect @ mention
    const beforeCursor = value.substring(0, cursor);
    const mentionMatch = beforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setShowMentions(true);
      setMentionQuery(mentionMatch[1]);
    } else {
      setShowMentions(false);
    }
  };

  const handleMentionSelect = (mention: {
    type: string;
    text: string;
    id: number;
  }) => {
    const beforeMention = input.substring(0, cursorPosition).replace(/@\w*$/, '');
    const afterMention = input.substring(cursorPosition);

    const newInput = beforeMention + mention.text + ' ' + afterMention;
    setInput(newInput);
    setShowMentions(false);

    // Focus back to input
    if (inputRef.current) {
      inputRef.current.focus();
      const newCursor = beforeMention.length + mention.text.length + 1;
      inputRef.current.setSelectionRange(newCursor, newCursor);
    }
  };

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-white p-4">
      {/* Mode Hint */}
      {mode === 'shortcut' && (
        <div className="mb-2 text-xs text-gray-500 bg-blue-50 px-3 py-2 rounded">
          💡 Shortcut mode: Type <code>@person $amount description</code>
        </div>
      )}

      {/* Mention Autocomplete */}
      {showMentions && (
        <MentionAutocomplete
          query={mentionQuery}
          onSelect={handleMentionSelect}
          onClose={() => setShowMentions(false)}
        />
      )}

      {/* Input Area */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === 'ai'
                ? 'Type naturally: "Spent $50 on lunch with @john"'
                : mode === 'shortcut'
                ? 'Use format: @person $amount description'
                : 'Type a transaction...'
            }
            className="w-full px-4 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {/* Attach File */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 border rounded-lg hover:bg-gray-50"
            title="Attach file"
          >
            <Paperclip size={18} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.csv,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
          />

          {/* Mention */}
          <button
            onClick={() => {
              setInput(input + '@');
              if (inputRef.current) {
                inputRef.current.focus();
              }
            }}
            className="p-2 border rounded-lg hover:bg-gray-50"
            title="Mention"
          >
            <AtSign size={18} />
          </button>

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Send"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
```

### Transaction Suggestion Card

```typescript
// frontend/src/features/finance/components/QuickAddChat/TransactionSuggestion.tsx

import React, { useState } from 'react';
import { Edit2, Save, X } from 'lucide-react';

interface TransactionSuggestionProps {
  message: any;
  onSave: (edits: any) => void;
}

export const TransactionSuggestion: React.FC<TransactionSuggestionProps> = ({
  message,
  onSave,
}) => {
  const parsed = message.metadata?.parsed;
  const [isEditing, setIsEditing] = useState(false);
  const [edits, setEdits] = useState({
    amount: parsed?.amount || 0,
    description: parsed?.description || '',
    category: parsed?.category || '',
  });

  if (!parsed) return null;

  const confidence = parsed.confidence || 0;
  const confidenceColor =
    confidence > 0.9 ? 'text-green-600' : confidence > 0.7 ? 'text-yellow-600' : 'text-red-600';

  const handleSave = () => {
    onSave(edits);
    setIsEditing(false);
  };

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-green-900">
          ✓ Transaction Parsed
        </h4>
        <span className={`text-xs font-medium ${confidenceColor}`}>
          {Math.round(confidence * 100)}% confident
        </span>
      </div>

      {/* Transaction Details */}
      {!isEditing ? (
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Amount:</span>
            <span className="text-sm font-medium">${parsed.amount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Description:</span>
            <span className="text-sm font-medium">{parsed.description}</span>
          </div>
          {parsed.category && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Category:</span>
              <span className="text-sm font-medium">{parsed.category}</span>
            </div>
          )}
          {parsed.mentions && parsed.mentions.length > 0 && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Split with:</span>
              <span className="text-sm font-medium">
                {parsed.mentions.map((m: any) => m.text).join(', ')}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="number"
            value={edits.amount}
            onChange={(e) => setEdits({ ...edits, amount: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 border rounded text-sm"
            placeholder="Amount"
          />
          <input
            type="text"
            value={edits.description}
            onChange={(e) => setEdits({ ...edits, description: e.target.value })}
            className="w-full px-3 py-2 border rounded text-sm"
            placeholder="Description"
          />
          <input
            type="text"
            value={edits.category}
            onChange={(e) => setEdits({ ...edits, category: e.target.value })}
            className="w-full px-3 py-2 border rounded text-sm"
            placeholder="Category"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {!isEditing ? (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 px-3 py-2 text-sm border border-green-600 text-green-600 rounded hover:bg-green-50"
            >
              <Edit2 size={14} className="inline mr-1" />
              Edit
            </button>
            <button
              onClick={() => onSave({})}
              className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              <Save size={14} className="inline mr-1" />
              Save Transaction
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              <X size={14} className="inline mr-1" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              <Save size={14} className="inline mr-1" />
              Save Changes
            </button>
          </>
        )}
      </div>
    </div>
  );
};
```

---

## 📱 Mobile Optimization

### Responsive Behavior

**Desktop (1024px+):**
- Split view: 60% transactions, 40% chat
- Both panels visible simultaneously

**Tablet (768px - 1024px):**
- Split view: 50/50
- Both panels visible

**Mobile (<768px):**
- Tabbed interface: Switch between Transactions and Quick Add
- Full-width single panel
- Bottom tab bar for easy switching

---

## 🔐 Security Considerations

### API Security

1. **Authentication:** All endpoints require `IsAuthenticated` permission
2. **Row-Level Security:** Users can only see their own chat messages
3. **Rate Limiting:** Limit chat message creation to 100/hour per user
4. **File Upload Security:**
   - File type validation (whitelist: PDF, CSV, JPG, PNG)
   - File size limit: 10MB max
   - Virus scanning (optional, using ClamAV)
5. **Input Sanitization:** Sanitize all user inputs to prevent XSS

### Data Privacy

1. **Encrypted Storage:** API keys and sensitive data encrypted with Fernet
2. **Audit Trail:** All transaction creations logged with chat_metadata
3. **User Consent:** Clear indication when AI is processing their data
4. **Data Retention:** Chat messages auto-deleted after 90 days (optional)

---

## 🎯 User Experience Flow

### Scenario 1: Quick Expense Entry (AI Mode)

1. User types: "@john $50 lunch at pizza place"
2. System shows "Processing..." indicator
3. AI parses message (3-5 seconds)
4. System displays parsed transaction card:
   - Amount: $50.00
   - Description: lunch at pizza place
   - Split with: @john (equal split)
   - Category: Dining (auto-detected)
   - Confidence: 95%
5. User reviews and clicks "Save Transaction"
6. Transaction appears in left panel immediately
7. Chat shows "✓ Transaction saved" confirmation

### Scenario 2: Statement Upload

1. User drags PDF statement into chat
2. System shows "Uploading..." progress
3. File uploaded, chat shows "Processing file..."
4. AI extracts 15 transactions (30-60 seconds)
5. System displays summary: "Found 15 transactions"
6. User clicks summary to review each transaction
7. User approves transactions one by one
8. All approved transactions appear in left panel

### Scenario 3: Shortcut Mode

1. User switches to Shortcut mode
2. System shows hint: "Use format: @person $amount description"
3. User types: "@sarah $30 coffee"
4. System parses instantly (no AI delay)
5. Transaction card shows immediately
6. User clicks "Save" - done in 3 seconds

---

## 📊 Analytics & Monitoring

### Metrics to Track

1. **Usage Metrics:**
   - Chat messages sent per day
   - Transactions created via chat vs manual
   - Average time from message to saved transaction
   - Mode preference (AI vs Normal vs Shortcut)

2. **Performance Metrics:**
   - AI parsing time (p50, p95, p99)
   - Message delivery latency
   - File upload success rate
   - API response times

3. **Quality Metrics:**
   - AI parsing accuracy (user corrections / total)
   - Mention autocomplete hit rate
   - Transaction approval rate (saved / suggested)

4. **Error Metrics:**
   - Failed message parses
   - File upload failures
   - API errors

---

## ✅ Testing Strategy

### Unit Tests

1. **Backend:**
   - Message parsing logic
   - Mention extraction regex
   - Transaction creation from parsed data
   - File upload validation

2. **Frontend:**
   - Chat input component
   - Mention autocomplete logic
   - Message rendering
   - Transaction suggestion editing

### Integration Tests

1. End-to-end flow: Message → Parse → Save → Display
2. File upload → Process → Extract → Save
3. Mention autocomplete → Select → Parse
4. Mode switching behavior

### E2E Tests (Playwright)

1. **Happy Path:**
   - User sends message → AI parses → User saves → Transaction appears
2. **File Upload:**
   - User uploads statement → Processing → Review → Save all
3. **Error Handling:**
   - Invalid message format → Error message shown
   - File upload failure → Retry option

---

## 🚀 Deployment Checklist

### Backend

- [ ] Run migrations: `python manage.py migrate`
- [ ] Create indexes for ChatMessage queries
- [ ] Set up Celery workers for background tasks
- [ ] Configure Redis for task queue
- [ ] Set up AI provider API keys in environment
- [ ] Configure file storage (S3 or local)
- [ ] Set up rate limiting rules
- [ ] Enable logging for chat API endpoints

### Frontend

- [ ] Install dependencies: `npm install`
- [ ] Update API base URL in config
- [ ] Test responsive behavior on mobile/tablet
- [ ] Test mention autocomplete with real data
- [ ] Verify file upload size limits
- [ ] Test error handling and retry logic
- [ ] Enable React Query devtools (development only)

### Infrastructure

- [ ] Increase Celery worker count for AI tasks
- [ ] Set up monitoring for task queue length
- [ ] Configure alerts for failed messages
- [ ] Set up log aggregation (e.g., ELK stack)
- [ ] Test with production-like data volume
- [ ] Perform load testing (100 concurrent users)

---

## 📝 Summary

This implementation plan provides:

1. ✅ **Database Schema:** Minimal changes, reuses existing models
2. ✅ **Backend API:** Complete REST API with 4 main endpoints
3. ✅ **Celery Tasks:** 3 background tasks for AI parsing and file processing
4. ✅ **Frontend Components:** 10+ React components with TypeScript
5. ✅ **Mobile-First:** Responsive design with tab switching on mobile
6. ✅ **Security:** Authentication, rate limiting, input validation
7. ✅ **Testing:** Unit, integration, and E2E test strategy
8. ✅ **Deployment:** Complete checklist for production readiness

**Estimated Implementation Time:**
- Backend: 2-3 days
- Frontend: 3-4 days
- Testing: 1-2 days
- **Total: 6-9 days**

---

**Next Steps:**

1. Review this plan with the team
2. Start with backend implementation (API + Celery tasks)
3. Build frontend components incrementally
4. Test each feature as you go
5. Deploy to staging for user testing
6. Collect feedback and iterate

**Questions? Issues? Improvements?** Open a GitHub issue!

---

**Document Version:** 1.0
**Created:** 2025-11-09
**Author:** Claude (Anthropic)
**Status:** Ready for Implementation
