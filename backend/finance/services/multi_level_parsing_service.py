"""
Multi-level statement parsing service with progressive fallback strategies.

This service implements a 4-level parsing approach:
1. UI-based column extraction (for CSV/Excel files)
2. Regex pattern matching (for structured text/PDF)
3. AI-powered parsing (for complex or unstructured content)
4. Manual correction interface (when all else fails)

Each level attempts to parse the statement and stores the results.
If one level fails, the system automatically falls back to the next level.
All attempts are tracked for learning and improvement.
"""

import json
import io
import re
import pandas as pd
from typing import Dict, List, Optional, Tuple, Any, Union
from datetime import datetime, timedelta
from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model
from dataclasses import dataclass

from ..models import (
    UploadSession, StatementImport, TransactionImport,
    ParsingAttempt, ColumnMapping, RegexPattern,
    LearningDataset, ParsingMetrics, Account, Category
)
from .enhanced_upload_service import EnhancedUploadService, ParsedTransaction
from .bank_statement_parser import BankStatementParser

User = get_user_model()


@dataclass
class ParsingResult:
    """Structured result from a parsing attempt"""
    success: bool
    method: str
    transactions: List[Dict]
    confidence: float
    error_message: str = ""
    metadata: Dict = None
    parsing_time: float = 0.0
    raw_result: Dict = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}
        if self.raw_result is None:
            self.raw_result = {}


class MultiLevelParsingService:
    """Multi-level parsing service with progressive fallback"""

    def __init__(self, user: User):
        self.user = user
        self.enhanced_service = EnhancedUploadService(user)
        self.bank_parser = BankStatementParser(user)

    def parse_statement_progressive(
        self,
        upload_session: UploadSession,
        password: Optional[str] = None,
        force_method: Optional[str] = None,
        max_attempts: int = 4
    ) -> ParsingResult:
        """
        Parse statement using progressive fallback strategy.

        Args:
            upload_session: The upload session to parse
            password: Password for encrypted files
            force_method: Force a specific parsing method
            max_attempts: Maximum number of parsing attempts

        Returns:
            ParsingResult with the best parsing result achieved
        """

        upload_session.mark_processing()
        upload_session.add_log_entry('info', 'Starting multi-level parsing')

        # Define parsing methods in order of preference
        parsing_methods = []

        # Add bank statement parser as first option for PDF files
        if upload_session.file_type == 'pdf':
            parsing_methods.append(('bank_statement_parser', self._attempt_bank_statement_parsing))

        parsing_methods.extend([
            ('ui_column_extraction', self._attempt_ui_column_extraction),
            ('regex_patterns', self._attempt_regex_parsing),
            ('ai_parsing', self._attempt_ai_parsing),
            ('manual_correction', self._setup_manual_correction)
        ])

        if force_method:
            # Filter to only the forced method
            parsing_methods = [
                (method, func) for method, func in parsing_methods
                if method == force_method
            ]

        best_result = None
        attempt_order = 1

        for method_name, parsing_func in parsing_methods[:max_attempts]:
            if best_result and best_result.success and best_result.confidence > 0.8:
                # Already got a good result, no need to continue
                break

            upload_session.add_log_entry('info', f'Attempting {method_name} parsing')

            # Create parsing attempt record
            parsing_attempt = ParsingAttempt.objects.create(
                user=self.user,
                upload_session=upload_session,
                parsing_method=method_name,
                attempt_order=attempt_order
            )

            try:
                start_time = timezone.now()

                # Attempt parsing with this method
                result = parsing_func(upload_session, parsing_attempt, password)

                end_time = timezone.now()
                duration = (end_time - start_time).total_seconds()
                result.parsing_time = duration

                # Record the attempt
                parsing_attempt.mark_completed(
                    status='success' if result.success else 'failed',
                    transactions_count=len(result.transactions),
                    confidence=result.confidence,
                    error_msg=result.error_message
                )

                # Store raw results for learning
                parsing_attempt.raw_extraction_result = result.raw_result
                parsing_attempt.parsing_config = result.metadata
                parsing_attempt.save()

                if result.success:
                    upload_session.add_log_entry(
                        'info',
                        f'{method_name} parsing succeeded with {len(result.transactions)} transactions'
                    )

                    # Create learning dataset entry for successful parsing
                    self._create_learning_dataset_entry(
                        upload_session, parsing_attempt, result, 'successful_parsing'
                    )

                    if not best_result or result.confidence > best_result.confidence:
                        best_result = result

                    # If confidence is high enough, we can stop here
                    if result.confidence > 0.85:
                        break
                else:
                    upload_session.add_log_entry(
                        'warning',
                        f'{method_name} parsing failed: {result.error_message}'
                    )

                    # Create learning dataset entry for failed parsing
                    self._create_learning_dataset_entry(
                        upload_session, parsing_attempt, result, 'failed_parsing'
                    )

            except Exception as e:
                upload_session.add_log_entry('error', f'{method_name} parsing error: {str(e)}')

                parsing_attempt.mark_completed(
                    status='failed',
                    error_msg=str(e)
                )

                result = ParsingResult(
                    success=False,
                    method=method_name,
                    transactions=[],
                    confidence=0.0,
                    error_message=str(e)
                )

            attempt_order += 1

        # Return the best result achieved
        if best_result:
            upload_session.add_log_entry(
                'info',
                f'Best parsing result: {best_result.method} with confidence {best_result.confidence}'
            )
            return best_result
        else:
            # All methods failed
            error_msg = 'All parsing methods failed'
            upload_session.mark_failed(error_msg)
            return ParsingResult(
                success=False,
                method='none',
                transactions=[],
                confidence=0.0,
                error_message=error_msg
            )

    def _attempt_bank_statement_parsing(
        self,
        upload_session: UploadSession,
        parsing_attempt: ParsingAttempt,
        password: Optional[str] = None
    ) -> ParsingResult:
        """
        Attempt specialized bank statement parsing using BankStatementParser.
        This method is optimized for multi-bank PDF statement parsing.
        """

        if upload_session.file_type != 'pdf':
            return ParsingResult(
                success=False,
                method='bank_statement_parser',
                transactions=[],
                confidence=0.0,
                error_message='Bank statement parser only supports PDF files'
            )

        try:
            start_time = datetime.now()

            # Use the bank statement parser
            result = self.bank_parser.parse_statement(
                upload_session.file_path,
                password=password
            )

            parsing_time = (datetime.now() - start_time).total_seconds()

            if result['success']:
                # Convert bank parser format to our transaction format
                transactions = []
                for tx in result['transactions']:
                    # Normalize transaction data
                    transaction = {
                        'date': tx.get('date', ''),
                        'amount': self._parse_amount(tx.get('amount', '0')),
                        'description': tx.get('description', ''),
                        'transaction_type': self._normalize_transaction_type(tx.get('type', 'unknown')),
                        'reference_id': tx.get('transaction_id', ''),
                        'balance': tx.get('balance'),
                        'time': tx.get('time'),
                        'category': tx.get('category'),
                        'merchant': tx.get('merchant'),
                    }

                    # Remove None values
                    transaction = {k: v for k, v in transaction.items() if v is not None}
                    transactions.append(transaction)

                # Calculate confidence based on bank detection and transaction count
                bank_detected = result.get('bank', 'unknown') != 'unknown'
                tx_count = len(transactions)

                # High confidence if bank is detected and we have transactions
                if bank_detected and tx_count > 0:
                    confidence = min(0.95, 0.7 + (tx_count / 100) * 0.25)
                elif tx_count > 0:
                    confidence = min(0.8, 0.5 + (tx_count / 100) * 0.3)
                else:
                    confidence = 0.3

                # Validate transactions
                validation_result = self.bank_parser.validate_transactions(transactions)
                if not validation_result['valid']:
                    confidence *= 0.7  # Reduce confidence for invalid transactions

                return ParsingResult(
                    success=True,
                    method='bank_statement_parser',
                    transactions=transactions,
                    confidence=confidence,
                    metadata={
                        'bank': result.get('bank', 'unknown'),
                        'account_holder': result.get('metadata', {}).get('account_holder'),
                        'account_number': result.get('metadata', {}).get('account_number'),
                        'statement_period': result.get('metadata', {}).get('statement_period'),
                        'total_transactions': result.get('total_transactions', len(transactions)),
                        'validation_warnings': validation_result.get('warnings', [])
                    },
                    parsing_time=parsing_time,
                    raw_result={
                        'bank_parser_result': result,
                        'validation': validation_result
                    }
                )
            else:
                return ParsingResult(
                    success=False,
                    method='bank_statement_parser',
                    transactions=[],
                    confidence=0.0,
                    error_message=result.get('error', 'Bank statement parser failed'),
                    parsing_time=parsing_time,
                    raw_result={'bank_parser_result': result}
                )

        except Exception as e:
            return ParsingResult(
                success=False,
                method='bank_statement_parser',
                transactions=[],
                confidence=0.0,
                error_message=f'Bank statement parsing error: {str(e)}'
            )

    def _attempt_ui_column_extraction(
        self,
        upload_session: UploadSession,
        parsing_attempt: ParsingAttempt,
        password: Optional[str] = None
    ) -> ParsingResult:
        """
        Attempt UI-based column extraction for CSV/Excel files.
        This method auto-detects columns and extracts data.
        """

        if upload_session.file_type not in ['csv', 'excel', 'xlsx']:
            return ParsingResult(
                success=False,
                method='ui_column_extraction',
                transactions=[],
                confidence=0.0,
                error_message=f'UI column extraction not applicable for {upload_session.file_type} files'
            )

        try:
            # Use enhanced service for initial processing
            if upload_session.file_type == 'csv':
                result = self.enhanced_service._process_csv_enhanced(
                    upload_session, upload_session.file_content
                )
            else:  # Excel
                result = self.enhanced_service._process_excel_enhanced(
                    upload_session, upload_session.file_content
                )

            if result['success']:
                # Store column mappings for learning
                if 'column_mapping' in result:
                    self._store_column_mappings(parsing_attempt, result['column_mapping'])

                # Convert to our standard format
                transactions = result.get('parsed_transactions', [])
                confidence = result.get('confidence', 0.7)

                return ParsingResult(
                    success=True,
                    method='ui_column_extraction',
                    transactions=transactions,
                    confidence=confidence,
                    metadata={'column_mapping': result.get('column_mapping', {})},
                    raw_result=result
                )
            else:
                return ParsingResult(
                    success=False,
                    method='ui_column_extraction',
                    transactions=[],
                    confidence=0.0,
                    error_message=result.get('error', 'UI column extraction failed'),
                    raw_result=result
                )

        except Exception as e:
            return ParsingResult(
                success=False,
                method='ui_column_extraction',
                transactions=[],
                confidence=0.0,
                error_message=f'UI column extraction error: {str(e)}'
            )

    def _attempt_regex_parsing(
        self,
        upload_session: UploadSession,
        parsing_attempt: ParsingAttempt,
        password: Optional[str] = None
    ) -> ParsingResult:
        """
        Attempt regex-based parsing using learned and built-in patterns.
        """

        try:
            # Get text content based on file type
            if upload_session.file_type == 'pdf':
                text_content = self._extract_pdf_text(upload_session, password)
            else:
                # For other file types, convert to text
                text_content = self._convert_file_to_text(upload_session)

            if not text_content:
                return ParsingResult(
                    success=False,
                    method='regex_patterns',
                    transactions=[],
                    confidence=0.0,
                    error_message='Could not extract text content for regex parsing'
                )

            # Get applicable regex patterns
            patterns = self._get_applicable_regex_patterns(upload_session)

            best_transactions = []
            best_confidence = 0.0
            best_pattern = None

            for pattern in patterns:
                try:
                    transactions = self._apply_regex_pattern(text_content, pattern)

                    if transactions:
                        # Calculate confidence based on pattern success rate and transaction count
                        confidence = self._calculate_regex_confidence(pattern, transactions, text_content)

                        if confidence > best_confidence:
                            best_transactions = transactions
                            best_confidence = confidence
                            best_pattern = pattern

                        # Record pattern usage
                        pattern.record_success()

                except Exception as pattern_error:
                    pattern.record_failure()
                    continue

            if best_transactions:
                return ParsingResult(
                    success=True,
                    method='regex_patterns',
                    transactions=best_transactions,
                    confidence=best_confidence,
                    metadata={
                        'pattern_used': best_pattern.pattern_name if best_pattern else None,
                        'pattern_id': best_pattern.id if best_pattern else None
                    },
                    raw_result={
                        'text_content': text_content[:1000],  # Store sample for learning
                        'pattern_results': len(best_transactions)
                    }
                )
            else:
                return ParsingResult(
                    success=False,
                    method='regex_patterns',
                    transactions=[],
                    confidence=0.0,
                    error_message='No regex patterns successfully extracted transactions',
                    raw_result={'text_content': text_content[:1000]}
                )

        except Exception as e:
            return ParsingResult(
                success=False,
                method='regex_patterns',
                transactions=[],
                confidence=0.0,
                error_message=f'Regex parsing error: {str(e)}'
            )

    def _attempt_ai_parsing(
        self,
        upload_session: UploadSession,
        parsing_attempt: ParsingAttempt,
        password: Optional[str] = None
    ) -> ParsingResult:
        """
        Attempt AI-powered parsing using the structured pipeline.
        """

        try:
            # Get text content
            if upload_session.file_type == 'pdf':
                text_content = self._extract_pdf_text(upload_session, password)
            else:
                text_content = self._convert_file_to_text(upload_session)

            if not text_content:
                return ParsingResult(
                    success=False,
                    method='ai_parsing',
                    transactions=[],
                    confidence=0.0,
                    error_message='Could not extract text content for AI parsing'
                )

            # Use the enhanced service's pipeline
            metadata = self.enhanced_service._extract_pdf_metadata(text_content)
            result = self.enhanced_service.process_with_pipeline(text_content, metadata)

            if result['success']:
                transactions = result.get('parsed_transactions', [])
                confidence = min(0.9, len(transactions) / max(10, len(text_content.split('\n')) / 5))

                return ParsingResult(
                    success=True,
                    method='ai_parsing',
                    transactions=transactions,
                    confidence=confidence,
                    metadata=result.get('statement_metadata', {}),
                    raw_result=result
                )
            else:
                return ParsingResult(
                    success=False,
                    method='ai_parsing',
                    transactions=[],
                    confidence=0.0,
                    error_message=result.get('error', 'AI parsing failed'),
                    raw_result=result
                )

        except Exception as e:
            return ParsingResult(
                success=False,
                method='ai_parsing',
                transactions=[],
                confidence=0.0,
                error_message=f'AI parsing error: {str(e)}'
            )

    def _setup_manual_correction(
        self,
        upload_session: UploadSession,
        parsing_attempt: ParsingAttempt,
        password: Optional[str] = None
    ) -> ParsingResult:
        """
        Setup manual correction interface when all automated methods fail.
        """

        # Mark session as requiring manual intervention
        upload_session.status = 'failed'
        upload_session.error_message = 'Requires manual parsing assistance'
        upload_session.save()

        # Extract whatever text we can for manual review
        try:
            if upload_session.file_type == 'pdf':
                text_content = self._extract_pdf_text(upload_session, password)
            else:
                text_content = self._convert_file_to_text(upload_session)
        except:
            text_content = "Could not extract text content"

        return ParsingResult(
            success=False,
            method='manual_correction',
            transactions=[],
            confidence=0.0,
            error_message='All automated parsing methods failed. Manual correction required.',
            metadata={'requires_manual_correction': True},
            raw_result={'extracted_text': text_content[:2000]}
        )

    def _extract_pdf_text(self, upload_session: UploadSession, password: Optional[str] = None) -> str:
        """Extract text from PDF file"""
        try:
            import PyPDF2
            import io

            pdf_file = io.BytesIO(upload_session.file_content)
            reader = PyPDF2.PdfReader(pdf_file)

            if reader.is_encrypted and password:
                reader.decrypt(password)

            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"

            return text
        except Exception as e:
            raise Exception(f"PDF text extraction failed: {str(e)}")

    def _convert_file_to_text(self, upload_session: UploadSession) -> str:
        """Convert file content to text for regex parsing"""
        try:
            if upload_session.file_type == 'csv':
                return upload_session.file_content.decode('utf-8', errors='ignore')
            elif upload_session.file_type in ['excel', 'xlsx']:
                # Convert Excel to text representation
                import pandas as pd
                import io

                excel_file = io.BytesIO(upload_session.file_content)
                df = pd.read_excel(excel_file, sheet_name=0)
                return df.to_string()
            elif upload_session.file_type == 'json':
                content = upload_session.file_content.decode('utf-8', errors='ignore')
                data = json.loads(content)
                return json.dumps(data, indent=2)
            else:
                return upload_session.file_content.decode('utf-8', errors='ignore')
        except Exception as e:
            raise Exception(f"File to text conversion failed: {str(e)}")

    def _store_column_mappings(self, parsing_attempt: ParsingAttempt, column_mapping: Dict):
        """Store column mappings for learning"""
        for field_type, column_name in column_mapping.items():
            if column_name:  # Only store non-empty mappings
                ColumnMapping.objects.create(
                    user=self.user,
                    parsing_attempt=parsing_attempt,
                    file_type=parsing_attempt.upload_session.file_type,
                    source_column_name=column_name,
                    mapped_field_type=field_type,
                    confidence_score=0.8,  # Default confidence for auto-detected mappings
                    is_user_confirmed=False
                )

    def _get_applicable_regex_patterns(self, upload_session: UploadSession) -> List[RegexPattern]:
        """Get regex patterns applicable to this file type and institution"""

        # Try to detect institution from content
        institution_name = ""
        try:
            text_content = self._extract_pdf_text(upload_session) if upload_session.file_type == 'pdf' else self._convert_file_to_text(upload_session)
            metadata = self.enhanced_service._extract_pdf_metadata(text_content)
            institution_name = metadata.get('institution', '')
        except:
            pass

        # Get patterns in order of priority
        patterns = RegexPattern.objects.filter(
            user=self.user,
            file_type=upload_session.file_type,
            is_active=True
        ).order_by('priority', '-confidence_score')

        # Add institution-specific patterns first
        if institution_name:
            institution_patterns = patterns.filter(
                institution_name__icontains=institution_name
            )
            general_patterns = patterns.exclude(
                institution_name__icontains=institution_name
            )
            return list(institution_patterns) + list(general_patterns)

        return list(patterns)

    def _apply_regex_pattern(self, text_content: str, pattern: RegexPattern) -> List[Dict]:
        """Apply a regex pattern to extract transactions"""

        transactions = []
        lines = text_content.split('\n')

        for line in lines:
            line = line.strip()
            if not line:
                continue

            try:
                match = re.search(pattern.regex_pattern, line)
                if match:
                    # Use group mappings to extract transaction data
                    transaction_data = self._extract_transaction_from_match(match, pattern.group_mappings)
                    if transaction_data:
                        transactions.append(transaction_data)
            except re.error:
                # Invalid regex pattern
                continue

        return transactions

    def _extract_transaction_from_match(self, match, group_mappings: Dict) -> Optional[Dict]:
        """Extract transaction data from regex match using group mappings"""

        try:
            groups = match.groups()
            transaction = {}

            for group_index, field_type in group_mappings.items():
                group_idx = int(group_index) - 1  # Convert to 0-based index
                if group_idx < len(groups):
                    value = groups[group_idx]

                    if field_type == 'date':
                        transaction['date'] = self.enhanced_service._parse_date_enhanced(value).isoformat()
                    elif field_type in ['amount', 'debit', 'credit']:
                        amount = self.enhanced_service._parse_amount_enhanced(value)
                        transaction['amount'] = float(abs(amount))
                        if field_type == 'debit' or amount < 0:
                            transaction['transaction_type'] = 'expense'
                        else:
                            transaction['transaction_type'] = 'income'
                    elif field_type == 'description':
                        transaction['description'] = str(value).strip()
                    else:
                        transaction[field_type] = str(value).strip()

            # Validate required fields
            if 'date' in transaction and 'amount' in transaction:
                if 'description' not in transaction:
                    transaction['description'] = 'Regex extracted transaction'
                if 'transaction_type' not in transaction:
                    transaction['transaction_type'] = 'expense'

                transaction['confidence'] = 0.7  # Regex-based confidence
                return transaction

        except Exception:
            pass

        return None

    def _calculate_regex_confidence(self, pattern: RegexPattern, transactions: List[Dict], text_content: str) -> float:
        """Calculate confidence score for regex parsing result"""

        base_confidence = float(pattern.confidence_score)

        # Adjust based on number of transactions found
        text_lines = len([line for line in text_content.split('\n') if line.strip()])
        transaction_ratio = len(transactions) / max(text_lines / 10, 1)

        # Reasonable number of transactions boosts confidence
        if 0.1 <= transaction_ratio <= 0.5:
            base_confidence += 0.1
        elif transaction_ratio > 0.5:
            base_confidence -= 0.1  # Too many might indicate over-matching

        return min(0.95, max(0.1, base_confidence))

    def _create_learning_dataset_entry(
        self,
        upload_session: UploadSession,
        parsing_attempt: ParsingAttempt,
        result: ParsingResult,
        dataset_type: str
    ):
        """Create a learning dataset entry for future model training"""

        try:
            # Extract text content
            if upload_session.file_type == 'pdf':
                text_content = self._extract_pdf_text(upload_session)
            else:
                text_content = self._convert_file_to_text(upload_session)

            # Limit text content size for storage
            if len(text_content) > 10000:
                text_content = text_content[:10000] + "... [truncated]"

            # Create learning dataset entry
            LearningDataset.objects.create(
                user=self.user,
                dataset_type=dataset_type,
                upload_session=upload_session,
                parsing_attempt=parsing_attempt,
                raw_text_content=text_content,
                file_type=upload_session.file_type,
                institution_name=result.metadata.get('institution', '') if result.metadata else '',
                expected_transactions=result.transactions if result.success else [],
                actual_parsing_result=result.raw_result,
                is_validated=result.success,
                quality_score=result.confidence if result.success else 0.0
            )

        except Exception as e:
            # Don't fail parsing if learning dataset creation fails
            upload_session.add_log_entry('warning', f'Learning dataset creation failed: {str(e)}')

    def create_manual_correction_interface_data(self, upload_session: UploadSession) -> Dict[str, Any]:
        """Create data structure for manual correction interface"""

        try:
            # Get the last parsing attempt
            last_attempt = ParsingAttempt.objects.filter(
                upload_session=upload_session
            ).order_by('-attempt_order').first()

            # Extract text content for manual review
            if upload_session.file_type == 'pdf':
                text_content = self._extract_pdf_text(upload_session)
            else:
                text_content = self._convert_file_to_text(upload_session)

            # Split text into manageable chunks for UI
            text_lines = text_content.split('\n')[:100]  # First 100 lines

            # Provide suggestions based on previous attempts
            suggestions = []
            if last_attempt and last_attempt.raw_extraction_result:
                suggestions = self._generate_manual_correction_suggestions(last_attempt)

            return {
                'session_id': upload_session.id,
                'file_type': upload_session.file_type,
                'text_content': text_lines,
                'parsing_attempts': self._get_parsing_attempt_summary(upload_session),
                'suggestions': suggestions,
                'column_mapping_template': self._get_column_mapping_template(upload_session.file_type),
                'regex_pattern_examples': self._get_regex_pattern_examples(upload_session.file_type)
            }

        except Exception as e:
            return {
                'error': f'Failed to create manual correction interface: {str(e)}'
            }

    def _generate_manual_correction_suggestions(self, parsing_attempt: ParsingAttempt) -> List[Dict]:
        """Generate suggestions for manual correction based on previous attempts"""

        suggestions = []

        if parsing_attempt.parsing_method == 'ui_column_extraction':
            suggestions.append({
                'type': 'column_mapping',
                'message': 'Try adjusting column mappings for CSV/Excel files',
                'action': 'review_columns'
            })
        elif parsing_attempt.parsing_method == 'regex_patterns':
            suggestions.append({
                'type': 'regex_pattern',
                'message': 'Create custom regex pattern for this file format',
                'action': 'create_pattern'
            })
        elif parsing_attempt.parsing_method == 'ai_parsing':
            suggestions.append({
                'type': 'manual_extraction',
                'message': 'Manually identify transaction patterns for learning',
                'action': 'manual_annotation'
            })

        return suggestions

    def _get_parsing_attempt_summary(self, upload_session: UploadSession) -> List[Dict]:
        """Get summary of all parsing attempts for this session"""

        attempts = ParsingAttempt.objects.filter(
            upload_session=upload_session
        ).order_by('attempt_order')

        return [{
            'method': attempt.parsing_method,
            'status': attempt.status,
            'transactions_found': attempt.transactions_extracted,
            'confidence': float(attempt.confidence_score),
            'error_message': attempt.error_message,
            'duration': float(attempt.duration_seconds) if attempt.duration_seconds else 0
        } for attempt in attempts]

    def _get_column_mapping_template(self, file_type: str) -> Dict:
        """Get column mapping template for manual correction"""

        if file_type in ['csv', 'excel', 'xlsx']:
            return {
                'required_fields': ['date', 'amount', 'description'],
                'optional_fields': ['debit', 'credit', 'balance', 'category', 'merchant'],
                'field_descriptions': {
                    'date': 'Transaction date',
                    'amount': 'Transaction amount (positive)',
                    'description': 'Transaction description',
                    'debit': 'Debit amount (outgoing)',
                    'credit': 'Credit amount (incoming)',
                    'balance': 'Account balance after transaction'
                }
            }
        else:
            return {}

    def _get_regex_pattern_examples(self, file_type: str) -> List[Dict]:
        """Get regex pattern examples for manual creation"""

        if file_type == 'pdf':
            return [
                {
                    'name': 'Date Amount Description',
                    'pattern': r'(\d{1,2}/\d{1,2}/\d{4})\s+(.+?)\s+(\$[\d,]+\.\d{2})',
                    'description': 'Matches: 12/31/2023 WALMART $45.67',
                    'groups': {'1': 'date', '2': 'description', '3': 'amount'}
                },
                {
                    'name': 'Date Description Debit Credit',
                    'pattern': r'(\d{1,2}/\d{1,2}/\d{4})\s+(.+?)\s+(\$[\d,]*\.?\d*)\s+(\$[\d,]*\.?\d*)',
                    'description': 'Matches debit/credit format',
                    'groups': {'1': 'date', '2': 'description', '3': 'debit', '4': 'credit'}
                }
            ]
        else:
            return []

    def update_daily_metrics(self, date=None):
        """Update daily parsing metrics"""
        ParsingMetrics.update_daily_metrics(self.user, date)

    def get_parsing_performance_summary(self, days: int = 30) -> Dict[str, Any]:
        """Get parsing performance summary for the last N days"""

        from django.utils import timezone
        from django.db.models import Sum, Avg, Count

        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)

        metrics = ParsingMetrics.objects.filter(
            user=self.user,
            date__range=[start_date, end_date]
        )

        if not metrics.exists():
            return {'error': 'No parsing metrics available'}

        summary = metrics.aggregate(
            total_ui_attempts=Sum('ui_extraction_attempts'),
            total_ui_successes=Sum('ui_extraction_successes'),
            total_regex_attempts=Sum('regex_attempts'),
            total_regex_successes=Sum('regex_successes'),
            total_ai_attempts=Sum('ai_attempts'),
            total_ai_successes=Sum('ai_successes'),
            total_manual_corrections=Sum('manual_corrections'),
            avg_confidence=Avg('avg_confidence_score'),
            avg_parsing_time=Avg('avg_parsing_time'),
            total_patterns_learned=Sum('new_patterns_learned'),
            total_dataset_entries=Sum('dataset_entries_added')
        )

        # Calculate success rates
        ui_success_rate = 0
        if summary['total_ui_attempts']:
            ui_success_rate = summary['total_ui_successes'] / summary['total_ui_attempts']

        regex_success_rate = 0
        if summary['total_regex_attempts']:
            regex_success_rate = summary['total_regex_successes'] / summary['total_regex_attempts']

        ai_success_rate = 0
        if summary['total_ai_attempts']:
            ai_success_rate = summary['total_ai_successes'] / summary['total_ai_attempts']

        return {
            'period_days': days,
            'method_performance': {
                'ui_column_extraction': {
                    'attempts': summary['total_ui_attempts'] or 0,
                    'successes': summary['total_ui_successes'] or 0,
                    'success_rate': ui_success_rate
                },
                'regex_patterns': {
                    'attempts': summary['total_regex_attempts'] or 0,
                    'successes': summary['total_regex_successes'] or 0,
                    'success_rate': regex_success_rate
                },
                'ai_parsing': {
                    'attempts': summary['total_ai_attempts'] or 0,
                    'successes': summary['total_ai_successes'] or 0,
                    'success_rate': ai_success_rate
                }
            },
            'overall_metrics': {
                'manual_corrections': summary['total_manual_corrections'] or 0,
                'avg_confidence': float(summary['avg_confidence'] or 0),
                'avg_parsing_time': float(summary['avg_parsing_time'] or 0),
                'patterns_learned': summary['total_patterns_learned'] or 0,
                'dataset_entries': summary['total_dataset_entries'] or 0
            }
        }

    def _parse_amount(self, amount_str: str) -> float:
        """Parse amount string to float, handling various formats"""
        if not amount_str:
            return 0.0

        # Clean the amount string
        amount_str = str(amount_str).strip()

        # Remove common currency symbols and separators
        amount_str = re.sub(r'[₹$£€¥,\s]', '', amount_str)

        # Handle negative amounts in parentheses
        if amount_str.startswith('(') and amount_str.endswith(')'):
            amount_str = '-' + amount_str[1:-1]

        try:
            return float(amount_str)
        except (ValueError, TypeError):
            return 0.0

    def _normalize_transaction_type(self, type_str: str) -> str:
        """Normalize transaction type to standard values"""
        if not type_str:
            return 'unknown'

        type_str = str(type_str).lower().strip()

        if type_str in ['debit', 'dr', 'withdrawal', 'expense', 'payment']:
            return 'debit'
        elif type_str in ['credit', 'cr', 'deposit', 'income', 'refund']:
            return 'credit'
        else:
            return 'unknown'