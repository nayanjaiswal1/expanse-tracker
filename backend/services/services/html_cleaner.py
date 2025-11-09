"""
HTML to clean text conversion utility for email processing.
Uses BeautifulSoup4 for robust HTML parsing and cleaning.
"""
import re
from typing import Optional

from bs4 import BeautifulSoup


def html_to_clean_text(html_content: str) -> str:
    """
    Convert HTML content to clean, readable text using BeautifulSoup4.

    Args:
        html_content: HTML string to convert

    Returns:
        Clean text with HTML tags removed and formatting preserved

    Examples:
        >>> html_to_clean_text('<p>Hello <b>World</b></p>')
        'Hello World'
        >>> html_to_clean_text('<div>Line 1<br>Line 2</div>')
        'Line 1\\nLine 2'
    """
    if not html_content:
        return ""

    # Parse HTML with BeautifulSoup
    soup = BeautifulSoup(html_content, 'html.parser')

    # Remove script and style elements
    for element in soup(['script', 'style', 'head', 'title', 'meta', '[document]']):
        element.decompose()

    # Get text content
    text = soup.get_text(separator='\n', strip=True)

    # Clean up whitespace
    # Replace multiple spaces with single space
    text = re.sub(r' +', ' ', text)

    # Replace multiple newlines with maximum 2 newlines
    text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)

    # Remove leading/trailing whitespace from each line
    lines = [line.strip() for line in text.split('\n')]
    text = '\n'.join(line for line in lines if line)  # Remove empty lines

    # Remove leading/trailing whitespace from entire text
    text = text.strip()

    return text


def get_text_from_email_body(body_text: str, body_html: str, snippet: str = "") -> str:
    """
    Extract the best available text content from email body fields.
    Prioritizes plain text, falls back to cleaned HTML, then snippet.

    Args:
        body_text: Plain text body (may be empty)
        body_html: HTML body (may contain rich formatting)
        snippet: Short preview/snippet from email

    Returns:
        Clean text content from the best available source
    """
    # Priority 1: Use plain text if available and substantial
    if body_text and len(body_text.strip()) > 50:
        return body_text.strip()

    # Priority 2: Convert HTML to text if available
    if body_html:
        clean_text = html_to_clean_text(body_html)
        if clean_text:
            return clean_text

    # Priority 3: Use snippet as fallback
    if snippet:
        return snippet.strip()

    return ""


def estimate_size_reduction(html_content: str) -> dict:
    """
    Estimate how much storage will be saved by converting HTML to text.

    Args:
        html_content: HTML string to analyze

    Returns:
        Dictionary with size statistics
    """
    if not html_content:
        return {
            "html_size": 0,
            "text_size": 0,
            "reduction_bytes": 0,
            "reduction_percent": 0,
        }

    clean_text = html_to_clean_text(html_content)

    html_size = len(html_content)
    text_size = len(clean_text)
    reduction_bytes = html_size - text_size
    reduction_percent = (reduction_bytes / html_size * 100) if html_size > 0 else 0

    return {
        "html_size": html_size,
        "text_size": text_size,
        "reduction_bytes": reduction_bytes,
        "reduction_percent": round(reduction_percent, 2),
        "html_tags_removed": len(re.findall(r'<[^>]+>', html_content)),
    }


def should_keep_html(body_text: str, body_html: str) -> bool:
    """
    Determine if HTML version should be kept alongside text.
    Only keep HTML if it provides significantly more content than plain text.

    Args:
        body_text: Plain text version
        body_html: HTML version

    Returns:
        True if HTML should be kept, False if it can be safely discarded
    """
    if not body_html:
        return False

    if not body_text:
        return True  # Need HTML to extract text

    # Convert HTML to clean text
    text_from_html = html_to_clean_text(body_html)

    # If HTML provides 20%+ more content, keep it
    if len(text_from_html) > len(body_text) * 1.2:
        return True

    # Otherwise, plain text is sufficient
    return False
