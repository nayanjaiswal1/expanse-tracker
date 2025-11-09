"""
URL patterns for enhanced upload functionality.
Add these to your main finance URLs.
"""

from django.urls import path
from .views.enhanced_upload_views import (
    enhanced_file_upload,
    import_parsed_transactions,
    get_upload_session_details,
    retry_password_protected_file,
    get_user_categories,
    auto_detect_account,
    retry_file_processing,
    get_upload_history,
    get_statement_transactions
)

enhanced_upload_patterns = [
    # Enhanced file upload endpoint
    path('enhanced-upload/', enhanced_file_upload, name='enhanced_file_upload'),

    # Import verified transactions
    path('upload-sessions/<int:session_id>/import/', import_parsed_transactions, name='import_parsed_transactions'),

    # Get upload session details
    path('upload-sessions/<int:session_id>/details/', get_upload_session_details, name='get_upload_session_details'),

    # Retry password-protected files
    path('upload-sessions/<int:session_id>/retry/', retry_password_protected_file, name='retry_password_protected_file'),

    # Retry failed file processing
    path('upload-sessions/<int:session_id>/retry-processing/', retry_file_processing, name='retry_file_processing'),

    # Get user upload history
    path('upload-sessions/history/', get_upload_history, name='get_upload_history'),

    # Get transactions by statement/upload session
    path('upload-sessions/<int:session_id>/transactions/', get_statement_transactions, name='get_statement_transactions'),

    # Get user categories for transaction categorization
    path('categories/user/', get_user_categories, name='get_user_categories'),

    # Auto-detect account from transaction data
    path('auto-detect-account/', auto_detect_account, name='auto_detect_account'),
]

# To be added to main finance/urls.py:
# from .urls_enhanced_upload import enhanced_upload_patterns
# urlpatterns += enhanced_upload_patterns