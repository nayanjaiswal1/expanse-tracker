# Backend - Expense Tracker API

## Overview
Django REST Framework-based backend API for an AI-powered expense tracking and financial management system with advanced document processing, OCR capabilities, and multi-provider AI integrations.

## Tech Stack
- **Framework**: Django 4.2.24
- **API Framework**: Django REST Framework 3.16.1
- **Authentication**: djangorestframework-simplejwt 5.5.1, django-allauth 65.11.2
- **Database**: PostgreSQL (via psycopg2-binary 2.9.10)
- **Task Queue**: Celery 5.5.3 with Redis 6.4.0
- **Scheduling**: django-celery-beat 2.8.1
- **AI Providers**:
  - OpenAI 1.108.1
  - Anthropic Claude 0.40.0
  - Ollama 0.5.4 (local models)
- **Document Processing**:
  - PDF: pypdf 6.1.1, PyPDF2 3.0.1, pdf2image 1.17.0, PyMuPDF 1.26.4
  - Word: python-docx 1.2.0
  - Excel: openpyxl 3.1.5, xlsxwriter 3.2.9
- **OCR & Computer Vision**:
  - opencv-python 4.12.0.88
  - pytesseract 0.3.13
  - pillow 11.3.0
- **Data Processing**: pandas 2.3.2, numpy 2.2.6
- **Cloud Storage**: boto3 1.35.50, django-storages 1.14.4 (AWS S3)
- **External Integrations**:
  - Splitwise 3.0.0
  - Google APIs (Drive, Sheets, etc.)
  - Telegram Bot (python-telegram-bot 22.4)
- **Security**: cryptography 46.0.1, PyJWT 2.10.1
- **Production Server**: gunicorn 23.0.0, whitenoise 6.11.0

## Project Structure
```
backend/
├── app_settings/          # Django project configuration
│   ├── settings.py       # Main settings
│   ├── celery.py        # Celery configuration
│   ├── logging_config.py # Logging setup
│   └── urls.py          # Root URL configuration
├── finance/              # Main finance application
│   ├── models/          # Database models
│   ├── serializers/     # DRF serializers
│   ├── views/           # API views
│   ├── services/        # Business logic
│   ├── signals/         # Django signals
│   ├── migrations/      # Database migrations
│   ├── admin.py         # Django admin configuration
│   ├── filters.py       # DRF filters
│   └── tasks.py         # Celery tasks
├── finance_v2/           # Version 2 of finance app
├── services/             # AI & Processing services
│   ├── ai_*.py          # AI integration modules
│   ├── document_ocr_service.py
│   ├── enhanced_invoice_parser.py
│   ├── storage_service.py
│   ├── providers/       # AI provider implementations
│   ├── services/        # Core services
│   ├── middleware/      # Custom middleware
│   └── management/      # Django management commands
├── users/                # User management
├── training/             # ML/Training functionality
├── utils/                # Utility functions
├── manage.py             # Django management script
├── requirements.txt      # Python dependencies
├── Dockerfile            # Container configuration
└── .env.template         # Environment variables template
```

## Key Applications

### Finance App
Main application for expense and financial transaction management:
- Transaction tracking and categorization
- Invoice processing and parsing
- Bank statement analysis
- Multi-level data parsing
- Enhanced upload capabilities
- Custom filters for querying financial data

### Services App
AI-powered document processing and analysis:
- **AI Integrations**: Multi-provider AI support (OpenAI, Anthropic, Ollama)
- **Document Processing**: Automated extraction from PDFs, images, Word docs, Excel
- **OCR Service**: Text extraction from scanned documents and images
- **Invoice Parser**: AI-powered invoice data extraction
- **Bank Statement Parser**: Automated transaction extraction from statements
- **Table Extractor**: Extract structured data from tables in documents
- **Unified Parser**: Consolidated parsing service for multiple document types
- **Report Generation**: AI-assisted financial report creation
- **Stripe Integration**: Payment processing and financial data sync

### Users App
User authentication and management:
- JWT-based authentication
- Django Allauth for social authentication
- User profile management
- Permission and role management

## Key Features

### Document Processing Pipeline
1. **Upload**: Handle various document formats (PDF, images, Word, Excel)
2. **OCR**: Extract text from scanned documents using Tesseract
3. **AI Analysis**: Process with OpenAI/Anthropic/Ollama for data extraction
4. **Data Extraction**: Parse invoices, receipts, bank statements
5. **Validation**: Verify and clean extracted data
6. **Storage**: Save to PostgreSQL with S3 backup for files

### Background Processing
- **Celery Workers**: Asynchronous task processing
- **Redis**: Message broker and caching
- **Scheduled Tasks**: Periodic jobs with Celery Beat
- **Task Monitoring**: Track job status and results

### Security Features
- JWT token authentication
- Encrypted password storage for PDF documents
- Rate limiting (django-ratelimit)
- CORS configuration
- Environment-based secrets management

### External Integrations
- **Splitwise**: Expense sharing integration
- **Google Services**: Drive, Sheets API access
- **Telegram**: Bot notifications and commands
- **AWS S3**: Document storage

## API Architecture
- **RESTful Design**: Standard REST endpoints
- **Nested Routers**: Complex resource relationships (drf-nested-routers)
- **Filtering**: django-filter for advanced queries
- **Pagination**: Configurable pagination
- **Serialization**: DRF serializers with validation
- **Authentication**: JWT tokens (SimpleJWT)

## Development Guidelines

### Code Quality
- Use Ruff 0.13.1 for linting and formatting
- Run vulture 2.3 to detect dead code
- Follow Django best practices
- Keep business logic in services, not views
- Use signals for decoupled event handling

### Database
- Use PostgreSQL for all environments
- Create migrations for all model changes
- Use select_related/prefetch_related for query optimization
- Index frequently queried fields

### API Development
- Use DRF serializers for all API endpoints
- Implement proper error handling
- Return appropriate HTTP status codes
- Document endpoints with docstrings
- Use viewsets for CRUD operations

### Async Tasks
- Use Celery for long-running operations
- Handle task failures gracefully
- Implement retry logic for transient failures
- Monitor task queues

### AI Integration
- Abstract AI provider logic in services/providers/
- Handle API rate limits and errors
- Implement fallback providers
- Cache AI responses when appropriate
- Monitor token usage and costs

## Environment Variables
See `.env.template` for required configuration:
- Database credentials (PostgreSQL)
- Redis connection
- AWS S3 credentials
- AI provider API keys (OpenAI, Anthropic)
- Secret keys and security settings
- External service credentials

## Running the Application

### Development
```bash
python manage.py runserver
celery -A app_settings worker -l info
celery -A app_settings beat -l info
```

### Production
```bash
gunicorn app_settings.wsgi:application
```

## Database Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

## Admin Interface
Django admin available at `/admin/` with customized configurations for:
- Finance models
- Service configurations
- User management
- Task monitoring

## API Endpoints
- `/finance/` - Finance and transaction management
- `/services/ai/` - AI processing endpoints
- `/services/stripe/` - Stripe integration
- `/users/` - User management
- See individual app `urls.py` files for complete endpoint listings

## Testing
- Write tests for all new features
- Test AI integrations with mocked responses
- Test async tasks synchronously in tests
- Use Django's test client for API testing

## Monitoring & Logging
- Structured logging configured in `app_settings/logging_config.py`
- Log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
- Monitor Celery task queues
- Track AI API usage and costs
