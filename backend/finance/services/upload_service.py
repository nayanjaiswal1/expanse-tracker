"""
Enhanced upload service for processing bank statements and tracking transactions.
"""

import hashlib
import json
import io
import csv
import re
from typing import Dict, List, Optional, Tuple, Any
from decimal import Decimal, InvalidOperation
from datetime import datetime, date
from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model

from ..models import (
    UploadSession, StatementImport, TransactionImport,
    Transaction, Account, Category, MerchantPattern, TransactionLink
)
from ..models.accounts import AccountPdfPassword
from ..serializers import TransactionSerializer
from .password_encryption import PasswordEncryptionService

User = get_user_model()


class UploadService:
    """Enhanced service for processing file uploads and transaction imports"""

    def __init__(self, user: User):
        self.user = user

    def create_upload_session(
        self,
        file,
        account_id: Optional[int] = None,
        password: Optional[str] = None
    ) -> UploadSession:
        """Create a new upload session for file processing"""

        # Generate file hash for duplicate detection
        file.seek(0)
        file_content = file.read()
        file_hash = hashlib.sha256(file_content).hexdigest()
        file.seek(0)

        # Detect file type
        file_type = self._detect_file_type(file.name, file_content)

        # Get account if specified
        account = None
        if account_id:
            try:
                account = Account.objects.get(id=account_id, user=self.user)
            except Account.DoesNotExist:
                raise ValueError(f"Account {account_id} not found")

        # Create upload session
        upload_session = UploadSession.objects.create(
            user=self.user,
            original_filename=file.name,
            file_type=file_type,
            file_size=len(file_content),
            file_hash=file_hash,
            account=account,
            file_content=file_content if len(file_content) < 10 * 1024 * 1024 else None,  # Store small files
        )

        upload_session.add_log_entry('info', f'Upload session created for {file.name}')

        return upload_session

    def process_upload_session(
        self,
        session: UploadSession,
        password: Optional[str] = None
    ) -> Dict[str, Any]:
        """Process an upload session and import transactions"""

        session.mark_processing()
        session.add_log_entry('info', 'Starting file processing')

        try:
            # Get file content
            if session.file_content:
                file_content = session.file_content
            else:
                raise ValueError("File content not available for processing")

            # Process based on file type
            if session.file_type == 'pdf':
                result = self._process_pdf(session, file_content, password)
            elif session.file_type == 'csv':
                result = self._process_csv(session, file_content)
            elif session.file_type == 'json':
                result = self._process_json(session, file_content)
            elif session.file_type in ['excel', 'xlsx']:
                result = self._process_excel(session, file_content)
            else:
                raise ValueError(f"Unsupported file type: {session.file_type}")

            # Update session with results
            session.total_transactions = result.get('total_transactions', 0)
            session.successful_imports = result.get('successful_imports', 0)
            session.failed_imports = result.get('failed_imports', 0)
            session.duplicate_imports = result.get('duplicate_imports', 0)

            # Mark completed if successful
            if result.get('success', False):
                session.mark_completed()
                session.add_log_entry('info', 'File processing completed successfully')
            else:
                session.mark_failed(result.get('error', 'Unknown error'))

            # Detect and create transaction links
            self._detect_transaction_links(session)

            return result

        except Exception as e:
            session.mark_failed(str(e))
            session.add_log_entry('error', f'Processing failed: {str(e)}')
            return {
                'success': False,
                'error': str(e),
                'total_transactions': 0,
                'successful_imports': 0,
                'failed_imports': 0
            }

    def _detect_file_type(self, filename: str, content: bytes) -> str:
        """Detect file type based on filename and content"""
        filename_lower = filename.lower()

        if filename_lower.endswith('.pdf'):
            return 'pdf'
        elif filename_lower.endswith('.csv'):
            return 'csv'
        elif filename_lower.endswith('.json'):
            return 'json'
        elif filename_lower.endswith(('.xls', '.xlsx')):
            return 'excel'

        # Check content-based detection
        try:
            content_str = content[:1024].decode('utf-8', errors='ignore')
            if content_str.strip().startswith('{') or content_str.strip().startswith('['):
                return 'json'
            elif ',' in content_str and '\n' in content_str:
                return 'csv'
        except:
            pass

        return 'unknown'

    def _process_pdf(
        self,
        session: UploadSession,
        file_content: bytes,
        password: Optional[str] = None
    ) -> Dict[str, Any]:
        """Process PDF bank statements"""
        session.add_log_entry('info', 'Processing PDF file')

        try:
            import PyPDF2
            import io

            pdf_file = io.BytesIO(file_content)
            reader = PyPDF2.PdfReader(pdf_file)

            # Check if PDF is encrypted
            if reader.is_encrypted:
                session.add_log_entry('info', 'PDF is password protected')
                successful_password = None

                # Try user-provided password first
                if password:
                    session.add_log_entry('info', 'Trying user-provided password')
                    if reader.decrypt(password):
                        successful_password = password
                        session.add_log_entry('info', 'User-provided password worked')
                    else:
                        session.password_attempts += 1
                        session.save()
                        session.add_log_entry('warning', 'User-provided password failed')

                # If no password provided or it failed, try stored passwords
                if not successful_password and session.account:
                    session.add_log_entry('info', 'Trying stored passwords for account')
                    stored_passwords = AccountPdfPassword.objects.filter(
                        account=session.account,
                        is_active=True
                    ).order_by('-usage_count', '-last_used')

                    encryption_service = PasswordEncryptionService()

                    for stored_pwd in stored_passwords:
                        try:
                            decrypted_pwd = encryption_service.decrypt_password(
                                stored_pwd.password_encrypted
                            )
                            session.add_log_entry('info', f'Trying stored password: {stored_pwd.label or "unlabeled"}')

                            # Reset reader for each attempt
                            pdf_file = io.BytesIO(file_content)
                            reader = PyPDF2.PdfReader(pdf_file)

                            if reader.decrypt(decrypted_pwd):
                                successful_password = decrypted_pwd
                                stored_pwd.increment_usage()
                                session.add_log_entry('info', f'Stored password worked: {stored_pwd.label or "unlabeled"}')
                                break
                        except Exception as e:
                            session.add_log_entry('error', f'Error trying stored password: {str(e)}')
                            continue

                # If no password worked, request password from user
                if not successful_password:
                    session.requires_password = True
                    session.save()
                    session.add_log_entry('warning', 'No valid password found, requesting from user')
                    return {
                        'success': False,
                        'error': 'PDF is password protected. Please provide password.',
                        'requires_password': True
                    }

                # If we got here with a successful password, store it if it's new
                if successful_password and password and session.account:
                    # Check if this password is already stored
                    encryption_service = PasswordEncryptionService()
                    encrypted_new_pwd = encryption_service.encrypt_password(password)

                    # Check if password already exists for this account
                    existing_passwords = AccountPdfPassword.objects.filter(
                        account=session.account,
                        is_active=True
                    )

                    is_new_password = True
                    for existing in existing_passwords:
                        try:
                            if encryption_service.decrypt_password(existing.password_encrypted) == password:
                                is_new_password = False
                                existing.increment_usage()
                                break
                        except:
                            continue

                    # Store new password
                    if is_new_password:
                        AccountPdfPassword.objects.create(
                            user=self.user,
                            account=session.account,
                            password_encrypted=encrypted_new_pwd,
                            label='Auto-saved',
                            usage_count=1,
                            last_used=timezone.now()
                        )
                        session.add_log_entry('info', 'New password saved for future uploads')

            # Extract text from all pages
            full_text = ""
            for page in reader.pages:
                full_text += page.extract_text() + "\n"

            # Create statement import record
            statement_import = StatementImport.objects.create(
                user=self.user,
                upload_session=session,
                raw_text_content=full_text,
            )

            # Parse transactions from extracted text
            transactions = self._parse_pdf_transactions(full_text)

            # Import transactions
            return self._import_transactions(session, transactions, statement_import)

        except ImportError:
            return {
                'success': False,
                'error': 'PDF processing library not available. Please install PyPDF2.'
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'PDF processing failed: {str(e)}'
            }

    def _process_csv(self, session: UploadSession, file_content: bytes) -> Dict[str, Any]:
        """Process CSV files"""
        session.add_log_entry('info', 'Processing CSV file')

        try:
            content = file_content.decode('utf-8')
            csv_file = io.StringIO(content)
            reader = csv.DictReader(csv_file)

            transactions = []
            for row in reader:
                transaction_data = self._parse_csv_row(row)
                if transaction_data:
                    transactions.append(transaction_data)

            return self._import_transactions(session, transactions)

        except Exception as e:
            return {
                'success': False,
                'error': f'CSV processing failed: {str(e)}'
            }

    def _process_json(self, session: UploadSession, file_content: bytes) -> Dict[str, Any]:
        """Process JSON files"""
        session.add_log_entry('info', 'Processing JSON file')

        try:
            content = file_content.decode('utf-8')
            data = json.loads(content)

            # Handle different JSON structures
            if isinstance(data, list):
                transactions = data
            elif isinstance(data, dict) and 'transactions' in data:
                transactions = data['transactions']
            else:
                transactions = [data]

            return self._import_transactions(session, transactions)

        except Exception as e:
            return {
                'success': False,
                'error': f'JSON processing failed: {str(e)}'
            }

    def _process_excel(self, session: UploadSession, file_content: bytes) -> Dict[str, Any]:
        """Process Excel files"""
        session.add_log_entry('info', 'Processing Excel file')

        try:
            import pandas as pd
            import io

            excel_file = io.BytesIO(file_content)
            df = pd.read_excel(excel_file)

            transactions = []
            for _, row in df.iterrows():
                transaction_data = self._parse_excel_row(row.to_dict())
                if transaction_data:
                    transactions.append(transaction_data)

            return self._import_transactions(session, transactions)

        except ImportError:
            return {
                'success': False,
                'error': 'Excel processing library not available. Please install pandas.'
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Excel processing failed: {str(e)}'
            }

    def _parse_pdf_transactions(self, text: str) -> List[Dict]:
        """Extract transaction data from PDF text"""
        transactions = []

        # Common patterns for bank statements
        # This is a basic implementation - can be enhanced with AI/ML
        lines = text.split('\n')

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Pattern for date amount description
            # Format: MM/DD/YYYY or MM-DD-YYYY followed by amount and description
            date_pattern = r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})'
            amount_pattern = r'([-+]?\$?\d+[,\d]*\.?\d*)'

            date_match = re.search(date_pattern, line)
            if date_match:
                # Look for amount patterns
                amounts = re.findall(amount_pattern, line)
                if amounts:
                    try:
                        # Parse date
                        date_str = date_match.group(1)
                        parsed_date = self._parse_date(date_str)

                        # Parse amount (take the last amount found, often the balance)
                        amount_str = amounts[-1].replace('$', '').replace(',', '')
                        amount = Decimal(amount_str)

                        # Extract description (text between date and amount)
                        description = line[date_match.end():line.find(amounts[-1])].strip()

                        subtype = 'expense' if amount < 0 else 'income'
                        transactions.append({
                            'date': parsed_date,
                            'amount': amount,
                            'description': description or 'Imported transaction',
                            'transaction_subtype': subtype,
                            'transaction_type': subtype,
                        })

                    except (ValueError, InvalidOperation):
                        continue

        return transactions

    def _parse_csv_row(self, row: Dict) -> Optional[Dict]:
        """Parse a CSV row into transaction data"""
        try:
            # Common CSV field mappings
            date_fields = ['date', 'transaction_date', 'posting_date', 'Date', 'Transaction Date']
            amount_fields = ['amount', 'transaction_amount', 'value', 'Amount', 'Value', 'Debit', 'Credit', 'Withdrawals', 'Deposits']
            debit_field_names = {'debit', 'withdrawal', 'withdrawals', 'charges', 'debits'}
            credit_field_names = {'credit', 'deposit', 'deposits', 'credits', 'payments'}
            description_fields = ['description', 'payee', 'merchant', 'Description', 'Payee', 'Details']

            # Find date
            date_value = None
            for field in date_fields:
                if field in row and row[field]:
                    date_value = self._parse_date(row[field])
                    break

            # Find amount
            amount_value = None
            for field in amount_fields:
                if field in row and row[field]:
                    try:
                        amount_str = str(row[field]).replace('$', '').replace(',', '').strip()
                        if amount_str and amount_str != '-':
                            amount_value = Decimal(amount_str)
                            lower_field = field.lower()
                            if lower_field in debit_field_names:
                                amount_value = -abs(amount_value)
                            elif lower_field in credit_field_names:
                                amount_value = abs(amount_value)
                            break
                    except (ValueError, InvalidOperation):
                        continue

            # Find description
            description_value = 'Imported transaction'
            for field in description_fields:
                if field in row and row[field]:
                    description_value = str(row[field]).strip()
                    break

            if date_value and amount_value:
                subtype = 'income' if amount_value >= 0 else 'expense'
                return {
                    'date': date_value,
                    'amount': amount_value,
                    'description': description_value,
                    'transaction_subtype': subtype,
                    'transaction_type': subtype,
                    'raw_data': row
                }

        except Exception:
            pass

        return None

    def _parse_excel_row(self, row: Dict) -> Optional[Dict]:
        """Parse an Excel row into transaction data"""
        # Similar to CSV parsing
        return self._parse_csv_row(row)

    def _parse_date(self, date_str: str) -> date:
        """Parse date string in various formats"""
        date_formats = [
            '%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%m-%d-%Y',
            '%d-%m-%Y', '%Y/%m/%d', '%m/%d/%y', '%d/%m/%y'
        ]

        date_str = str(date_str).strip()

        for fmt in date_formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue

        raise ValueError(f"Unable to parse date: {date_str}")

    def _import_transactions(
        self,
        session: UploadSession,
        transactions: List[Dict],
        statement_import: Optional[StatementImport] = None
    ) -> Dict[str, Any]:
        """Import transactions and track results"""

        successful_imports = 0
        failed_imports = 0
        duplicate_imports = 0
        errors = []

        with transaction.atomic():
            for tx_data in transactions:
                try:
                    # Create transaction import record
                    tx_import = TransactionImport.objects.create(
                        user=self.user,
                        upload_session=session,
                        statement_import=statement_import,
                        raw_data=tx_data,
                        parsed_amount=tx_data.get('amount'),
                        parsed_date=tx_data.get('date'),
                        parsed_description=tx_data.get('description', ''),
                    )

                    # Check for duplicates
                    if self._is_duplicate_transaction(tx_data, session.account):
                        tx_import.import_status = 'duplicate'
                        tx_import.save()
                        duplicate_imports += 1
                        continue

                    # Prepare transaction data
                    transaction_data = self._prepare_transaction_data(tx_data, session.account)

                    # AI categorization
                    if session.ai_categorization_enabled:
                        category = self._suggest_category(transaction_data)
                        if category:
                            transaction_data['category_id'] = category.id
                            tx_import.suggested_category_confidence = 0.8  # Default confidence

                    # Create transaction
                    serializer = TransactionSerializer(data=transaction_data)
                    if serializer.is_valid():
                        tx_obj = serializer.save(user=self.user)

                        # Link to import record
                        tx_import.transaction = tx_obj
                        tx_import.import_status = 'imported'
                        tx_import.save()

                        successful_imports += 1
                    else:
                        tx_import.import_status = 'failed'
                        tx_import.error_message = str(serializer.errors)
                        tx_import.save()

                        failed_imports += 1
                        errors.append(f"Validation failed: {serializer.errors}")

                except Exception as e:
                    failed_imports += 1
                    errors.append(f"Import failed: {str(e)}")
                    if 'tx_import' in locals():
                        tx_import.import_status = 'failed'
                        tx_import.error_message = str(e)
                        tx_import.save()

        return {
            'success': True,
            'total_transactions': len(transactions),
            'successful_imports': successful_imports,
            'failed_imports': failed_imports,
            'duplicate_imports': duplicate_imports,
            'errors': errors[:10]  # Limit errors
        }

    def _prepare_transaction_data(self, tx_data: Dict, account: Optional[Account]) -> Dict:
        """Prepare transaction data for serializer consumption"""
        raw_amount = tx_data.get('amount', 0)
        amount_decimal = self._parse_decimal(raw_amount, default=Decimal('0'))
        is_credit = amount_decimal >= 0
        amount_decimal = abs(amount_decimal)
        if amount_decimal <= 0:
            raise ValueError("Transaction amount must be non-zero")

        subtype = tx_data.get('transaction_subtype') or tx_data.get('transaction_type')
        if not subtype:
            subtype = 'income' if is_credit else 'expense'

        metadata = tx_data.get('metadata', {}).copy()
        metadata.setdefault('transaction_subtype', subtype)
        if tx_data.get('transaction_category'):
            metadata['transaction_category'] = tx_data['transaction_category']
        metadata.setdefault('source', 'upload_service')

        if 'transaction_type' in metadata:
            metadata.pop('transaction_type')

        payload = {
            'amount': str(amount_decimal),
            'description': tx_data.get('description', 'Imported transaction'),
            'date': tx_data.get('date').isoformat() if tx_data.get('date') else None,
            'is_credit': is_credit,
            'account_id': account.id if account else None,
            'currency': tx_data.get('currency', 'USD'),
            'notes': tx_data.get('notes', ''),
            'metadata': metadata,
        }

        if tx_data.get('external_id'):
            payload['external_id'] = tx_data['external_id']

        category_id = tx_data.get('category_id')
        if category_id not in (None, ''):
            if isinstance(category_id, str):
                category_id = category_id.strip()
                category_id = int(category_id) if category_id else None
            elif not isinstance(category_id, int):
                try:
                    category_id = int(category_id)
                except (TypeError, ValueError):
                    category_id = None
            if isinstance(category_id, int) and category_id <= 0:
                category_id = None
        else:
            category_id = None

        if category_id is not None:
            payload['category_id'] = category_id

        return payload

    def _is_duplicate_transaction(self, tx_data: Dict, account: Optional[Account]) -> bool:
        """Check if transaction is a duplicate"""
        if not account:
            return False

        amount_decimal = abs(self._parse_decimal(tx_data.get('amount', 0)))
        return Transaction.objects.filter(
            user=self.user,
            account=account,
            amount=amount_decimal,
            date=tx_data.get('date'),
            description=tx_data.get('description', ''),
            status='active',
        ).exists()

    def _suggest_category(self, tx_data: Dict) -> Optional[Category]:
        """Suggest category using merchant patterns"""
        description = tx_data.get('description', '').lower()

        # Look for merchant patterns
        patterns = MerchantPattern.objects.filter(
            user=self.user,
            is_active=True
        ).order_by('-confidence', '-usage_count')

        for pattern in patterns:
            if pattern.pattern_type == 'contains' and pattern.pattern.lower() in description:
                pattern.increment_usage()
                return pattern.category
            elif pattern.pattern_type == 'starts_with' and description.startswith(pattern.pattern.lower()):
                pattern.increment_usage()
                return pattern.category

        return None

    def _detect_transaction_links(self, session: UploadSession):
        """Detect and create transaction links (transfers, duplicates, etc.)"""
        # Get all transactions from this session
        tx_imports = session.transaction_imports.filter(
            import_status='imported',
            transaction__isnull=False
        )

        transactions = [tx_import.transaction for tx_import in tx_imports]

        # Detect transfers (same amount, opposite signs, close dates)
        for i, tx1 in enumerate(transactions):
            for tx2 in transactions[i+1:]:
                if self._is_likely_transfer(tx1, tx2):
                    TransactionLink.objects.get_or_create(
                        user=self.user,
                        from_transaction=tx1,
                        to_transaction=tx2,
                        link_type='transfer',
                        defaults={
                            'confidence_score': 0.8,
                            'auto_detected': True
                        }
                    )

    def _is_likely_transfer(self, tx1: Transaction, tx2: Transaction) -> bool:
        """Check if two transactions are likely transfers"""
        # Same amount
        if tx1.amount != tx2.amount:
            return False

        # Different accounts
        if tx1.account == tx2.account:
            return False

        # Close dates (within 3 days)
        date_diff = abs((tx1.date - tx2.date).days)
        if date_diff > 3:
            return False

        # Opposite transaction types or similar descriptions
        opposite_types = tx1.is_credit != tx2.is_credit

        similar_descriptions = (
            'transfer' in tx1.description.lower() or
            'transfer' in tx2.description.lower()
        )

        return opposite_types or similar_descriptions

    def _parse_decimal(self, value, default: Optional[Decimal] = Decimal('0')) -> Decimal:
        """Helper to safely parse decimal values from various inputs."""
        if value in (None, ''):
            return default if default is not None else Decimal('0')
        try:
            return Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError):
            if default is not None:
                return default
            raise ValueError(f"Invalid decimal value: {value}")
