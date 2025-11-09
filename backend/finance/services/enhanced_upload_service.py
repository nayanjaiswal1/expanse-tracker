"""
Enhanced upload service with improved parsing capabilities for various file formats.
"""

import hashlib
import json
import io
import csv
import re
import pandas as pd
from typing import Dict, List, Optional, Tuple, Any
from decimal import Decimal, InvalidOperation
from datetime import datetime, date
from django.utils import timezone
from django.db import transaction
from django.db.models import Q
from django.contrib.auth import get_user_model
import string
from collections import defaultdict
from dataclasses import dataclass
from typing import Optional, List, Dict, Any

from ..models import (
    UploadSession, StatementImport, TransactionImport,
    Transaction, Account, Category, MerchantPattern
)

User = get_user_model()


@dataclass
class ParsedTransaction:
    """Structured transaction data model"""
    date: datetime
    amount: float
    description: str
    transaction_type: str  # 'income', 'expense', 'transfer'
    category: Optional[str] = None
    merchant: Optional[str] = None
    account_number: Optional[str] = None
    reference: Optional[str] = None
    balance: Optional[float] = None
    confidence: float = 0.0
    raw_data: Optional[Dict] = None


@dataclass
class StatementMetadata:
    """Structured statement metadata"""
    institution: str
    account_number: str
    account_type: str
    statement_period_start: Optional[datetime] = None
    statement_period_end: Optional[datetime] = None
    opening_balance: Optional[float] = None
    closing_balance: Optional[float] = None
    available_balance: Optional[float] = None
    credit_limit: Optional[float] = None
    minimum_payment: Optional[float] = None
    balances: Dict[str, float] = None


class StatementParsingPipeline:
    """5-step pipeline for structured statement parsing"""

    def __init__(self):
        self.cleanup_patterns = {
            'currency_symbols': ['$', '£', '€', '¥', '₹'],
            'noise_chars': ['\x00', '\ufffd', '\u200b'],
            'extra_spaces': r'\s{2,}',
            'line_breaks': r'\r\n|\r|\n'
        }

    def step1_text_cleanup(self, raw_text: str) -> str:
        """Step 1: Remove unwanted chars and formats using re, string methods"""
        text = raw_text

        # Remove noise characters
        for char in self.cleanup_patterns['noise_chars']:
            text = text.replace(char, '')

        # Normalize line breaks
        text = re.sub(self.cleanup_patterns['line_breaks'], '\n', text)

        # Normalize spaces
        text = re.sub(self.cleanup_patterns['extra_spaces'], ' ', text)

        # Remove common PDF artifacts
        text = text.replace('•', '').replace('▪', '').replace('◦', '')

        return text.strip()

    def step2_data_structuring(self, clean_text: str) -> pd.DataFrame:
        """Step 2: Populate DataFrame using pandas"""
        lines = clean_text.split('\n')

        # Pre-filter lines that look like transactions
        transaction_lines = []
        for line in lines:
            line = line.strip()
            if self._looks_like_transaction(line):
                transaction_lines.append(line)

        # Create structured DataFrame
        df = pd.DataFrame(transaction_lines, columns=['raw_line'])
        df['line_number'] = range(len(df))
        df['processed'] = False

        return df

    def step3_info_extraction(self, df: pd.DataFrame) -> List[ParsedTransaction]:
        """Step 3: Extract entities/values using lightweight NLP"""
        transactions = []

        for idx, row in df.iterrows():
            line = row['raw_line']

            # Extract date
            date_obj = self._extract_date_smart(line)
            if not date_obj:
                continue

            # Extract amount
            amount = self._extract_amount_smart(line)
            if amount is None:
                continue

            # Extract description and clean it
            description = self._extract_description_smart(line, date_obj, amount)

            # Determine transaction type
            trans_type = self._classify_transaction_type(description, amount)

            # Extract additional entities
            merchant = self._extract_merchant_name(description)

            transaction = ParsedTransaction(
                date=date_obj,
                amount=abs(amount),
                description=description,
                transaction_type=trans_type,
                merchant=merchant,
                confidence=self._calculate_confidence(line),
                raw_data={'line_number': idx, 'raw_line': line}
            )

            transactions.append(transaction)

        return transactions

    def step4_validation(self, transactions: List[ParsedTransaction]) -> Dict[str, Any]:
        """Step 4: Check deduplication, integrity using pandas, custom scripts"""
        df = pd.DataFrame([
            {
                'date': t.date,
                'amount': t.amount,
                'description': t.description,
                'type': t.transaction_type,
                'confidence': t.confidence
            } for t in transactions
        ])

        # Deduplication
        df['dup_key'] = df['date'].astype(str) + '_' + df['amount'].astype(str) + '_' + df['description'].str[:20]
        duplicates = df[df.duplicated('dup_key', keep=False)]

        # Integrity checks
        validation_results = {
            'total_transactions': len(transactions),
            'duplicates_found': len(duplicates),
            'date_errors': len([t for t in transactions if not t.date]),
            'amount_errors': len([t for t in transactions if t.amount <= 0]),
            'low_confidence': len([t for t in transactions if t.confidence < 0.5]),
            'avg_confidence': df['confidence'].mean(),
            'date_range': {
                'start': df['date'].min() if not df.empty else None,
                'end': df['date'].max() if not df.empty else None
            }
        }

        return validation_results

    def step5_usage_preparation(self, transactions: List[ParsedTransaction], metadata: StatementMetadata) -> Dict[str, Any]:
        """Step 5: Prepare for reporting, ML, integration"""
        df = pd.DataFrame([
            {
                'date': t.date,
                'amount': t.amount,
                'description': t.description,
                'type': t.transaction_type,
                'merchant': t.merchant,
                'confidence': t.confidence
            } for t in transactions
        ])

        # Generate insights for reporting
        insights = {
            'summary_stats': {
                'total_income': df[df['type'] == 'income']['amount'].sum(),
                'total_expenses': df[df['type'] == 'expense']['amount'].sum(),
                'transaction_count': len(df),
                'avg_transaction': df['amount'].mean(),
                'date_range_days': (df['date'].max() - df['date'].min()).days if len(df) > 1 else 0
            },
            'category_breakdown': df.groupby('type')['amount'].sum().to_dict(),
            'merchant_analysis': df['merchant'].value_counts().head(10).to_dict() if 'merchant' in df.columns else {},
            'confidence_distribution': {
                'high': len(df[df['confidence'] >= 0.8]),
                'medium': len(df[(df['confidence'] >= 0.5) & (df['confidence'] < 0.8)]),
                'low': len(df[df['confidence'] < 0.5])
            }
        }

        return {
            'transactions_df': df,
            'metadata': metadata,
            'insights': insights,
            'ml_features': self._extract_ml_features(df)
        }

    def _looks_like_transaction(self, line: str) -> bool:
        """Quick check if line contains transaction-like data"""
        # Must have at least a date-like pattern and amount-like pattern
        has_date = bool(re.search(r'\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}', line))
        has_amount = bool(re.search(r'\$?\d+[.,]\d{2}|\$?\d+', line))
        has_min_length = len(line.strip()) > 10

        return has_date and has_amount and has_min_length

    def _extract_date_smart(self, line: str) -> Optional[datetime]:
        """Smart date extraction without heavy regex"""
        # Common date patterns
        date_patterns = [
            r'(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})',
            r'(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})',
            r'(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})'
        ]

        for pattern in date_patterns:
            match = re.search(pattern, line)
            if match and len(match.groups()) >= 3:
                try:
                    group1, group2, group3 = match.group(1), match.group(2), match.group(3)

                    # Handle different formats
                    if len(group3) == 4:  # Full year
                        return datetime(int(group3), int(group1), int(group2))
                    else:  # 2-digit year
                        year = 2000 + int(group3) if int(group3) < 50 else 1900 + int(group3)
                        return datetime(year, int(group1), int(group2))
                except (ValueError, IndexError):
                    continue

        return None

    def _extract_amount_smart(self, line: str) -> Optional[float]:
        """Smart amount extraction"""
        # Remove common currency symbols and clean
        clean_line = line.replace('$', '').replace(',', '')

        # Find decimal amounts
        amount_patterns = [
            r'(\d+\.\d{2})',  # 123.45
            r'(\d+)',         # 123
        ]

        amounts = []
        for pattern in amount_patterns:
            matches = re.findall(pattern, clean_line)
            for match in matches:
                try:
                    amounts.append(float(match))
                except ValueError:
                    continue

        # Return the most likely amount (usually the largest)
        return max(amounts) if amounts else None

    def _extract_description_smart(self, line: str, date_obj: datetime, amount: float) -> str:
        """Extract description by removing date and amount"""
        # Remove date pattern
        line_clean = re.sub(r'\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}', '', line)

        # Remove amount pattern
        amount_str = f"{amount:.2f}"
        line_clean = line_clean.replace(amount_str, '').replace(f"${amount_str}", '')

        # Clean up extra spaces
        description = ' '.join(line_clean.split())

        return description.strip()

    def _classify_transaction_type(self, description: str, amount: float) -> str:
        """Classify transaction type using keywords"""
        desc_lower = description.lower()

        income_keywords = ['deposit', 'credit', 'interest', 'dividend', 'salary', 'refund']
        transfer_keywords = ['transfer', 'xfer', 'ach', 'electronic']

        for keyword in income_keywords:
            if keyword in desc_lower:
                return 'income'

        for keyword in transfer_keywords:
            if keyword in desc_lower:
                return 'transfer'

        return 'expense'

    def _extract_merchant_name(self, description: str) -> Optional[str]:
        """Extract merchant name from description"""
        # Simple approach: take the first meaningful word(s)
        words = description.split()
        if len(words) > 0:
            # Skip common prefixes
            skip_words = ['payment', 'to', 'from', 'at', 'via']
            for word in words:
                if word.lower() not in skip_words and len(word) > 2:
                    return word.title()

        return None

    def _calculate_confidence(self, line: str) -> float:
        """Calculate parsing confidence score"""
        confidence = 0.5  # Base confidence

        # Boost confidence based on line structure
        if re.search(r'\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}', line):  # Full year date
            confidence += 0.2

        if re.search(r'\$\d+\.\d{2}', line):  # Proper currency format
            confidence += 0.2

        if len(line.split()) >= 3:  # Reasonable number of fields
            confidence += 0.1

        return min(confidence, 1.0)

    def _extract_ml_features(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Extract features for ML models"""
        if df.empty:
            return {}

        return {
            'transaction_frequency': len(df),
            'spending_velocity': df[df['type'] == 'expense']['amount'].sum(),
            'income_regularity': df[df['type'] == 'income']['amount'].std(),
            'merchant_diversity': df['merchant'].nunique() if 'merchant' in df.columns else 0,
            'avg_transaction_size': df['amount'].mean(),
            'transaction_types_ratio': df['type'].value_counts(normalize=True).to_dict()
        }


class EnhancedUploadService:
    """Enhanced service for processing file uploads with better parsing capabilities"""

    def __init__(self, user: User):
        self.user = user
        self.last_detection_method = None
        self.pipeline = StatementParsingPipeline()

        # Prebuilt pattern dictionaries for lightweight matching
        self.institution_keywords = {
            'chase': ['chase', 'jpmorgan', 'jp morgan'],
            'bofa': ['bank of america', 'bofa', 'b of a'],
            'wells': ['wells fargo', 'wellsfargo', 'wells'],
            'citi': ['citi', 'citibank', 'citicorp'],
            'capital_one': ['capital one', 'capitalone'],
            'amex': ['american express', 'amex'],
            'discover': ['discover', 'discover bank'],
            'usaa': ['usaa'],
            'navy_federal': ['navy federal', 'nfcu'],
            'pnc': ['pnc bank', 'pnc'],
        }

        self.balance_keywords = {
            'opening': ['opening', 'beginning', 'previous', 'balance forward', 'prev statement'],
            'closing': ['closing', 'ending', 'current', 'new balance', 'statement balance'],
            'available': ['available', 'available credit', 'available for use'],
            'credit_limit': ['credit limit', 'line of credit', 'authorized limit'],
            'minimum': ['minimum payment', 'min payment', 'payment due'],
        }

        self.transaction_indicators = {
            'income': ['deposit', 'credit', 'interest', 'dividend', 'salary', 'payroll', 'refund', 'payment received'],
            'expense': ['debit', 'withdrawal', 'payment', 'purchase', 'fee', 'charge'],
            'transfer': ['transfer', 'xfer', 'ach', 'electronic'],
        }

        self.date_patterns_simple = [
            '%m/%d/%Y', '%m/%d/%y', '%m-%d-%Y', '%m-%d-%y',
            '%Y-%m-%d', '%Y/%m/%d', '%d/%m/%Y', '%d-%m-%Y',
            '%b %d, %Y', '%B %d, %Y', '%d %b %Y', '%d %B %Y'
        ]

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

        # Detect file type with better accuracy
        file_type = self._detect_file_type_enhanced(file.name, file_content)

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
            file_content=file_content if len(file_content) < 50 * 1024 * 1024 else None,
        )

        upload_session.add_log_entry('info', f'Enhanced upload session created for {file.name}')
        return upload_session

    def process_file_enhanced(
        self,
        session: UploadSession,
        password: Optional[str] = None,
        preview_mode: bool = False
    ) -> Dict[str, Any]:
        """Process file with enhanced parsing capabilities"""

        session.mark_processing()
        session.add_log_entry('info', 'Starting enhanced file processing')

        try:
            # Get file content
            if session.file_content:
                file_content = session.file_content
            else:
                raise ValueError("File content not available for processing")

            # Process based on file type with enhanced parsers
            if session.file_type == 'pdf':
                result = self._process_pdf_enhanced(session, file_content, password)
            elif session.file_type == 'csv':
                result = self._process_csv_enhanced(session, file_content)
            elif session.file_type == 'json':
                result = self._process_json_enhanced(session, file_content)
            elif session.file_type in ['excel', 'xlsx']:
                result = self._process_excel_enhanced(session, file_content)
            else:
                raise ValueError(f"Unsupported file type: {session.file_type}")

            if result['success']:
                # Enhance transactions with AI categorization
                enhanced_transactions = self._enhance_transactions_with_ai(
                    result['parsed_transactions']
                )

                # Detect duplicates
                duplicate_info = self._detect_duplicates_enhanced(
                    enhanced_transactions, session.account
                )

                result.update({
                    'parsed_transactions': enhanced_transactions,
                    'duplicate_count': duplicate_info['count'],
                    'duplicate_details': duplicate_info['details'],
                    'categorization_results': {
                        'auto_categorized': sum(1 for tx in enhanced_transactions if tx.get('suggested_category')),
                        'confidence_scores': [tx.get('confidence', 0) for tx in enhanced_transactions]
                    }
                })

                session.add_log_entry('info', 'Enhanced processing completed successfully')

            return result

        except Exception as e:
            session.mark_failed(str(e))
            session.add_log_entry('error', f'Enhanced processing failed: {str(e)}')
            return {
                'success': False,
                'error': str(e),
                'parsed_transactions': [],
                'warnings': [],
                'errors': [str(e)]
            }

    def _detect_file_type_enhanced(self, filename: str, content: bytes) -> str:
        """Enhanced file type detection with content analysis"""
        filename_lower = filename.lower()

        # Check file extension first
        if filename_lower.endswith('.pdf'):
            return 'pdf'
        elif filename_lower.endswith('.csv'):
            return 'csv'
        elif filename_lower.endswith('.json'):
            return 'json'
        elif filename_lower.endswith(('.xls', '.xlsx')):
            return 'excel'

        # Content-based detection for files without proper extensions
        try:
            # Check for PDF signature
            if content.startswith(b'%PDF'):
                return 'pdf'

            # Check for Excel signatures
            if content.startswith(b'PK\x03\x04') and b'xl/' in content[:1024]:
                return 'excel'
            if content.startswith(b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1'):  # OLE format
                return 'excel'

            # Check for JSON content
            content_str = content[:2048].decode('utf-8', errors='ignore').strip()
            if content_str.startswith(('{', '[')):
                try:
                    json.loads(content_str)
                    return 'json'
                except json.JSONDecodeError:
                    pass

            # Check for CSV content (look for common CSV patterns)
            if self._is_likely_csv(content_str):
                return 'csv'

        except Exception:
            pass

        return 'unknown'

    def _is_likely_csv(self, content: str) -> bool:
        """Check if content is likely CSV format"""
        lines = content.split('\n')[:10]  # Check first 10 lines

        comma_count = 0
        consistent_columns = True
        first_line_columns = None

        for line in lines:
            if line.strip():
                columns = line.count(',')
                if first_line_columns is None:
                    first_line_columns = columns
                elif columns != first_line_columns:
                    consistent_columns = False

                comma_count += columns

        # CSV likely if: has commas, consistent column count, and no obvious other format markers
        return (
            comma_count > 0 and
            consistent_columns and
            first_line_columns is not None and
            first_line_columns > 0 and
            not content.strip().startswith(('{', '[', '<'))
        )

    def _process_pdf_enhanced(
        self,
        session: UploadSession,
        file_content: bytes,
        password: Optional[str] = None
    ) -> Dict[str, Any]:
        """Enhanced PDF processing with better text extraction and pattern recognition"""

        session.add_log_entry('info', 'Processing PDF with enhanced extraction')

        try:
            import PyPDF2
            import io

            pdf_file = io.BytesIO(file_content)
            reader = PyPDF2.PdfReader(pdf_file)

            # Handle password protection
            if reader.is_encrypted:
                if not password:
                    session.requires_password = True
                    session.save()
                    return {
                        'success': False,
                        'requires_password': True,
                        'error': 'PDF is password protected'
                    }

                if not reader.decrypt(password):
                    session.password_attempts += 1
                    session.save()
                    return {
                        'success': False,
                        'requires_password': True,
                        'error': 'Invalid password'
                    }

            # Extract text from all pages with better formatting
            full_text = ""
            page_texts = []

            for page_num, page in enumerate(reader.pages):
                page_text = page.extract_text()
                page_texts.append(page_text)
                full_text += f"\n--- Page {page_num + 1} ---\n{page_text}\n"

            # Create statement import record
            statement_import = StatementImport.objects.create(
                user=self.user,
                upload_session=session,
                raw_text_content=full_text,
            )

            # Try structured pipeline first (new approach)
            metadata = self._extract_pdf_metadata(full_text)

            try:
                pipeline_result = self.process_with_pipeline(full_text, metadata)

                if pipeline_result['success'] and len(pipeline_result['parsed_transactions']) > 0:
                    # Use pipeline results
                    transactions = pipeline_result['parsed_transactions']
                    session.add_log_entry('info', f'Parsed {len(transactions)} transactions using structured pipeline')
                else:
                    # Fallback to original enhanced parsing
                    transactions = self._parse_pdf_transactions_enhanced(full_text, page_texts)
                    session.add_log_entry('info', f'Parsed {len(transactions)} transactions using enhanced regex parsing')
            except Exception as pipeline_error:
                # Pipeline failed, fallback to enhanced parsing
                session.add_log_entry('warning', f'Pipeline failed: {str(pipeline_error)}. Using fallback parsing.')
                transactions = self._parse_pdf_transactions_enhanced(full_text, page_texts)
                session.add_log_entry('info', f'Parsed {len(transactions)} transactions using enhanced regex parsing')
            statement_import.institution_name = metadata.get('institution', '')
            statement_import.account_number_masked = metadata.get('account_number', '')
            statement_import.statement_period_start = metadata.get('period_start')
            statement_import.statement_period_end = metadata.get('period_end')
            statement_import.save()

            return {
                'success': True,
                'parsed_transactions': transactions,
                'statement_metadata': metadata,
                'warnings': self._generate_pdf_warnings(full_text, transactions),
                'errors': [],
                'confidence': self._calculate_parsing_confidence(transactions, full_text)
            }

        except ImportError:
            return {
                'success': False,
                'error': 'PDF processing library not available. Please install PyPDF2.',
                'parsed_transactions': [],
                'warnings': [],
                'errors': ['PDF library missing']
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'PDF processing failed: {str(e)}',
                'parsed_transactions': [],
                'warnings': [],
                'errors': [str(e)]
            }

    def _process_csv_enhanced(self, session: UploadSession, file_content: bytes) -> Dict[str, Any]:
        """Enhanced CSV processing with auto-detection of column mappings"""

        session.add_log_entry('info', 'Processing CSV with enhanced column detection')

        try:
            # Try different encodings
            encodings = ['utf-8', 'utf-8-sig', 'latin1', 'cp1252']
            content = None

            for encoding in encodings:
                try:
                    content = file_content.decode(encoding)
                    break
                except UnicodeDecodeError:
                    continue

            if content is None:
                raise ValueError("Could not decode CSV file with any supported encoding")

            # Detect CSV dialect
            try:
                sample = content[:2048]
                dialect = csv.Sniffer().sniff(sample, delimiters=',;\t|')
            except:
                dialect = csv.excel

            # Parse CSV
            csv_file = io.StringIO(content)
            reader = csv.DictReader(csv_file, dialect=dialect)

            # Auto-detect column mappings
            fieldnames = reader.fieldnames or []
            column_mapping = self._detect_csv_column_mapping(fieldnames)

            if not column_mapping['date'] or not column_mapping['amount']:
                return {
                    'success': False,
                    'error': 'Could not detect required columns (date, amount) in CSV',
                    'parsed_transactions': [],
                    'warnings': ['Required columns not found'],
                    'errors': ['Column detection failed']
                }

            # Parse transactions with detected mapping
            transactions = []
            row_errors = []

            for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
                try:
                    transaction_data = self._parse_csv_row_enhanced(row, column_mapping)
                    if transaction_data:
                        transaction_data['row_number'] = row_num
                        transactions.append(transaction_data)
                except Exception as e:
                    row_errors.append(f"Row {row_num}: {str(e)}")

            return {
                'success': True,
                'parsed_transactions': transactions,
                'column_mapping': column_mapping,
                'warnings': self._generate_csv_warnings(fieldnames, column_mapping),
                'errors': row_errors[:10],  # Limit errors
                'confidence': self._calculate_csv_confidence(transactions, row_errors)
            }

        except Exception as e:
            return {
                'success': False,
                'error': f'CSV processing failed: {str(e)}',
                'parsed_transactions': [],
                'warnings': [],
                'errors': [str(e)]
            }

    def _detect_csv_column_mapping(self, fieldnames: List[str]) -> Dict[str, str]:
        """Auto-detect CSV column mappings using common patterns"""

        mapping = {
            'date': None,
            'amount': None,
            'description': None,
            'account_number': None,
            'balance': None,
            'category': None,
            'merchant': None,
            'debit': None,
            'credit': None
        }

        fieldnames_lower = [f.lower() for f in fieldnames]

        # Date field detection
        date_patterns = [
            'date', 'transaction_date', 'posting_date', 'trans_date',
            'settlement_date', 'effective_date', 'value_date'
        ]
        for pattern in date_patterns:
            for i, field in enumerate(fieldnames_lower):
                if pattern in field:
                    mapping['date'] = fieldnames[i]
                    break
            if mapping['date']:
                break

        # Amount field detection
        amount_patterns = [
            'amount', 'transaction_amount', 'value', 'total',
            'transaction_value', 'net_amount'
        ]
        for pattern in amount_patterns:
            for i, field in enumerate(fieldnames_lower):
                if pattern in field and 'balance' not in field:
                    mapping['amount'] = fieldnames[i]
                    break
            if mapping['amount']:
                break

        # Debit/Credit detection (if no single amount field)
        if not mapping['amount']:
            debit_patterns = ['debit', 'withdrawal', 'out', 'expense']
            credit_patterns = ['credit', 'deposit', 'in', 'income']

            for pattern in debit_patterns:
                for i, field in enumerate(fieldnames_lower):
                    if pattern in field:
                        mapping['debit'] = fieldnames[i]
                        break

            for pattern in credit_patterns:
                for i, field in enumerate(fieldnames_lower):
                    if pattern in field:
                        mapping['credit'] = fieldnames[i]
                        break

        # Description field detection
        desc_patterns = [
            'description', 'memo', 'details', 'reference', 'payee',
            'merchant', 'narrative', 'transaction_details'
        ]
        for pattern in desc_patterns:
            for i, field in enumerate(fieldnames_lower):
                if pattern in field:
                    mapping['description'] = fieldnames[i]
                    break
            if mapping['description']:
                break

        # Account number detection
        account_patterns = ['account', 'account_number', 'acct']
        for pattern in account_patterns:
            for i, field in enumerate(fieldnames_lower):
                if pattern in field and 'name' not in field:
                    mapping['account_number'] = fieldnames[i]
                    break

        # Balance field detection
        balance_patterns = ['balance', 'running_balance', 'account_balance']
        for pattern in balance_patterns:
            for i, field in enumerate(fieldnames_lower):
                if pattern in field:
                    mapping['balance'] = fieldnames[i]
                    break

        return mapping

    def _parse_csv_row_enhanced(self, row: Dict, column_mapping: Dict) -> Optional[Dict]:
        """Enhanced CSV row parsing with better error handling and data cleaning"""

        try:
            # Extract date
            date_value = None
            if column_mapping['date']:
                date_str = str(row.get(column_mapping['date'], '')).strip()
                if date_str:
                    date_value = self._parse_date_enhanced(date_str)

            # Extract amount (handle debit/credit or single amount)
            amount_value = None
            transaction_type = 'expense'

            if column_mapping['amount']:
                amount_str = str(row.get(column_mapping['amount'], '')).strip()
                if amount_str:
                    amount_value = self._parse_amount_enhanced(amount_str)
                    transaction_type = 'expense' if amount_value < 0 else 'income'
                    amount_value = abs(amount_value)

            elif column_mapping['debit'] or column_mapping['credit']:
                debit_str = str(row.get(column_mapping['debit'], '') or '0').strip()
                credit_str = str(row.get(column_mapping['credit'], '') or '0').strip()

                debit_amount = self._parse_amount_enhanced(debit_str) if debit_str != '0' else 0
                credit_amount = self._parse_amount_enhanced(credit_str) if credit_str != '0' else 0

                if debit_amount > 0:
                    amount_value = debit_amount
                    transaction_type = 'expense'
                elif credit_amount > 0:
                    amount_value = credit_amount
                    transaction_type = 'income'

            # Extract description
            description_value = 'Imported transaction'
            if column_mapping['description']:
                desc = str(row.get(column_mapping['description'], '')).strip()
                if desc:
                    description_value = self._clean_description(desc)

            # Extract additional fields
            account_number = None
            if column_mapping['account_number']:
                account_number = str(row.get(column_mapping['account_number'], '')).strip()

            balance = None
            if column_mapping['balance']:
                balance_str = str(row.get(column_mapping['balance'], '')).strip()
                if balance_str:
                    balance = self._parse_amount_enhanced(balance_str)

            # Validate required fields
            if not date_value or amount_value is None or amount_value <= 0:
                return None

            return {
                'date': date_value.isoformat(),
                'amount': float(amount_value),
                'description': description_value,
                'transaction_type': transaction_type,
                'account_number': account_number,
                'balance': float(balance) if balance is not None else None,
                'raw_data': dict(row),
                'confidence': self._calculate_row_confidence(row, column_mapping)
            }

        except Exception as e:
            raise ValueError(f"Failed to parse row: {str(e)}")

    def _parse_amount_enhanced(self, amount_str: str) -> Decimal:
        """Enhanced amount parsing with better format handling"""

        if not amount_str:
            return Decimal('0')

        # Clean the string
        cleaned = amount_str.strip()

        # Handle parentheses (negative amounts)
        is_negative = False
        if cleaned.startswith('(') and cleaned.endswith(')'):
            is_negative = True
            cleaned = cleaned[1:-1]

        # Remove currency symbols and separators
        cleaned = re.sub(r'[^\d.,\-+]', '', cleaned)

        # Handle different decimal separators
        if ',' in cleaned and '.' in cleaned:
            # Assume comma is thousands separator
            cleaned = cleaned.replace(',', '')
        elif ',' in cleaned and len(cleaned.split(',')[-1]) == 2:
            # Comma as decimal separator (European format)
            cleaned = cleaned.replace(',', '.')

        # Remove remaining commas (thousands separators)
        cleaned = cleaned.replace(',', '')

        try:
            amount = Decimal(cleaned)
            return -amount if is_negative else amount
        except (ValueError, InvalidOperation):
            raise ValueError(f"Could not parse amount: {amount_str}")

    def _parse_date_enhanced(self, date_str: str) -> date:
        """Enhanced date parsing with support for multiple formats"""

        date_formats = [
            '%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y', '%m-%d-%Y',
            '%Y/%m/%d', '%d/%m/%y', '%m/%d/%y', '%d-%m-%y', '%m-%d-%y',
            '%Y%m%d', '%d%m%Y', '%m%d%Y',
            '%B %d, %Y', '%b %d, %Y', '%d %B %Y', '%d %b %Y',
            '%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M',
            '%d/%m/%Y %H:%M:%S', '%d/%m/%Y %H:%M',
            '%m/%d/%Y %H:%M:%S', '%m/%d/%Y %H:%M'
        ]

        date_str = str(date_str).strip()

        # Handle Excel date numbers
        try:
            if date_str.isdigit() and len(date_str) <= 5:
                # Excel date serial number
                excel_date = int(date_str)
                if 1 <= excel_date <= 50000:  # Reasonable range
                    base_date = datetime(1900, 1, 1)
                    return (base_date + timezone.timedelta(days=excel_date - 2)).date()
        except:
            pass

        # Try standard date formats
        for fmt in date_formats:
            try:
                parsed_date = datetime.strptime(date_str, fmt)
                return parsed_date.date()
            except ValueError:
                continue

        raise ValueError(f"Unable to parse date: {date_str}")

    def _clean_description(self, description: str) -> str:
        """Clean and normalize transaction descriptions"""

        cleaned = description.strip()

        # Remove excessive whitespace
        cleaned = re.sub(r'\s+', ' ', cleaned)

        # Remove common bank codes and references
        cleaned = re.sub(r'\b(REF|TXN|TRANS|ID)[:=]\s*\w+\b', '', cleaned, flags=re.IGNORECASE)

        # Remove card numbers (partial)
        cleaned = re.sub(r'\*+\d{4}', '', cleaned)

        # Remove excessive punctuation
        cleaned = re.sub(r'[^\w\s\-&.,()]', '', cleaned)

        return cleaned.strip() or 'Transaction'

    def detect_account_from_transactions(self, transactions: List[Dict]) -> Optional[Account]:
        """Enhanced account detection from transaction data"""

        if not transactions:
            return None

        user_accounts = Account.objects.filter(user=self.user, is_active=True)

        # Method 1: Account number matching
        for tx in transactions[:5]:  # Check first few transactions
            account_number = tx.get('account_number')
            if account_number:
                for account in user_accounts:
                    if (account.account_number and
                        (account_number in account.account_number or
                         account.account_number in account_number)):
                        self.last_detection_method = 'account_number'
                        return account

        # Method 2: Institution name matching
        # (This would need institution data in transactions)

        # Method 3: Transaction pattern analysis
        total_amount = sum(abs(tx.get('amount', 0)) for tx in transactions)
        avg_amount = total_amount / len(transactions) if transactions else 0

        # Match by account type based on transaction patterns
        if avg_amount > 1000:  # Large transactions suggest checking account
            checking_account = user_accounts.filter(account_type='checking').first()
            if checking_account:
                self.last_detection_method = 'transaction_pattern_large'
                return checking_account

        elif avg_amount < 100:  # Small transactions suggest credit card
            credit_account = user_accounts.filter(account_type='credit').first()
            if credit_account:
                self.last_detection_method = 'transaction_pattern_small'
                return credit_account

        # Method 4: Default to first active account
        first_account = user_accounts.first()
        if first_account:
            self.last_detection_method = 'default_first'
            return first_account

        return None

    def _enhance_transactions_with_ai(self, transactions: List[Dict]) -> List[Dict]:
        """Enhance transactions with AI-powered categorization"""

        enhanced = []

        for tx in transactions:
            enhanced_tx = tx.copy()

            # Auto-categorize using merchant patterns
            suggested_category = self._suggest_category_enhanced(tx)
            if suggested_category:
                enhanced_tx['suggested_category'] = suggested_category['id']
                enhanced_tx['category_confidence'] = suggested_category['confidence']

            # Extract merchant name
            merchant = self._extract_merchant_name(tx.get('description', ''))
            if merchant:
                enhanced_tx['merchant_name'] = merchant

            enhanced.append(enhanced_tx)

        return enhanced

    def _suggest_category_enhanced(self, tx_data: Dict) -> Optional[Dict]:
        """Enhanced category suggestion using multiple signals"""

        description = tx_data.get('description', '').lower()
        amount = tx_data.get('amount', 0)

        # Get user's merchant patterns
        patterns = MerchantPattern.objects.filter(
            user=self.user,
            is_active=True
        ).order_by('-confidence', '-usage_count')

        # Try pattern matching
        for pattern in patterns:
            if pattern.pattern_type == 'contains' and pattern.pattern.lower() in description:
                pattern.increment_usage()
                return {
                    'id': pattern.category.id,
                    'name': pattern.category.name,
                    'confidence': float(pattern.confidence)
                }

        # Fallback: rule-based categorization
        return self._rule_based_categorization(description, amount)

    def _rule_based_categorization(self, description: str, amount: float) -> Optional[Dict]:
        """Rule-based categorization fallback"""

        # Common merchant patterns
        category_patterns = {
            'groceries': ['grocery', 'supermarket', 'food', 'walmart', 'target'],
            'gas': ['gas', 'fuel', 'station', 'shell', 'exxon', 'bp'],
            'restaurant': ['restaurant', 'cafe', 'coffee', 'pizza', 'mcdonalds'],
            'utilities': ['electric', 'water', 'gas bill', 'utility'],
            'healthcare': ['medical', 'doctor', 'pharmacy', 'hospital'],
            'shopping': ['amazon', 'store', 'mall', 'retail']
        }

        for category_name, keywords in category_patterns.items():
            if any(keyword in description for keyword in keywords):
                # Try to find user's category
                category = Category.objects.filter(
                    user=self.user,
                    name__icontains=category_name,
                    is_active=True
                ).first()

                if category:
                    return {
                        'id': category.id,
                        'name': category.name,
                        'confidence': 0.6  # Lower confidence for rule-based
                    }

        return None

    def _extract_merchant_name(self, description: str) -> Optional[str]:
        """Extract clean merchant name from transaction description"""

        # Remove common transaction codes and references
        cleaned = re.sub(r'\b(POS|ATM|PURCHASE|PAYMENT|TXN|REF).*', '', description, flags=re.IGNORECASE)
        cleaned = re.sub(r'\d{2}/\d{2}', '', cleaned)  # Remove dates
        cleaned = re.sub(r'#\d+', '', cleaned)  # Remove reference numbers

        # Extract the main merchant name (usually first part)
        parts = cleaned.split()
        if parts:
            merchant = ' '.join(parts[:3]).strip()  # Take first 3 words
            if len(merchant) > 3:
                return merchant

        return None

    def _detect_duplicates_enhanced(self, transactions: List[Dict], account: Optional[Account]) -> Dict:
        """Enhanced duplicate detection with fuzzy matching"""

        if not account:
            return {'count': 0, 'details': []}

        duplicates = []
        duplicate_count = 0

        for tx in transactions:
            # Look for exact matches first
            existing = Transaction.objects.filter(
                user=self.user,
                account=account,
                amount=tx.get('amount'),
                date=tx.get('date'),
                description__iexact=tx.get('description', ''),
                status='active'
            ).exists()

            if existing:
                duplicates.append({
                    'transaction': tx,
                    'type': 'exact_match',
                    'confidence': 1.0
                })
                duplicate_count += 1
            else:
                # Fuzzy matching for near-duplicates
                similar = self._find_similar_transactions(tx, account)
                if similar:
                    duplicates.append({
                        'transaction': tx,
                        'type': 'similar_match',
                        'confidence': similar['confidence'],
                        'existing_transaction': similar['transaction']
                    })
                    if similar['confidence'] > 0.8:
                        duplicate_count += 1

        return {
            'count': duplicate_count,
            'details': duplicates
        }

    def _find_similar_transactions(self, tx: Dict, account: Account) -> Optional[Dict]:
        """Find similar transactions using fuzzy matching"""

        from django.db.models import Q
        from datetime import timedelta

        tx_date = datetime.fromisoformat(tx.get('date')).date()
        tx_amount = tx.get('amount', 0)
        tx_desc = tx.get('description', '').lower()

        # Look for transactions within a few days with similar amount
        date_range_start = tx_date - timedelta(days=3)
        date_range_end = tx_date + timedelta(days=3)

        similar_transactions = Transaction.objects.filter(
            user=self.user,
            account=account,
            date__range=[date_range_start, date_range_end],
            amount__range=[tx_amount * 0.95, tx_amount * 1.05],  # 5% tolerance
            status='active'
        )

        for existing_tx in similar_transactions:
            # Calculate description similarity
            desc_similarity = self._calculate_description_similarity(
                tx_desc, existing_tx.description.lower()
            )

            if desc_similarity > 0.7:  # 70% similarity threshold
                return {
                    'transaction': existing_tx,
                    'confidence': desc_similarity
                }

        return None

    def _calculate_description_similarity(self, desc1: str, desc2: str) -> float:
        """Calculate similarity between two descriptions"""

        # Simple word-based similarity
        words1 = set(desc1.split())
        words2 = set(desc2.split())

        if not words1 and not words2:
            return 1.0
        if not words1 or not words2:
            return 0.0

        intersection = words1.intersection(words2)
        union = words1.union(words2)

        return len(intersection) / len(union) if union else 0.0

    def import_verified_transactions(
        self,
        upload_session: UploadSession,
        transactions_data: List[Dict],
        account: Account
    ) -> Dict[str, Any]:
        """Import verified transactions after user review"""

        imported_count = 0
        failed_count = 0
        duplicate_count = 0
        errors: List[str] = []
        created_transaction_ids: List[int] = []
        linked_ids = set(upload_session.linked_transactions or [])

        # Preload statement imports for quick lookup
        statement_lookup = {
            statement.id: statement
            for statement in upload_session.statement_imports.all()
        }
        default_statement = None
        if len(statement_lookup) == 1:
            default_statement = next(iter(statement_lookup.values()))

        with transaction.atomic():
            for tx_data in transactions_data:
                try:
                    status = tx_data.get('status')
                    if status in ['delete', 'duplicate']:
                        if status == 'duplicate':
                            duplicate_count += 1
                        continue

                    statement_import = self._resolve_statement_import(
                        tx_data,
                        statement_lookup,
                        default_statement
                    )

                    tx_import = TransactionImport.objects.create(
                        user=self.user,
                        upload_session=upload_session,
                        statement_import=statement_import,
                        raw_data=tx_data,
                        parsed_amount=tx_data.get('amount'),
                        parsed_date=tx_data.get('date'),
                        parsed_description=tx_data.get('description', ''),
                    )

                    duplicate_tx = self._find_existing_transaction(account, tx_data)
                    if duplicate_tx:
                        duplicate_count += 1
                        tx_import.transaction = duplicate_tx
                        tx_import.import_status = 'duplicate'
                        tx_import.save(update_fields=['transaction', 'import_status'])
                        self._apply_statement_link(duplicate_tx, statement_import, upload_session)
                        linked_ids.add(duplicate_tx.id)
                        upload_session.add_log_entry(
                            'info',
                            'Linked existing transaction to statement',
                            transaction_id=duplicate_tx.id,
                            statement_import_id=statement_import.id if statement_import else None
                        )
                        continue

                    transaction_obj = Transaction.objects.create(
                        user=self.user,
                        account=account,
                        amount=tx_data.get('amount'),
                        description=tx_data.get('description', 'Imported transaction'),
                        date=tx_data.get('date'),
                        transaction_type=tx_data.get('type', 'expense'),
                        currency=tx_data.get('currency', 'USD'),
                        merchant_name=tx_data.get('merchant_name', ''),
                        notes=tx_data.get('notes', ''),
                        verified=tx_data.get('status') == 'verified',
                        metadata={
                            'source': 'statement_import',
                            'tags': ['statement'],
                            'statement_payload': tx_data.get('raw_payload'),
                        }
                    )

                    if tx_data.get('category'):
                        try:
                            category = Category.objects.get(
                                id=tx_data['category'],
                                user=self.user
                            )
                            transaction_obj.category = category
                            transaction_obj.save(update_fields=['category'])
                        except Category.DoesNotExist:
                            pass

                    tx_import.transaction = transaction_obj
                    tx_import.import_status = 'imported'
                    tx_import.save(update_fields=['transaction', 'import_status'])

                    self._apply_statement_link(transaction_obj, statement_import, upload_session)

                    created_transaction_ids.append(transaction_obj.id)
                    linked_ids.add(transaction_obj.id)
                    imported_count += 1

                except Exception as e:
                    failed_count += 1
                    error_message = f"Failed to import transaction: {str(e)}"
                    errors.append(error_message)
                    if 'tx_import' in locals():
                        tx_import.import_status = 'failed'
                        tx_import.error_message = error_message
                        tx_import.save(update_fields=['import_status', 'error_message'])

        if linked_ids:
            upload_session.linked_transactions = sorted(linked_ids)
            upload_session.save(update_fields=['linked_transactions'])

        return {
            'success': True,
            'imported_count': imported_count,
            'failed_count': failed_count,
            'duplicate_count': duplicate_count,
            'errors': errors[:10]  # Limit errors
        }

    def _resolve_statement_import(
        self,
        tx_data: Dict,
        statement_lookup: Dict[int, StatementImport],
        default_statement: Optional[StatementImport]
    ) -> Optional[StatementImport]:
        statement_id = tx_data.get('statement_import_id') or tx_data.get('statement_id')
        if statement_id:
            return statement_lookup.get(statement_id)
        return default_statement

    def _find_existing_transaction(self, account: Account, tx_data: Dict) -> Optional[Transaction]:
        amount = tx_data.get('amount')
        date_value = tx_data.get('date')
        description = tx_data.get('description', '').strip()

        if amount is None or date_value is None:
            return None

        query = Transaction.objects.filter(
            user=self.user,
            amount=amount,
            date=date_value,
        )
        if account:
            query = query.filter(account=account)
        if description:
            query = query.filter(
                Q(description__iexact=description) |
                Q(original_description__iexact=description)
            )

        return query.first()

    def _apply_statement_link(
        self,
        transaction_obj: Transaction,
        statement_import: Optional[StatementImport],
        upload_session: UploadSession
    ) -> None:
        metadata = transaction_obj.metadata or {}
        tags = set(metadata.get('tags', []))
        tags.add('statement')

        if statement_import:
            tags.add(f"statement-{statement_import.id}")
            statement_ids = set(metadata.get('statement_import_ids', []))
            if statement_import.id not in statement_ids:
                statement_ids.add(statement_import.id)
                metadata['statement_import_ids'] = list(statement_ids)
            metadata.setdefault('source_refs', {})
            metadata['source_refs']['statement_import_id'] = statement_import.id
            self._record_statement_link(statement_import, transaction_obj.id)

        sorted_tags = sorted(tags)
        metadata['tags'] = sorted_tags
        transaction_obj.metadata = metadata
        transaction_obj.save(update_fields=['metadata'])
        transaction_obj.add_tags_by_names(sorted_tags)

        # Reflect statement link in session log
        upload_session.add_log_entry(
            'info',
            'Tagged transaction with statement reference',
            transaction_id=transaction_obj.id,
            statement_import_id=statement_import.id if statement_import else None
        )

        if statement_import:
            statement_tags = ['statement', f"statement-{statement_import.id}"]
            statement_import.add_tags_by_names(statement_tags)

    def _record_statement_link(
        self,
        statement_import: StatementImport,
        transaction_id: int
    ) -> None:
        metadata = statement_import.metadata or {}
        linked_ids = set(metadata.get('linked_transaction_ids', []))
        if transaction_id not in linked_ids:
            linked_ids.add(transaction_id)
            metadata['linked_transaction_ids'] = sorted(linked_ids)
            statement_import.metadata = metadata
            statement_import.save(update_fields=['metadata'])

    # Additional helper methods for other file formats would go here...
    def _process_json_enhanced(self, session: UploadSession, file_content: bytes) -> Dict[str, Any]:
        """Enhanced JSON processing with flexible schema detection"""

        session.add_log_entry('info', 'Processing JSON with enhanced schema detection')

        try:
            content = file_content.decode('utf-8')
            data = json.loads(content)

            # Handle different JSON structures
            transactions = []

            if isinstance(data, list):
                # Array of transactions
                transactions = self._parse_json_transaction_array(data)
            elif isinstance(data, dict):
                # Object containing transactions
                transactions = self._parse_json_transaction_object(data)
            else:
                raise ValueError("JSON format not supported")

            return {
                'success': True,
                'parsed_transactions': transactions,
                'warnings': self._generate_json_warnings(data, transactions),
                'errors': [],
                'confidence': self._calculate_json_confidence(transactions, data)
            }

        except json.JSONDecodeError as e:
            return {
                'success': False,
                'error': f'Invalid JSON format: {str(e)}',
                'parsed_transactions': [],
                'warnings': [],
                'errors': [str(e)]
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'JSON processing failed: {str(e)}',
                'parsed_transactions': [],
                'warnings': [],
                'errors': [str(e)]
            }

    def _process_excel_enhanced(self, session: UploadSession, file_content: bytes) -> Dict[str, Any]:
        """Enhanced Excel processing with multiple sheet support"""

        session.add_log_entry('info', 'Processing Excel with enhanced multi-sheet support')

        try:
            import pandas as pd
            import io

            excel_file = io.BytesIO(file_content)

            # Read all sheets
            excel_data = pd.read_excel(excel_file, sheet_name=None)

            all_transactions = []
            processed_sheets = []

            for sheet_name, df in excel_data.items():
                session.add_log_entry('info', f'Processing sheet: {sheet_name}')

                # Auto-detect column mappings for this sheet
                column_mapping = self._detect_excel_column_mapping(df.columns.tolist())

                if column_mapping['date'] and column_mapping['amount']:
                    # Process this sheet
                    sheet_transactions = self._parse_excel_sheet(df, column_mapping, sheet_name)
                    all_transactions.extend(sheet_transactions)
                    processed_sheets.append(sheet_name)
                else:
                    session.add_log_entry('warning', f'Skipping sheet {sheet_name} - required columns not found')

            if not all_transactions:
                return {
                    'success': False,
                    'error': 'No valid transaction data found in any Excel sheet',
                    'parsed_transactions': [],
                    'warnings': ['No sheets with required columns found'],
                    'errors': ['No valid data']
                }

            return {
                'success': True,
                'parsed_transactions': all_transactions,
                'processed_sheets': processed_sheets,
                'warnings': self._generate_excel_warnings(excel_data, processed_sheets),
                'errors': [],
                'confidence': self._calculate_excel_confidence(all_transactions, len(excel_data))
            }

        except ImportError:
            return {
                'success': False,
                'error': 'Excel processing library not available. Please install pandas.',
                'parsed_transactions': [],
                'warnings': [],
                'errors': ['Pandas library missing']
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Excel processing failed: {str(e)}',
                'parsed_transactions': [],
                'warnings': [],
                'errors': [str(e)]
            }

    def _parse_json_transaction_array(self, data: List[Dict]) -> List[Dict]:
        """Parse JSON array of transactions"""
        transactions = []

        for item in data:
            if isinstance(item, dict):
                tx = self._parse_json_transaction_item(item)
                if tx:
                    transactions.append(tx)

        return transactions

    def _parse_json_transaction_object(self, data: Dict) -> List[Dict]:
        """Parse JSON object containing transactions"""
        transactions = []

        # Look for common transaction array keys
        transaction_keys = ['transactions', 'data', 'items', 'records', 'results']

        for key in transaction_keys:
            if key in data and isinstance(data[key], list):
                return self._parse_json_transaction_array(data[key])

        # If no array found, try to parse the object itself as a single transaction
        tx = self._parse_json_transaction_item(data)
        if tx:
            transactions.append(tx)

        return transactions

    def _parse_json_transaction_item(self, item: Dict) -> Optional[Dict]:
        """Parse individual JSON transaction item"""
        try:
            # Common JSON field mappings
            date_fields = ['date', 'transaction_date', 'posting_date', 'transactionDate']
            amount_fields = ['amount', 'value', 'transaction_amount', 'transactionAmount']
            desc_fields = ['description', 'memo', 'details', 'narrative', 'payee']

            # Extract date
            date_value = None
            for field in date_fields:
                if field in item and item[field]:
                    try:
                        date_value = self._parse_date_enhanced(str(item[field]))
                        break
                    except:
                        continue

            # Extract amount
            amount_value = None
            for field in amount_fields:
                if field in item and item[field] is not None:
                    try:
                        amount_value = float(item[field])
                        break
                    except:
                        continue

            # Extract description
            description = 'Imported transaction'
            for field in desc_fields:
                if field in item and item[field]:
                    description = str(item[field]).strip()
                    break

            # Validate required fields
            if not date_value or amount_value is None:
                return None

            # Determine transaction type
            transaction_type = 'expense'
            if amount_value > 0:
                transaction_type = 'income'

            return {
                'date': date_value.isoformat(),
                'amount': abs(amount_value),
                'description': description,
                'transaction_type': transaction_type,
                'category': item.get('category'),
                'merchant_name': item.get('merchant'),
                'raw_data': item,
                'confidence': 0.8
            }

        except Exception:
            return None

    def _detect_excel_column_mapping(self, columns: List[str]) -> Dict[str, str]:
        """Detect column mappings for Excel sheets (similar to CSV)"""
        return self._detect_csv_column_mapping(columns)

    def _parse_excel_sheet(self, df: pd.DataFrame, column_mapping: Dict, sheet_name: str) -> List[Dict]:
        """Parse Excel sheet data"""
        transactions = []

        for index, row in df.iterrows():
            try:
                # Convert pandas row to dict for processing
                row_dict = row.to_dict()

                # Use CSV row parsing logic
                tx = self._parse_csv_row_enhanced(row_dict, column_mapping)
                if tx:
                    tx['sheet_name'] = sheet_name
                    tx['row_number'] = index + 2  # Excel rows start at 1, header is row 1
                    transactions.append(tx)

            except Exception as e:
                # Log error but continue processing
                continue

        return transactions

    def _generate_json_warnings(self, data: Any, transactions: List[Dict]) -> List[str]:
        """Generate warnings for JSON processing"""
        warnings = []

        if not transactions:
            warnings.append("No valid transactions found in JSON data")
        elif len(transactions) < 5:
            warnings.append("Very few transactions found - please verify JSON structure")

        return warnings

    def _generate_excel_warnings(self, excel_data: Dict, processed_sheets: List[str]) -> List[str]:
        """Generate warnings for Excel processing"""
        warnings = []

        total_sheets = len(excel_data)
        processed_count = len(processed_sheets)

        if processed_count == 0:
            warnings.append("No sheets could be processed - check column headers")
        elif processed_count < total_sheets:
            skipped = total_sheets - processed_count
            warnings.append(f"{skipped} sheet(s) skipped due to missing required columns")

        return warnings

    def _calculate_json_confidence(self, transactions: List[Dict], data: Any) -> float:
        """Calculate confidence for JSON parsing"""
        if not transactions:
            return 0.0

        # Base confidence on structure completeness
        total_fields = 0
        complete_fields = 0

        for tx in transactions[:5]:  # Check first 5 transactions
            total_fields += 4  # date, amount, description, type
            if tx.get('date'):
                complete_fields += 1
            if tx.get('amount') is not None:
                complete_fields += 1
            if tx.get('description'):
                complete_fields += 1
            if tx.get('transaction_type'):
                complete_fields += 1

        return complete_fields / total_fields if total_fields > 0 else 0.7

    def _calculate_excel_confidence(self, transactions: List[Dict], total_sheets: int) -> float:
        """Calculate confidence for Excel parsing"""
        if not transactions:
            return 0.0

        # Base confidence on successful sheet processing and data quality
        base_confidence = 0.7

        # Increase confidence if we have good amount of data
        if len(transactions) > 20:
            base_confidence += 0.1

        # Decrease if many sheets were skipped
        processed_sheets = len(set(tx.get('sheet_name') for tx in transactions))
        sheet_ratio = processed_sheets / total_sheets if total_sheets > 0 else 1

        return min(0.95, base_confidence * sheet_ratio)

    def _parse_pdf_transactions_enhanced(self, full_text: str, page_texts: List[str]) -> List[Dict]:
        """Enhanced PDF transaction parsing with multiple strategies and bank-specific patterns"""

        transactions = []

        # Extract institution name first for bank-specific patterns
        metadata = self._extract_pdf_metadata(full_text)
        institution = metadata.get('institution', '')

        # Strategy 1: Bank-specific pattern matching (highest priority)
        if institution:
            bank_transactions = self._extract_pdf_bank_specific_transactions(full_text, institution)
            transactions.extend(bank_transactions)

        # Strategy 2: Table-based extraction
        if not transactions:
            table_transactions = self._extract_pdf_table_transactions(full_text)
            transactions.extend(table_transactions)

        # Strategy 3: Line-by-line pattern matching (if no tables found)
        if not transactions:
            line_transactions = self._extract_pdf_line_transactions(full_text)
            transactions.extend(line_transactions)

        # Strategy 4: Page-by-page processing for complex layouts
        if not transactions:
            for page_text in page_texts:
                page_transactions = self._extract_pdf_line_transactions(page_text)
                transactions.extend(page_transactions)

        # Remove duplicates and sort by date
        unique_transactions = self._deduplicate_pdf_transactions(transactions)

        return sorted(unique_transactions, key=lambda x: x.get('date', ''))

    def process_with_pipeline(self, text: str, metadata: Dict = None) -> Dict[str, Any]:
        """Process statement using the 5-step pipeline approach"""
        try:
            # Step 1: Text Cleanup
            clean_text = self.pipeline.step1_text_cleanup(text)
            if not clean_text or len(clean_text.strip()) < 10:
                raise ValueError("Insufficient text content after cleanup")

            # Step 2: Data Structuring
            df = self.pipeline.step2_data_structuring(clean_text)
            if df.empty:
                raise ValueError("No structured data found in text")

            # Step 3: Info Extraction
            transactions = self.pipeline.step3_info_extraction(df)
            if not transactions:
                raise ValueError("No transactions could be extracted")

            # Step 4: Validation
            validation_results = self.pipeline.step4_validation(transactions)

            # Create metadata object
            statement_metadata = StatementMetadata(
                institution=metadata.get('institution', '') if metadata else '',
                account_number=metadata.get('account_number', '') if metadata else '',
                account_type=metadata.get('account_type', '') if metadata else '',
                statement_period_start=metadata.get('statement_period_start') if metadata else None,
                statement_period_end=metadata.get('statement_period_end') if metadata else None,
                opening_balance=metadata.get('opening_balance') if metadata else None,
                closing_balance=metadata.get('closing_balance') if metadata else None,
                available_balance=metadata.get('available_balance') if metadata else None,
                balances=metadata.get('balances', {}) if metadata else {}
            )

            # Step 5: Usage Preparation
            usage_data = self.pipeline.step5_usage_preparation(transactions, statement_metadata)

            # Convert ParsedTransaction objects to dicts for API response
            transactions_dict = []
            for t in transactions:
                transactions_dict.append({
                    'date': t.date.isoformat(),
                    'amount': t.amount,
                    'description': t.description,
                    'transaction_type': t.transaction_type,
                    'merchant': t.merchant,
                    'confidence': t.confidence,
                    'raw_data': t.raw_data
                })

            return {
                'success': True,
                'parsed_transactions': transactions_dict,
                'statement_metadata': metadata or {},
                'validation_results': validation_results,
                'insights': usage_data['insights'],
                'ml_features': usage_data['ml_features'],
                'processing_method': 'structured_pipeline'
            }

        except Exception as e:
            return {
                'success': False,
                'error': f'Pipeline processing failed: {str(e)}',
                'parsed_transactions': [],
                'processing_method': 'structured_pipeline'
            }

    def _extract_pdf_bank_specific_transactions(self, text: str, institution: str) -> List[Dict]:
        """Extract transactions using bank-specific patterns"""
        transactions = []
        lines = text.split('\n')

        # Get bank-specific patterns
        bank_patterns = self._get_bank_specific_patterns(institution)

        for line in lines:
            line = line.strip()
            if not line or len(line) < 10:
                continue

            # Try bank-specific patterns first
            for pattern in bank_patterns:
                match = re.search(pattern, line)
                if match:
                    tx = self._parse_pdf_pattern_match(match, pattern)
                    if tx:
                        # Add bank-specific metadata
                        tx['institution'] = institution
                        tx['confidence'] = min(tx.get('confidence', 0.6) + 0.2, 1.0)  # Boost confidence for bank-specific patterns
                        transactions.append(tx)
                        break

        return transactions

    def _extract_pdf_table_transactions(self, text: str) -> List[Dict]:
        """Extract transactions from PDF tables"""
        transactions = []
        lines = text.split('\n')

        # Look for table headers
        header_patterns = [
            r'date.*amount.*description',
            r'transaction.*date.*amount',
            r'posting.*date.*amount.*description',
            r'effective.*date.*amount.*payee'
        ]

        table_start = -1
        for i, line in enumerate(lines):
            line_lower = line.lower().strip()
            for pattern in header_patterns:
                if re.search(pattern, line_lower, re.IGNORECASE):
                    table_start = i + 1
                    break
            if table_start > 0:
                break

        if table_start > 0:
            # Process table rows
            for i in range(table_start, min(table_start + 200, len(lines))):
                line = lines[i].strip()
                if line:
                    tx = self._parse_pdf_table_line(line)
                    if tx:
                        transactions.append(tx)

        return transactions

    def _extract_pdf_line_transactions(self, text: str) -> List[Dict]:
        """Extract transactions using line-by-line pattern matching"""
        transactions = []
        lines = text.split('\n')

        for line in lines:
            line = line.strip()
            if not line or len(line) < 10:
                continue

            # Enhanced patterns for different bank statement formats with better debit/credit handling
            patterns = [
                # Pattern 1: Date Description Amount (with +/- indicator)
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+([-+]?\$?\s*[\d,]+\.?\d*)\s*$',

                # Pattern 2: Date Description Debit Credit Balance (most common bank format)
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+(\$?[\d,]*\.?\d*)\s+(\$?[\d,]*\.?\d*)\s+(\$?[\d,]+\.?\d*)\s*$',

                # Pattern 3: Date Posted Date Description Amount Balance
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+([-+]?\$?[\d,]+\.?\d*)\s+(\$?[\d,]+\.?\d*)\s*$',

                # Pattern 4: Date Description Amount Balance
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+([-+]?\$?[\d,]+\.?\d*)\s+(\$?[\d,]+\.?\d*)\s*$',

                # Pattern 5: YYYY-MM-DD format with Debit/Credit
                r'(\d{4}-\d{2}-\d{2})\s+(.+?)\s+(\$?[\d,]*\.?\d*)\s+(\$?[\d,]*\.?\d*)\s+(\$?[\d,]+\.?\d*)\s*$',

                # Pattern 6: Credit card format - Date Merchant/Description Amount
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+(\$?[\d,]+\.?\d*)\s*$',

                # Pattern 7: Check format - Check# Date Description Amount
                r'(\d+)\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+([-+]?\$?[\d,]+\.?\d*)\s*$',

                # Pattern 8: Electronic/ACH format - Date Type Description Amount
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(ACH|DEBIT|CREDIT|ELECTRONIC|TRANSFER|DEPOSIT|WITHDRAWAL)\s+(.+?)\s+([-+]?\$?[\d,]+\.?\d*)\s*$',

                # Pattern 9: ATM/Branch format
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(ATM|BRANCH|ONLINE)\s+(.+?)\s+([-+]?\$?[\d,]+\.?\d*)\s*$'
            ]

            for pattern in patterns:
                match = re.search(pattern, line)
                if match:
                    tx = self._parse_pdf_pattern_match(match, pattern)
                    if tx:
                        transactions.append(tx)
                        break

        return transactions

    def _parse_pdf_table_line(self, line: str) -> Optional[Dict]:
        """Parse a line from a PDF table"""
        try:
            # Split by multiple spaces (common in PDF tables)
            parts = re.split(r'\s{2,}', line.strip())

            if len(parts) < 3:
                return None

            # Try to identify date, description, amount
            date_part = None
            amount_part = None
            description_parts = []

            for part in parts:
                # Check if it's a date
                if re.match(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', part):
                    date_part = part
                # Check if it's an amount
                elif re.match(r'[-+]?\$?[\d,]+\.?\d*$', part.replace(' ', '')):
                    amount_part = part
                else:
                    description_parts.append(part)

            if date_part and amount_part:
                parsed_date = self._parse_date_enhanced(date_part)
                parsed_amount = self._parse_amount_enhanced(amount_part)
                description = ' '.join(description_parts) or 'PDF Transaction'

                return {
                    'date': parsed_date.isoformat(),
                    'amount': float(abs(parsed_amount)),
                    'description': self._clean_description(description),
                    'transaction_type': 'expense' if parsed_amount < 0 else 'income',
                    'confidence': 0.7
                }

        except Exception:
            pass

        return None

    def _parse_pdf_pattern_match(self, match, pattern: str) -> Optional[Dict]:
        """Enhanced pattern matching for PDF text with sophisticated debit/credit handling"""
        try:
            groups = match.groups()
            parsed_date = None
            parsed_amount = None
            description = ""
            transaction_type = "expense"
            confidence = 0.6

            if len(groups) == 3:
                # Pattern: Date Description Amount OR Check# Date Description Amount
                if re.match(r'\d+$', groups[0]):  # Check number pattern
                    check_num, date_str, description = groups[0], groups[1], groups[2]
                    parsed_date = self._parse_date_enhanced(date_str)
                    # For check pattern, need to handle amount differently
                    parsed_amount = 0  # Default, will be updated if we find amount in description
                    description = f"Check #{check_num} - {description}"
                else:
                    date_str, description, amount_str = groups
                    parsed_date = self._parse_date_enhanced(date_str)
                    parsed_amount = self._parse_amount_enhanced(amount_str)

                # Determine transaction type from amount sign or description keywords
                if parsed_amount < 0:
                    transaction_type = "expense"
                    parsed_amount = abs(parsed_amount)
                elif parsed_amount > 0:
                    # Check description for income indicators
                    desc_lower = description.lower()
                    income_keywords = ['deposit', 'credit', 'interest', 'dividend', 'salary', 'payroll', 'refund', 'payment received']
                    if any(keyword in desc_lower for keyword in income_keywords):
                        transaction_type = "income"
                    else:
                        # For positive amounts, check if it's likely an expense
                        transaction_type = "expense"

            elif len(groups) == 4:
                # Pattern: Date Description Amount Balance OR Date Posted Date Description Amount
                if self._is_valid_date(groups[1]):  # Posted date pattern
                    date_str, posted_date, description, amount_str = groups
                    parsed_date = self._parse_date_enhanced(date_str)
                    parsed_amount = self._parse_amount_enhanced(amount_str)
                    description = f"{description} (Posted: {posted_date})"
                else:
                    date_str, description, amount_str, balance_str = groups
                    parsed_date = self._parse_date_enhanced(date_str)
                    parsed_amount = self._parse_amount_enhanced(amount_str)

                # Analyze description for transaction type
                desc_lower = description.lower()
                if any(keyword in desc_lower for keyword in ['deposit', 'credit', 'interest', 'dividend']):
                    transaction_type = "income"
                else:
                    transaction_type = "expense"

            elif len(groups) == 5:
                # Pattern: Date Description Debit Credit Balance
                date_str, description, debit_str, credit_str, balance_str = groups
                parsed_date = self._parse_date_enhanced(date_str)

                debit = self._parse_amount_enhanced(debit_str) if debit_str.strip() and debit_str.strip() != '-' else 0
                credit = self._parse_amount_enhanced(credit_str) if credit_str.strip() and credit_str.strip() != '-' else 0

                if debit > 0:
                    parsed_amount = debit
                    transaction_type = "expense"
                    confidence = 0.9  # High confidence when debit/credit is explicit
                elif credit > 0:
                    parsed_amount = credit
                    transaction_type = "income"
                    confidence = 0.9
                else:
                    return None  # No valid amount found

            else:
                return None

            if not parsed_date or parsed_amount is None or parsed_amount <= 0:
                return None

            return {
                'date': parsed_date.isoformat(),
                'amount': float(abs(parsed_amount)),
                'description': self._clean_description(description),
                'transaction_type': transaction_type,
                'confidence': confidence,
                'raw_line': match.group(0)[:100]  # Store original line for debugging
            }

        except Exception as e:
            return None

    def _is_valid_date(self, date_str: str) -> bool:
        """Check if a string represents a valid date"""
        try:
            self._parse_date_enhanced(date_str)
            return True
        except:
            return False

    def _get_bank_specific_patterns(self, institution: str) -> List[str]:
        """Get bank-specific parsing patterns based on detected institution"""
        institution_lower = institution.lower()

        # Major US Banks patterns
        if any(bank in institution_lower for bank in ['chase', 'jpmorgan']):
            return [
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+([-+]?\$?[\d,]+\.?\d*)\s+(\$?[\d,]+\.?\d*)',
                r'(\d{1,2}[/-]\d{1,2})\s+(.+?)\s+([-+]?\$?[\d,]+\.?\d*)',
            ]
        elif any(bank in institution_lower for bank in ['bank of america', 'bofa']):
            return [
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+(\$?[\d,]*\.?\d*)\s+(\$?[\d,]*\.?\d*)\s+(\$?[\d,]+\.?\d*)',
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(DEBIT|CREDIT)\s+(.+?)\s+([-+]?\$?[\d,]+\.?\d*)',
            ]
        elif any(bank in institution_lower for bank in ['wells fargo', 'wellsfargo']):
            return [
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+(Debit|Credit)\s+([-+]?\$?[\d,]+\.?\d*)\s+(\$?[\d,]+\.?\d*)',
                r'(\d{1,2}[/-]\d{1,2})\s+(.+?)\s+([-+]?\$?[\d,]+\.?\d*)',
            ]
        elif any(bank in institution_lower for bank in ['citi', 'citibank']):
            return [
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+([-+]?\$?[\d,]+\.?\d*)\s+([DR])\s+(\$?[\d,]+\.?\d*)',
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+([-+]?\$?[\d,]+\.?\d*)',
            ]
        elif any(bank in institution_lower for bank in ['capital one', 'capitalone']):
            return [
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+([-+]?\$?[\d,]+\.?\d*)\s+(Available Balance: \$?[\d,]+\.?\d*)',
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+([-+]?\$?[\d,]+\.?\d*)',
            ]
        elif any(bank in institution_lower for bank in ['american express', 'amex']):
            return [
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+(\$?[\d,]+\.?\d*)\s*$',
                r'(\w{3}\s+\d{1,2})\s+(.+?)\s+(\$?[\d,]+\.?\d*)',
            ]
        elif any(bank in institution_lower for bank in ['discover']):
            return [
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+(\$?[\d,]+\.?\d*)\s+(\$?[\d,]+\.?\d*)',
                r'(\d{1,2}[/-]\d{1,2})\s+(.+?)\s+(\$?[\d,]+\.?\d*)',
            ]
        elif any(bank in institution_lower for bank in ['usaa']):
            return [
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+(Debit|Credit)\s+([-+]?\$?[\d,]+\.?\d*)\s+(\$?[\d,]+\.?\d*)',
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+([-+]?\$?[\d,]+\.?\d*)',
            ]

        # Credit Unions and Regional Banks
        elif any(bank in institution_lower for bank in ['navy federal', 'nfcu']):
            return [
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+(Share Draft|Deposit|Withdrawal)\s+([-+]?\$?[\d,]+\.?\d*)',
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+([-+]?\$?[\d,]+\.?\d*)',
            ]
        elif any(bank in institution_lower for bank in ['pnc']):
            return [
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+(DB|CR)\s+([-+]?\$?[\d,]+\.?\d*)\s+(\$?[\d,]+\.?\d*)',
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+([-+]?\$?[\d,]+\.?\d*)',
            ]

        # Default patterns for unknown banks
        return [
            r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+(\$?[\d,]*\.?\d*)\s+(\$?[\d,]*\.?\d*)\s+(\$?[\d,]+\.?\d*)',
            r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+([-+]?\$?[\d,]+\.?\d*)\s+(\$?[\d,]+\.?\d*)',
            r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+([-+]?\$?[\d,]+\.?\d*)',
        ]

    def _deduplicate_pdf_transactions(self, transactions: List[Dict]) -> List[Dict]:
        """Remove duplicate transactions from PDF parsing"""
        seen = set()
        unique_transactions = []

        for tx in transactions:
            # Create a signature for the transaction
            signature = (
                tx.get('date'),
                tx.get('amount'),
                tx.get('description', '')[:50]  # First 50 chars of description
            )

            if signature not in seen:
                seen.add(signature)
                unique_transactions.append(tx)

        return unique_transactions

    def _extract_pdf_metadata(self, text: str) -> Dict[str, Any]:
        """Enhanced metadata extraction from PDF statement with sophisticated parsing"""
        metadata = {
            'institution': '',
            'account_number': '',
            'account_type': '',
            'statement_period_start': None,
            'statement_period_end': None,
            'opening_balance': None,
            'closing_balance': None,
            'available_balance': None,
            'minimum_payment': None,
            'credit_limit': None,
            'payment_due_date': None,
            'customer_info': {},
            'balances': {}  # All balance types found
        }

        lines = text.split('\n')

        # Enhanced institution detection
        institution_patterns = [
            r'^\s*([A-Z][A-Z\s&]+(?:BANK|CREDIT UNION|FINANCIAL|CORP|COMPANY))',
            r'(?:from|statement from)\s+([A-Z][A-Za-z\s&]+(?:Bank|Credit Union|Financial))',
            r'^([A-Z][A-Za-z\s]+)\s*(?:STATEMENT|Account Statement)',
            r'([A-Z][A-Z\s]+)\s*(?:CUSTOMER SERVICE|MEMBER SERVICE)',
        ]

        for i, line in enumerate(lines[:25]):  # Check first 25 lines
            line = line.strip()
            if not line:
                continue

            for pattern in institution_patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match and len(match.groups()) >= 1:
                    institution = match.group(1).strip()
                    if 3 <= len(institution) <= 60 and not re.search(r'\d{4,}', institution):
                        metadata['institution'] = institution
                        break

            if metadata['institution']:
                break

        # Enhanced account number detection
        account_patterns = [
            r'account\s*(?:number|#)?\s*[:\-]?\s*(\*{4,}\d{4}|\d{4,})',
            r'(?:acct|account)\s*[:\-]?\s*(\*{3,}\d{4})',
            r'(\*{4,}\d{4})\s*(?:account|acct)',
            r'ending\s*(?:in|with)\s*(\d{4})',
            r'(\d{4})\s*-\s*\*{4,}',
        ]

        for line in lines[:30]:
            for pattern in account_patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match and len(match.groups()) >= 1:
                    metadata['account_number'] = match.group(1)
                    break
            if metadata['account_number']:
                break

        # Enhanced balance extraction with multiple types
        balance_patterns = {
            'opening_balance': [
                r'(?:opening|beginning|previous)\s+balance\s*[:\$]?\s*([\d,.-]+)',
                r'balance\s+forward\s*[:\$]?\s*([\d,.-]+)',
                r'(?:prev|previous)\s+statement\s+balance\s*[:\$]?\s*([\d,.-]+)',
            ],
            'closing_balance': [
                r'(?:closing|ending|current|new)\s+balance\s*[:\$]?\s*([\d,.-]+)',
                r'statement\s+balance\s*[:\$]?\s*([\d,.-]+)',
                r'balance\s+as\s+of\s+[^$]*\$?\s*([\d,.-]+)',
            ],
            'available_balance': [
                r'available\s+(?:balance|credit)\s*[:\$]?\s*([\d,.-]+)',
                r'available\s+for\s+use\s*[:\$]?\s*([\d,.-]+)',
                r'available\s*[:\$]?\s*([\d,.-]+)',
            ],
            'credit_limit': [
                r'credit\s+limit\s*[:\$]?\s*([\d,.-]+)',
                r'line\s+of\s+credit\s*[:\$]?\s*([\d,.-]+)',
                r'authorized\s+limit\s*[:\$]?\s*([\d,.-]+)',
            ],
            'minimum_payment': [
                r'minimum\s+payment\s*(?:due)?\s*[:\$]?\s*([\d,.-]+)',
                r'min\s+payment\s*[:\$]?\s*([\d,.-]+)',
                r'payment\s+due\s*[:\$]?\s*([\d,.-]+)',
            ]
        }

        for balance_type, patterns in balance_patterns.items():
            for line in lines:
                for pattern in patterns:
                    match = re.search(pattern, line, re.IGNORECASE)
                    if match and len(match.groups()) >= 1:
                        try:
                            amount = self._parse_amount_enhanced(match.group(1))
                            metadata[balance_type] = amount
                            metadata['balances'][balance_type] = amount
                            break
                        except:
                            continue
                if metadata.get(balance_type):
                    break

        # Enhanced date parsing for statement period
        date_patterns = [
            r'statement\s+period\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*(?:to|through|\-)\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})',
            r'(?:from|period)\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*(?:to|through|\-)\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})',
            r'(\w{3}\s+\d{1,2},?\s+\d{4})\s*(?:to|through|\-)\s*(\w{3}\s+\d{1,2},?\s+\d{4})',
        ]

        for line in lines[:30]:
            for pattern in date_patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match and len(match.groups()) >= 2:
                    try:
                        start_date = self._parse_date_enhanced(match.group(1))
                        end_date = self._parse_date_enhanced(match.group(2))
                        if start_date and end_date:
                            metadata['statement_period_start'] = start_date
                            metadata['statement_period_end'] = end_date
                            break
                    except:
                        continue
            if metadata.get('statement_period_start'):
                break

        # Account type detection
        account_type_patterns = [
            r'(checking|savings|credit|loan|mortgage|investment)\s+account',
            r'account\s+type\s*[:\-]?\s*(\w+)',
            r'(\w+)\s+statement',
        ]

        for line in lines[:20]:
            for pattern in account_type_patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match and len(match.groups()) >= 1:
                    account_type = match.group(1).lower()
                    if account_type in ['checking', 'savings', 'credit', 'loan', 'mortgage', 'investment']:
                        metadata['account_type'] = account_type
                        break
            if metadata['account_type']:
                break

        return metadata

    # Additional helper methods...
    def _generate_pdf_warnings(self, text: str, transactions: List[Dict]) -> List[str]:
        """Generate warnings for PDF processing"""
        warnings = []
        if len(transactions) == 0:
            warnings.append("No transactions found in PDF")
        elif len(transactions) < 5:
            warnings.append("Very few transactions found - may need manual review")
        return warnings

    def _generate_csv_warnings(self, fieldnames: List[str], mapping: Dict) -> List[str]:
        """Generate warnings for CSV processing"""
        warnings = []
        if not mapping.get('description'):
            warnings.append("Description column not detected - using default values")
        if not mapping.get('amount') and not (mapping.get('debit') or mapping.get('credit')):
            warnings.append("Amount columns may not be correctly identified")
        return warnings

    def _calculate_parsing_confidence(self, transactions: List[Dict], source_text: str) -> float:
        """Calculate confidence score for parsing results"""
        if not transactions:
            return 0.0

        # Base confidence on number of transactions found vs expected
        text_lines = len([line for line in source_text.split('\n') if line.strip()])
        if text_lines > 0:
            ratio = len(transactions) / max(text_lines / 10, 1)  # Rough estimate
            return min(0.9, max(0.3, ratio))

        return 0.7  # Default confidence

    def _calculate_csv_confidence(self, transactions: List[Dict], errors: List[str]) -> float:
        """Calculate confidence for CSV parsing"""
        if not transactions:
            return 0.0

        error_rate = len(errors) / (len(transactions) + len(errors)) if transactions or errors else 0
        return max(0.3, 1.0 - error_rate)

    def _calculate_row_confidence(self, row: Dict, mapping: Dict) -> float:
        """Calculate confidence for individual CSV row"""
        confidence = 0.5  # Base confidence

        # Increase confidence if key fields are present and valid
        if mapping.get('date') and row.get(mapping['date']):
            confidence += 0.2
        if mapping.get('amount') and row.get(mapping['amount']):
            confidence += 0.2
        if mapping.get('description') and row.get(mapping['description']):
            confidence += 0.1

        return min(1.0, confidence)
