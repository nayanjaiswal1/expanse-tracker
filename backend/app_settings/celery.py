"""
Celery configuration for app_settings project.
"""

import os
from celery import Celery

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "app_settings.settings")

app = Celery("app_settings")

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Load task modules from all registered Django apps.
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f"Request: {self.request!r}")


# ============================================================================
# Celery Beat Schedule - Automatic AI Email Processing
# ============================================================================

from celery.schedules import crontab

app.conf.beat_schedule = {
    # Process new emails every 30 minutes
    'process-pending-emails-auto': {
        'task': 'training.tasks.process_pending_emails',
        'schedule': crontab(minute='*/30'),  # Every 30 minutes
        'kwargs': {'limit': 100}  # Process 100 emails at a time
    },

    # Merge transactions every 2 hours
    'merge-transactions-auto': {
        'task': 'training.tasks.merge_all_user_transactions',
        'schedule': crontab(minute=0, hour='*/2'),  # Every 2 hours
        'kwargs': {'limit_per_user': 500}
    },

    # Generate training dataset weekly on Sunday at 2 AM
    'weekly-training-dataset-auto': {
        'task': 'training.tasks.periodic_training_dataset_generation',
        'schedule': crontab(day_of_week=0, hour=2, minute=0),
    },
}
