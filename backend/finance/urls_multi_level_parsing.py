"""
URL patterns for multi-level parsing API endpoints.
"""

from django.urls import path
from .views import multi_level_parsing_views

multi_level_parsing_patterns = [
    # Multi-level parsing endpoints
    path(
        'sessions/<int:session_id>/multi-level-parse/',
        multi_level_parsing_views.multi_level_parse_file,
        name='multi_level_parse_file'
    ),

    # Manual column mapping
    path(
        'sessions/<int:session_id>/manual-column-mapping/',
        multi_level_parsing_views.submit_manual_column_mapping,
        name='submit_manual_column_mapping'
    ),

    path(
        'sessions/<int:session_id>/column-mapping-suggestions/',
        multi_level_parsing_views.get_column_mapping_suggestions,
        name='get_column_mapping_suggestions'
    ),

    # Regex pattern management
    path(
        'regex-patterns/',
        multi_level_parsing_views.get_user_regex_patterns,
        name='get_user_regex_patterns'
    ),

    path(
        'regex-patterns/create/',
        multi_level_parsing_views.create_custom_regex_pattern,
        name='create_custom_regex_pattern'
    ),

    path(
        'regex-patterns/<int:pattern_id>/delete/',
        multi_level_parsing_views.delete_regex_pattern,
        name='delete_regex_pattern'
    ),

    path(
        'regex-patterns/test/',
        multi_level_parsing_views.test_regex_pattern,
        name='test_regex_pattern'
    ),

    # Parsing attempts and performance
    path(
        'sessions/<int:session_id>/parsing-attempts/',
        multi_level_parsing_views.get_parsing_attempts,
        name='get_parsing_attempts'
    ),

    path(
        'parsing-performance/',
        multi_level_parsing_views.get_parsing_performance,
        name='get_parsing_performance'
    ),

    # Manual annotation
    path(
        'sessions/<int:session_id>/manual-annotation/',
        multi_level_parsing_views.submit_manual_annotation,
        name='submit_manual_annotation'
    ),
]