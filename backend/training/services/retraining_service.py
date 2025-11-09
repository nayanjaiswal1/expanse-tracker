"""
Service for generating training datasets from labeled data.
"""

import json
import logging
import os
from pathlib import Path
from typing import Dict, List
from datetime import datetime

from django.conf import settings
from django.db.models import Q

from training.models import AILabel, TrainingDataset

logger = logging.getLogger(__name__)


class RetrainingService:
    """
    Service to export labeled data for model retraining.
    """

    def __init__(self):
        self.training_data_dir = Path(
            getattr(settings, 'TRAINING_DATA_DIR', 'training_data')
        )
        self.training_data_dir.mkdir(parents=True, exist_ok=True)

    def generate_dataset(
        self,
        name: str,
        version: str,
        description: str = "",
        min_confidence: float = 0.7,
        user_verified_only: bool = False
    ) -> TrainingDataset:
        """
        Generate a training dataset from labeled emails.

        Args:
            name: Dataset name
            version: Version string (e.g., "v1.0.0")
            description: Dataset description
            min_confidence: Minimum confidence score to include
            user_verified_only: Only include user-verified labels

        Returns:
            Created TrainingDataset instance
        """
        logger.info(f"Generating training dataset {name} ({version})")

        # Build queryset
        queryset = AILabel.objects.select_related(
            'raw_email'
        ).filter(
            label_confidence__gte=min_confidence
        )

        if user_verified_only:
            queryset = queryset.filter(
                Q(user_verified=True) | Q(user_corrected_label__isnull=False)
            )

        # Count samples by label
        total_samples = queryset.count()
        transaction_samples = queryset.filter(label='TRANSACTION').count()
        non_transaction_samples = total_samples - transaction_samples
        user_verified_count = queryset.filter(user_verified=True).count()
        user_corrected_count = queryset.filter(
            user_corrected_label__isnull=False
        ).count()

        # Generate training data
        training_file = self._export_training_data(
            queryset=queryset,
            dataset_name=name,
            version=version,
            split='train'
        )

        # Generate validation data (10% sample)
        validation_queryset = queryset.order_by('?')[:int(total_samples * 0.1)]
        validation_file = self._export_training_data(
            queryset=validation_queryset,
            dataset_name=name,
            version=version,
            split='validation'
        )

        # Create dataset record
        dataset = TrainingDataset.objects.create(
            name=name,
            version=version,
            description=description,
            total_samples=total_samples,
            transaction_samples=transaction_samples,
            non_transaction_samples=non_transaction_samples,
            user_verified_count=user_verified_count,
            user_corrected_count=user_corrected_count,
            training_file_path=str(training_file),
            validation_file_path=str(validation_file),
            dataset_metadata={
                'min_confidence': min_confidence,
                'user_verified_only': user_verified_only,
                'generated_at': datetime.now().isoformat(),
            }
        )

        logger.info(
            f"Generated dataset {name} ({version}): "
            f"{total_samples} samples "
            f"({transaction_samples} transactions, {non_transaction_samples} non-transactions)"
        )

        return dataset

    def _export_training_data(
        self,
        queryset,
        dataset_name: str,
        version: str,
        split: str
    ) -> Path:
        """
        Export training data to JSONL file.

        Format per line:
        {
            "email_id": 123,
            "subject": "...",
            "body": "...",
            "sender": "...",
            "label": "TRANSACTION",
            "confidence": 0.95,
            "transaction_data": {...},
            "user_verified": true,
            "user_corrected": false
        }

        Args:
            queryset: AILabel queryset
            dataset_name: Dataset name
            version: Version string
            split: 'train' or 'validation'

        Returns:
            Path to generated file
        """
        filename = f"{dataset_name}_{version}_{split}.jsonl"
        filepath = self.training_data_dir / filename

        with open(filepath, 'w', encoding='utf-8') as f:
            for ai_label in queryset:
                # Get effective label and data (user-corrected if available)
                effective_label = ai_label.get_effective_label()
                effective_data = ai_label.get_effective_data()

                # Prepare body text
                body_text = ai_label.raw_email.body_text or ai_label.raw_email.snippet or ""

                record = {
                    'email_id': ai_label.raw_email.id,
                    'subject': ai_label.raw_email.subject,
                    'body': body_text[:5000],  # Limit body length
                    'sender': ai_label.raw_email.sender,
                    'label': effective_label,
                    'confidence': float(ai_label.label_confidence),
                    'transaction_data': effective_data if effective_label == 'TRANSACTION' else None,
                    'user_verified': ai_label.user_verified,
                    'user_corrected': bool(ai_label.user_corrected_label or ai_label.user_corrected_data),
                    'extraction_model': ai_label.extraction_model,
                    'prompt_version': ai_label.extraction_prompt_version,
                }

                f.write(json.dumps(record, ensure_ascii=False) + '\n')

        logger.info(f"Exported {queryset.count()} samples to {filepath}")
        return filepath

    def export_for_finetuning(
        self,
        dataset_version: str,
        format: str = 'openai'
    ) -> Path:
        """
        Export dataset in format suitable for LLM fine-tuning.

        Args:
            dataset_version: TrainingDataset version to export
            format: 'openai' or 'jsonl'

        Returns:
            Path to generated fine-tuning file
        """
        dataset = TrainingDataset.objects.get(version=dataset_version)

        # Read training data
        with open(dataset.training_file_path, 'r', encoding='utf-8') as f:
            training_data = [json.loads(line) for line in f]

        if format == 'openai':
            return self._export_openai_format(training_data, dataset)
        else:
            # Already in JSONL format
            return Path(dataset.training_file_path)

    def _export_openai_format(
        self,
        training_data: List[Dict],
        dataset: TrainingDataset
    ) -> Path:
        """
        Export in OpenAI fine-tuning format.

        Format:
        {"messages": [
            {"role": "system", "content": "..."},
            {"role": "user", "content": "..."},
            {"role": "assistant", "content": "..."}
        ]}

        Args:
            training_data: List of training records
            dataset: TrainingDataset instance

        Returns:
            Path to OpenAI-format file
        """
        from training.services.prompts import get_prompts

        filename = f"openai_finetune_{dataset.version}.jsonl"
        filepath = self.training_data_dir / filename

        # Get latest prompt version
        prompts = get_prompts('v2')
        system_prompt = prompts['system_prompt']

        with open(filepath, 'w', encoding='utf-8') as f:
            for record in training_data:
                # Build user message
                user_content = f"""Analyze this email:

**Sender:** {record['sender']}
**Subject:** {record['subject']}

**Email Content:**
{record['body']}

Extract transaction information if this is a financial transaction email. Return JSON only."""

                # Build assistant response (ground truth)
                assistant_response = {
                    'label': record['label'],
                    'confidence': record['confidence'],
                    'transaction_data': record.get('transaction_data')
                }

                openai_record = {
                    'messages': [
                        {'role': 'system', 'content': system_prompt},
                        {'role': 'user', 'content': user_content},
                        {'role': 'assistant', 'content': json.dumps(assistant_response)}
                    ]
                }

                f.write(json.dumps(openai_record, ensure_ascii=False) + '\n')

        logger.info(f"Exported {len(training_data)} samples to OpenAI format: {filepath}")
        return filepath
