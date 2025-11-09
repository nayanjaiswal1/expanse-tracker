"""
API views for multi-level parsing system with progressive fallback strategies.
"""

from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction
from typing import Dict, List, Any
import json

from ..models import (
    UploadSession, ParsingAttempt, ColumnMapping, RegexPattern,
    LearningDataset, ParsingMetrics, Account, Category
)
from ..services.multi_level_parsing_service import MultiLevelParsingService


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def multi_level_parse_file(request, session_id):
    """
    Parse a file using the multi-level parsing system with progressive fallback.

    Body parameters:
    - password: Optional password for encrypted files
    - force_method: Optional method to force ('ui_column_extraction', 'regex_patterns', 'ai_parsing')
    - max_attempts: Maximum number of parsing attempts (default: 4)
    """

    try:
        upload_session = get_object_or_404(
            UploadSession,
            id=session_id,
            user=request.user
        )

        password = request.data.get('password')
        force_method = request.data.get('force_method')
        max_attempts = request.data.get('max_attempts', 4)

        # Initialize multi-level parsing service
        parsing_service = MultiLevelParsingService(request.user)

        # Attempt parsing with progressive fallback
        result = parsing_service.parse_statement_progressive(
            upload_session,
            password=password,
            force_method=force_method,
            max_attempts=max_attempts
        )

        if result.success:
            # Update session with results
            upload_session.total_transactions = len(result.transactions)
            upload_session.mark_completed()

            response_data = {
                'success': True,
                'parsing_method': result.method,
                'total_transactions': len(result.transactions),
                'transactions': result.transactions,
                'confidence': result.confidence,
                'parsing_time': result.parsing_time,
                'metadata': result.metadata,
                'session_id': upload_session.id
            }

            return Response(response_data, status=status.HTTP_200_OK)
        else:
            # Check if manual correction is needed
            if result.method == 'manual_correction':
                # Provide manual correction interface data
                manual_data = parsing_service.create_manual_correction_interface_data(upload_session)

                return Response({
                    'success': False,
                    'requires_manual_correction': True,
                    'error': result.error_message,
                    'manual_correction_data': manual_data,
                    'session_id': upload_session.id
                }, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({
                    'success': False,
                    'error': result.error_message,
                    'parsing_method': result.method,
                    'session_id': upload_session.id
                }, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        return Response(
            {'error': f'Multi-level parsing failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def submit_manual_column_mapping(request, session_id):
    """
    Submit manual column mapping for CSV/Excel files.

    Body parameters:
    - column_mappings: Dict mapping field types to column names/indices
    - sample_data: Optional sample data for validation
    """

    try:
        upload_session = get_object_or_404(
            UploadSession,
            id=session_id,
            user=request.user
        )

        column_mappings = request.data.get('column_mappings', {})
        sample_data = request.data.get('sample_data', [])

        if not column_mappings:
            return Response(
                {'error': 'Column mappings are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create a parsing attempt for manual column mapping
        parsing_attempt = ParsingAttempt.objects.create(
            user=request.user,
            upload_session=upload_session,
            parsing_method='ui_column_extraction',
            attempt_order=ParsingAttempt.objects.filter(upload_session=upload_session).count() + 1,
            status='in_progress'
        )

        # Store column mappings
        for field_type, column_info in column_mappings.items():
            if isinstance(column_info, dict):
                column_name = column_info.get('name', '')
                column_index = column_info.get('index')
            else:
                column_name = str(column_info)
                column_index = None

            if column_name:
                ColumnMapping.objects.create(
                    user=request.user,
                    parsing_attempt=parsing_attempt,
                    file_type=upload_session.file_type,
                    source_column_name=column_name,
                    source_column_index=column_index,
                    mapped_field_type=field_type,
                    confidence_score=1.0,  # Manual mapping has full confidence
                    is_user_confirmed=True,
                    sample_values=sample_data[:10] if sample_data else []
                )

        # Initialize parsing service and attempt parsing with manual mappings
        parsing_service = MultiLevelParsingService(request.user)

        try:
            # Apply manual column mappings and extract transactions
            if upload_session.file_type == 'csv':
                result = parsing_service.enhanced_service._process_csv_enhanced(
                    upload_session, upload_session.file_content
                )
            elif upload_session.file_type in ['excel', 'xlsx']:
                result = parsing_service.enhanced_service._process_excel_enhanced(
                    upload_session, upload_session.file_content
                )
            else:
                raise ValueError(f"Manual column mapping not supported for {upload_session.file_type}")

            # Override column mapping with manual ones
            result['column_mapping'] = {
                field_type: mapping.source_column_name
                for field_type, mapping in column_mappings.items()
            }

            if result.get('success'):
                parsing_attempt.mark_completed(
                    status='success',
                    transactions_count=len(result.get('parsed_transactions', [])),
                    confidence=1.0
                )

                # Create learning dataset entry
                LearningDataset.objects.create(
                    user=request.user,
                    dataset_type='user_correction',
                    upload_session=upload_session,
                    parsing_attempt=parsing_attempt,
                    raw_text_content=str(sample_data)[:1000],
                    file_type=upload_session.file_type,
                    expected_transactions=result.get('parsed_transactions', []),
                    column_mappings=column_mappings,
                    is_validated=True,
                    quality_score=1.0
                )

                upload_session.total_transactions = len(result.get('parsed_transactions', []))
                upload_session.mark_completed()

                return Response({
                    'success': True,
                    'parsing_method': 'manual_column_mapping',
                    'total_transactions': len(result.get('parsed_transactions', [])),
                    'transactions': result.get('parsed_transactions', []),
                    'confidence': 1.0,
                    'column_mappings': column_mappings
                }, status=status.HTTP_200_OK)
            else:
                parsing_attempt.mark_completed(
                    status='failed',
                    error_msg=result.get('error', 'Manual column mapping failed')
                )

                return Response({
                    'success': False,
                    'error': result.get('error', 'Manual column mapping failed')
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            parsing_attempt.mark_completed(status='failed', error_msg=str(e))
            raise

    except Exception as e:
        return Response(
            {'error': f'Manual column mapping failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_custom_regex_pattern(request):
    """
    Create a custom regex pattern for parsing.

    Body parameters:
    - pattern_name: Name for the pattern
    - regex_pattern: The regex pattern string
    - file_type: File type this pattern applies to
    - institution_name: Optional institution name for specificity
    - group_mappings: Dict mapping group numbers to field types
    - description: Optional description
    """

    try:
        pattern_name = request.data.get('pattern_name')
        regex_pattern = request.data.get('regex_pattern')
        file_type = request.data.get('file_type')
        institution_name = request.data.get('institution_name', '')
        group_mappings = request.data.get('group_mappings', {})
        description = request.data.get('description', '')

        if not all([pattern_name, regex_pattern, file_type]):
            return Response(
                {'error': 'pattern_name, regex_pattern, and file_type are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate regex pattern
        import re
        try:
            re.compile(regex_pattern)
        except re.error as e:
            return Response(
                {'error': f'Invalid regex pattern: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create regex pattern
        pattern = RegexPattern.objects.create(
            user=request.user,
            pattern_name=pattern_name,
            regex_pattern=regex_pattern,
            description=description,
            file_type=file_type,
            institution_name=institution_name,
            group_mappings=group_mappings,
            is_built_in=False,
            priority=100  # User patterns get lower priority initially
        )

        return Response({
            'success': True,
            'pattern_id': pattern.id,
            'pattern_name': pattern.pattern_name,
            'message': 'Custom regex pattern created successfully'
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response(
            {'error': f'Failed to create regex pattern: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def test_regex_pattern(request):
    """
    Test a regex pattern against sample text.

    Body parameters:
    - regex_pattern: The regex pattern to test
    - test_text: Sample text to test against
    - group_mappings: Optional group mappings
    """

    try:
        regex_pattern = request.data.get('regex_pattern')
        test_text = request.data.get('test_text')
        group_mappings = request.data.get('group_mappings', {})

        if not all([regex_pattern, test_text]):
            return Response(
                {'error': 'regex_pattern and test_text are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Test regex pattern
        import re
        try:
            pattern = re.compile(regex_pattern)
            matches = []

            for line in test_text.split('\n'):
                line = line.strip()
                if line:
                    match = pattern.search(line)
                    if match:
                        match_data = {
                            'line': line,
                            'groups': match.groups(),
                            'extracted_data': {}
                        }

                        # Apply group mappings if provided
                        if group_mappings:
                            for group_num, field_type in group_mappings.items():
                                group_idx = int(group_num) - 1
                                if group_idx < len(match.groups()):
                                    match_data['extracted_data'][field_type] = match.groups()[group_idx]

                        matches.append(match_data)

            return Response({
                'success': True,
                'matches_found': len(matches),
                'matches': matches[:10],  # Limit to first 10 matches
                'pattern_valid': True
            }, status=status.HTTP_200_OK)

        except re.error as e:
            return Response({
                'success': False,
                'pattern_valid': False,
                'error': f'Invalid regex pattern: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        return Response(
            {'error': f'Pattern testing failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_parsing_attempts(request, session_id):
    """Get all parsing attempts for a session."""

    try:
        upload_session = get_object_or_404(
            UploadSession,
            id=session_id,
            user=request.user
        )

        parsing_service = MultiLevelParsingService(request.user)
        attempts_summary = parsing_service._get_parsing_attempt_summary(upload_session)

        return Response({
            'session_id': upload_session.id,
            'attempts': attempts_summary
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Failed to get parsing attempts: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_user_regex_patterns(request):
    """Get all regex patterns for the authenticated user."""

    try:
        file_type = request.GET.get('file_type')
        institution = request.GET.get('institution')

        patterns = RegexPattern.objects.filter(user=request.user, is_active=True)

        if file_type:
            patterns = patterns.filter(file_type=file_type)

        if institution:
            patterns = patterns.filter(institution_name__icontains=institution)

        patterns = patterns.order_by('priority', '-confidence_score')

        pattern_data = []
        for pattern in patterns:
            pattern_data.append({
                'id': pattern.id,
                'pattern_name': pattern.pattern_name,
                'regex_pattern': pattern.regex_pattern,
                'file_type': pattern.file_type,
                'institution_name': pattern.institution_name,
                'confidence_score': float(pattern.confidence_score),
                'success_count': pattern.success_count,
                'failure_count': pattern.failure_count,
                'is_built_in': pattern.is_built_in,
                'group_mappings': pattern.group_mappings,
                'description': pattern.description
            })

        return Response(pattern_data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Failed to get regex patterns: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_column_mapping_suggestions(request, session_id):
    """Get column mapping suggestions based on file content and learned patterns."""

    try:
        upload_session = get_object_or_404(
            UploadSession,
            id=session_id,
            user=request.user
        )

        if upload_session.file_type not in ['csv', 'excel', 'xlsx']:
            return Response(
                {'error': 'Column mapping only available for CSV and Excel files'},
                status=status.HTTP_400_BAD_REQUEST
            )

        parsing_service = MultiLevelParsingService(request.user)

        # Extract file headers/columns
        if upload_session.file_type == 'csv':
            import csv
            import io

            content = upload_session.file_content.decode('utf-8', errors='ignore')
            csv_file = io.StringIO(content)
            reader = csv.DictReader(csv_file)
            columns = reader.fieldnames or []

            # Get sample data
            sample_rows = []
            for i, row in enumerate(reader):
                if i >= 5:  # First 5 rows
                    break
                sample_rows.append(dict(row))

        elif upload_session.file_type in ['excel', 'xlsx']:
            import pandas as pd
            import io

            excel_file = io.BytesIO(upload_session.file_content)
            df = pd.read_excel(excel_file, sheet_name=0)
            columns = df.columns.tolist()

            # Get sample data
            sample_rows = df.head(5).to_dict('records')

        # Get mapping suggestions using enhanced service logic
        column_mapping = parsing_service.enhanced_service._detect_csv_column_mapping(columns)

        # Get learned mappings from previous successful attempts
        learned_mappings = ColumnMapping.objects.filter(
            user=request.user,
            file_type=upload_session.file_type,
            is_user_confirmed=True
        ).values('source_column_name', 'mapped_field_type', 'confidence_score').distinct()

        return Response({
            'columns': columns,
            'sample_data': sample_rows,
            'suggested_mappings': column_mapping,
            'learned_mappings': list(learned_mappings),
            'mapping_template': parsing_service._get_column_mapping_template(upload_session.file_type)
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Failed to get column mapping suggestions: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_parsing_performance(request):
    """Get parsing performance metrics for the user."""

    try:
        days = int(request.GET.get('days', 30))

        parsing_service = MultiLevelParsingService(request.user)
        performance_data = parsing_service.get_parsing_performance_summary(days)

        return Response(performance_data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Failed to get parsing performance: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def submit_manual_annotation(request, session_id):
    """
    Submit manual transaction annotations for learning.

    Body parameters:
    - annotations: List of manually annotated transactions
    - text_content: The source text content
    - validation_notes: Optional notes about the annotation quality
    """

    try:
        upload_session = get_object_or_404(
            UploadSession,
            id=session_id,
            user=request.user
        )

        annotations = request.data.get('annotations', [])
        text_content = request.data.get('text_content', '')
        validation_notes = request.data.get('validation_notes', '')

        if not annotations:
            return Response(
                {'error': 'Annotations are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create learning dataset entry
        learning_entry = LearningDataset.objects.create(
            user=request.user,
            dataset_type='manual_annotation',
            upload_session=upload_session,
            raw_text_content=text_content,
            file_type=upload_session.file_type,
            expected_transactions=annotations,
            is_validated=True,
            validation_notes=validation_notes,
            quality_score=1.0,  # Manual annotations get highest quality score
            training_weight=2.0  # Give more weight to manual annotations
        )

        # Create a parsing attempt record for manual annotation
        parsing_attempt = ParsingAttempt.objects.create(
            user=request.user,
            upload_session=upload_session,
            parsing_method='manual_correction',
            attempt_order=ParsingAttempt.objects.filter(upload_session=upload_session).count() + 1,
            status='success',
            transactions_extracted=len(annotations),
            confidence_score=1.0
        )

        learning_entry.parsing_attempt = parsing_attempt
        learning_entry.save()

        return Response({
            'success': True,
            'learning_entry_id': learning_entry.id,
            'annotations_count': len(annotations),
            'message': 'Manual annotations submitted successfully'
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response(
            {'error': f'Failed to submit manual annotation: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def delete_regex_pattern(request, pattern_id):
    """Delete a user's regex pattern."""

    try:
        pattern = get_object_or_404(
            RegexPattern,
            id=pattern_id,
            user=request.user,
            is_built_in=False  # Only allow deletion of user-created patterns
        )

        pattern_name = pattern.pattern_name
        pattern.delete()

        return Response({
            'success': True,
            'message': f'Regex pattern "{pattern_name}" deleted successfully'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Failed to delete regex pattern: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )