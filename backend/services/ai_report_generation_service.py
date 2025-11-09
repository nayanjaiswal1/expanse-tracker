from typing import Dict, Any
from django.template.loader import render_to_string
from django.http import HttpResponse
from django.utils import timezone

# For PDF generation
# from weasyprint import HTML  # Import HTML from weasyprint


class ReportGenerationService:
    def __init__(self):
        pass

    def generate_ai_usage_report(
        self, user, usage_data: Dict[str, Any], format: str = "pdf"
    ) -> Any:
        """Generates a report on AI usage for a user."""
        context = {
            "user": user,
            "usage_data": usage_data,
            "report_date": timezone.now().strftime("%Y-%m-%d"),
        }
        html_content = render_to_string("reports/ai_usage_report.html", context)

        if format == "pdf":
            try:
                pdf_file = HTML(string=html_content).write_pdf()
                response = HttpResponse(pdf_file, content_type="application/pdf")
                response["Content-Disposition"] = (
                    'attachment; filename="ai_usage_report.pdf"'
                )
                return response
            except Exception as e:
                print(f"Error generating PDF report: {e}")
                return HttpResponse(f"Error generating PDF: {e}", status=500)
        elif format == "html":
            return HttpResponse(html_content, content_type="text/html")
        else:
            raise ValueError(f"Unsupported report format: {format}")

    def generate_financial_summary_report(
        self, user, summary_data: Dict[str, Any], format: str = "pdf"
    ) -> Any:
        """Generates a financial summary report for a user."""
        context = {
            "user": user,
            "summary_data": summary_data,
            "report_date": timezone.now().strftime("%Y-%m-%d"),
        }
        html_content = render_to_string(
            "reports/financial_summary_report.html", context
        )

        if format == "pdf":
            try:
                pdf_file = HTML(string=html_content).write_pdf()
                response = HttpResponse(pdf_file, content_type="application/pdf")
                response["Content-Disposition"] = (
                    'attachment; filename="financial_summary_report.pdf"'
                )
                return response
            except Exception as e:
                print(f"Error generating PDF report: {e}")
                return HttpResponse(f"Error generating PDF: {e}", status=500)
        elif format == "html":
            return HttpResponse(html_content, content_type="text/html")
        else:
            raise ValueError(f"Unsupported report format: {format}")


# Global instance
report_generation_service = ReportGenerationService()
