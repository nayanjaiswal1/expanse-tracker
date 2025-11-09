from __future__ import annotations

import json
from pathlib import Path
from typing import List, Optional

from django.core.management.base import BaseCommand, CommandError

from training.pipeline import EmailTrainingPipeline


class Command(BaseCommand):
    help = "Build datasets from fetched emails and optionally train a baseline parser model."

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Maximum number of RawEmail records to process.",
        )
        parser.add_argument(
            "--include-html",
            action="store_true",
            help="Keep HTML bodies in exported dataset.",
        )
        parser.add_argument(
            "--no-export",
            action="store_true",
            help="Skip writing the dataset to disk.",
        )
        parser.add_argument(
            "--train",
            action="store_true",
            help="Train the baseline transactional classifier.",
        )
        parser.add_argument(
            "--artifacts-dir",
            type=str,
            help="Override the directory for dataset/model artifacts.",
        )
        parser.add_argument(
            "--account-ids",
            type=str,
            help="Comma-separated list of GmailAccount IDs to fetch before building the dataset.",
        )
        parser.add_argument(
            "--force-fetch",
            action="store_true",
            help="Bypass throttling when fetching emails from Gmail.",
        )
        parser.add_argument(
            "--fetch-only",
            action="store_true",
            help="Fetch new emails and exit without building a dataset.",
        )
        parser.add_argument(
            "--test-size",
            type=float,
            default=0.2,
            help="Test split fraction for the baseline classifier.",
        )
        parser.add_argument(
            "--random-state",
            type=int,
            default=42,
            help="Random seed for train/test split.",
        )

    def handle(self, *args, **options):
        artifacts_path = Path(options["artifacts_dir"]).expanduser().resolve() if options.get("artifacts_dir") else None
        pipeline = EmailTrainingPipeline(artifacts_dir=artifacts_path)

        account_ids = self._parse_account_ids(options.get("account_ids"))
        if account_ids is not None or options["fetch_only"]:
            fetch_result = pipeline.fetch_new_emails(
                account_ids=account_ids,
                limit=options.get("limit") or 200,
                force=options["force_fetch"],
            )
            self._write_json("Fetch summary", fetch_result)
            if options["fetch_only"]:
                return

        dataset = pipeline.build_dataset(
            limit=options.get("limit"),
            include_html=options.get("include_html", False),
        )
        self.stdout.write(self.style.SUCCESS(f"Built dataset with {len(dataset)} records."))

        if not options["no_export"]:
            dataset_path = pipeline.export_dataset(dataset=dataset)
            self.stdout.write(self.style.SUCCESS(f"Dataset exported to {dataset_path}"))

        if options["train"]:
            try:
                result = pipeline.train_baseline_classifier(
                    dataset=dataset,
                    test_size=options["test_size"],
                    random_state=options["random_state"],
                )
            except RuntimeError as exc:
                raise CommandError(str(exc))

            metrics_path = self._write_metrics(pipeline, result)
            self.stdout.write(self.style.SUCCESS("Baseline classifier trained."))
            if result.model_path:
                self.stdout.write(f"Model saved to: {result.model_path}")
            if metrics_path:
                self.stdout.write(f"Metrics saved to: {metrics_path}")

    def _parse_account_ids(self, raw: Optional[str]) -> Optional[List[int]]:
        if not raw:
            return None
        try:
            return [int(value.strip()) for value in raw.split(",") if value.strip()]
        except ValueError as exc:
            raise CommandError(f"Invalid account id list: {raw}") from exc

    def _write_json(self, label: str, payload):
        formatted = json.dumps(payload, indent=2, default=str)
        self.stdout.write(f"{label}:\n{formatted}")

    def _write_metrics(self, pipeline: EmailTrainingPipeline, result) -> Optional[Path]:
        if not result.metrics:
            return None
        metrics_dir = result.model_path.parent if result.model_path else pipeline.artifacts_dir
        metrics_path = metrics_dir / "baseline_metrics.json"
        with metrics_path.open("w", encoding="utf-8") as handle:
            json.dump(result.metrics, handle, indent=2)
        return metrics_path
