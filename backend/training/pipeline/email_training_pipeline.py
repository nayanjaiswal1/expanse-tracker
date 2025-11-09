from __future__ import annotations

import json
import logging
import pickle
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

from django.conf import settings

from .email_dataset_builder import EmailDatasetBuilder

logger = logging.getLogger(__name__)


@dataclass
class BaselineTrainingResult:
    model_path: Optional[Path]
    metrics: Dict[str, Any]
    train_size: int
    test_size: int


class EmailTrainingPipeline:
    """
    End-to-end pipeline scaffold for training ML models that parse transaction emails.

    Workflow:
      1. Ensure ingestion has stored RawEmail objects (handled by services).
      2. Build a structured dataset via EmailDatasetBuilder.
      3. (Optional) Export dataset for annotation or external tooling.
      4. Train a baseline model that can replace regex heuristics.
    """

    def __init__(
        self,
        dataset_builder: Optional[EmailDatasetBuilder] = None,
        artifacts_dir: Optional[Path] = None,
    ) -> None:
        self.dataset_builder = dataset_builder or EmailDatasetBuilder()
        self.artifacts_dir = artifacts_dir or Path(
            getattr(settings, "TRAINING_ARTIFACTS_DIR", settings.BASE_DIR / "training_artifacts")
        )
        self.artifacts_dir.mkdir(parents=True, exist_ok=True)
        self._dataset_cache: Optional[List[Dict[str, Any]]] = None

    # ------------------------------------------------------------------
    # Data ingestion
    # ------------------------------------------------------------------
    def fetch_new_emails(
        self,
        account_ids: Optional[Sequence[int]] = None,
        limit: int = 200,
        force: bool = False,
    ) -> Dict[str, Any]:
        """
        Trigger email ingestion using the central services coordinator.

        Args:
            account_ids: Optional subset of GmailAccount IDs to sync.
            limit: Maximum emails per account.
            force: Whether to bypass throttle safeguards.
        """
        from services.services.email_ingestion_service import EmailIngestionCoordinator

        coordinator = EmailIngestionCoordinator(limit=limit, force=force)
        return coordinator.sync_accounts(account_ids=account_ids)

    # ------------------------------------------------------------------
    # Dataset generation
    # ------------------------------------------------------------------
    def build_dataset(
        self,
        limit: Optional[int] = None,
        include_html: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Create dataset records from RawEmail storage.

        Args:
            limit: Optional cap on number of records.
            include_html: Whether to keep raw HTML bodies (default False).
        """
        dataset = self.dataset_builder.as_records(limit=limit, include_html=include_html)
        self._dataset_cache = dataset
        return dataset

    def export_dataset(
        self,
        filename: str = "email_training_dataset.jsonl",
        dataset: Optional[List[Dict[str, Any]]] = None,
    ) -> Path:
        """
        Persist dataset to disk as JSON Lines for annotation or model training.
        """
        dataset = dataset or self._dataset_cache or self.build_dataset()
        output_path = self.artifacts_dir / filename

        with output_path.open("w", encoding="utf-8") as handle:
            for row in dataset:
                handle.write(json.dumps(row, ensure_ascii=False) + "\n")

        logger.info("Exported email dataset to %s", output_path)
        return output_path

    # ------------------------------------------------------------------
    # Baseline training
    # ------------------------------------------------------------------
    def train_baseline_classifier(
        self,
        dataset: Optional[List[Dict[str, Any]]] = None,
        test_size: float = 0.2,
        random_state: int = 42,
        persist_model: bool = True,
    ) -> BaselineTrainingResult:
        """
        Train a lightweight classifier that predicts whether an email is transactional.

        This serves as an initial ML replacement for the regex-based `is_transaction`
        heuristic and can be swapped with more advanced architectures later.
        """
        dataset = dataset or self._dataset_cache or self.build_dataset()
        if not dataset:
            raise ValueError("Dataset is empty. Build or supply dataset before training.")

        texts, labels = self._build_classification_inputs(dataset)
        if not texts:
            raise ValueError("Classification dataset has no valid samples.")

        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.linear_model import LogisticRegression
            from sklearn.metrics import classification_report
            from sklearn.model_selection import train_test_split
            from sklearn.pipeline import Pipeline
        except ImportError as exc:  # pragma: no cover - optional dependency
            raise RuntimeError(
                "scikit-learn is required for the baseline classifier. "
                "Install it via `pip install scikit-learn`."
            ) from exc

        X_train, X_test, y_train, y_test = train_test_split(
            texts,
            labels,
            test_size=test_size,
            random_state=random_state,
            stratify=labels if len(set(labels)) > 1 else None,
        )

        pipeline = Pipeline(
            steps=[
                ("tfidf", TfidfVectorizer(max_features=5000)),
                ("clf", LogisticRegression(max_iter=1000)),
            ]
        )
        pipeline.fit(X_train, y_train)

        y_pred = pipeline.predict(X_test)
        report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)

        model_path: Optional[Path] = None
        if persist_model:
            model_path = self._persist_model(pipeline)

        metrics = {
            "macro_f1": report.get("macro avg", {}).get("f1-score"),
            "weighted_f1": report.get("weighted avg", {}).get("f1-score"),
            "accuracy": report.get("accuracy"),
            "detail": report,
        }

        return BaselineTrainingResult(
            model_path=model_path,
            metrics=metrics,
            train_size=len(X_train),
            test_size=len(X_test),
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _build_classification_inputs(
        self, dataset: List[Dict[str, Any]]
    ) -> Tuple[List[str], List[int]]:
        """Prepare features and labels for the baseline classifier."""
        texts: List[str] = []
        labels: List[int] = []

        for row in dataset:
            subject = row.get("subject") or ""
            snippet = row.get("snippet") or ""
            body = row.get("body_text") or ""
            text = "\n".join(filter(None, [subject, snippet, body])).strip()

            label = row.get("is_transaction")
            if label is None:
                user_label = (row.get("labels") or {}).get("user_label")
                if user_label == "transaction":
                    label = 1
                elif user_label == "non_transaction":
                    label = 0

            if label is None:
                label = bool(row.get("labels", {}).get("label_count"))

            if not text or label is None:
                continue

            texts.append(text)
            labels.append(int(bool(label)))

        return texts, labels

    def _persist_model(self, model: Any, filename: str = "baseline_classifier.pkl") -> Path:
        """Store trained model artifact for later inference or evaluation."""
        output_path = self.artifacts_dir / filename
        with output_path.open("wb") as handle:
            pickle.dump(model, handle)
        logger.info("Saved baseline classifier to %s", output_path)
        return output_path
