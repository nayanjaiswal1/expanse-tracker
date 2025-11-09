"""
Enhanced Email Order Parser - Extract item-level details from e-commerce emails.

Supports:
- Amazon, Flipkart, Myntra, Swiggy, Zomato, Uber Eats, etc.
- Order confirmations with multiple items
- Item names, quantities, prices, categories
- LLM-based extraction for complex emails
"""

from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation
from typing import Dict, List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class EmailOrderParser:
    """
    Parse order confirmation emails to extract item-level transaction details.

    This parser complements the basic EmailParser by extracting detailed
    line items from e-commerce and food delivery emails.
    """

    # E-commerce platforms
    E_COMMERCE_DOMAINS = {
        'amazon': ['amazon.in', 'amazon.com', 'amazon.co.uk'],
        'flipkart': ['flipkart.com'],
        'myntra': ['myntra.com'],
        'ajio': ['ajio.com'],
        'meesho': ['meesho.com'],
        'nykaa': ['nykaa.com'],
    }

    # Food delivery platforms
    FOOD_DELIVERY_DOMAINS = {
        'swiggy': ['swiggy.com', 'swiggy.in'],
        'zomato': ['zomato.com'],
        'uber_eats': ['ubereats.com'],
        'blinkit': ['blinkit.com'],
        'zepto': ['zepto.com'],
    }

    # Item extraction patterns
    ITEM_LINE_PATTERNS = [
        # "1x Product Name - Rs. 500"
        r'(\d+)\s*[xX×]\s*([^\-\n]+?)\s*[-–—]\s*(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)',
        # "Product Name | Qty: 2 | Price: Rs. 500"
        r'([^\|\n]+?)\s*\|\s*Qty:\s*(\d+)\s*\|\s*Price:\s*(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)',
        # "Product Name ........... Rs. 500 (2)"
        r'([^\n]+?)\s*\.{3,}\s*(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s*\((\d+)\)',
        # Table format: "Product Name    2    500"
        r'([^\t\n]+?)\s{3,}(\d+)\s{3,}(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)',
    ]

    # Category keywords for auto-categorization
    CATEGORY_KEYWORDS = {
        'Electronics': ['laptop', 'phone', 'mobile', 'tablet', 'headphone', 'earphone', 'camera', 'tv', 'smartwatch'],
        'Clothing': ['shirt', 't-shirt', 'jeans', 'dress', 'jacket', 'shoes', 'socks', 'pants', 'top', 'bottom'],
        'Food & Dining': ['pizza', 'burger', 'biryani', 'sandwich', 'coffee', 'tea', 'meal', 'lunch', 'dinner', 'breakfast'],
        'Groceries': ['rice', 'dal', 'oil', 'milk', 'bread', 'eggs', 'vegetables', 'fruits', 'flour', 'sugar', 'salt'],
        'Beauty & Personal Care': ['shampoo', 'soap', 'cream', 'lotion', 'perfume', 'makeup', 'skincare', 'haircare'],
        'Books & Media': ['book', 'novel', 'magazine', 'dvd', 'cd', 'kindle', 'ebook'],
        'Home & Kitchen': ['utensil', 'plate', 'cup', 'pan', 'cooker', 'bottle', 'container', 'furniture'],
        'Health & Fitness': ['vitamin', 'supplement', 'protein', 'medicine', 'yoga', 'gym', 'fitness'],
        'Toys & Games': ['toy', 'game', 'puzzle', 'doll', 'car', 'lego', 'board game'],
        'Sports': ['ball', 'bat', 'racket', 'bicycle', 'cricket', 'football', 'badminton', 'tennis'],
    }

    def __init__(self, llm_provider=None):
        """
        Initialize parser with optional LLM provider for complex extraction.

        Args:
            llm_provider: Optional AI provider for structured extraction (OpenAI, Anthropic, etc.)
        """
        self.llm_provider = llm_provider

    def parse_order_email(self, gmail_message: Dict, basic_parse: Dict) -> Optional[Dict]:
        """
        Parse order email to extract item-level details.

        Args:
            gmail_message: Raw Gmail API message
            basic_parse: Result from EmailParser.parse_gmail_message()

        Returns:
            Dict with order details and items, or None if not an order email
        """
        # Check if this is an order email
        sender = basic_parse.get('sender', '').lower()
        subject = basic_parse.get('subject', '').lower()
        body = basic_parse.get('body_preview', '')

        platform = self._identify_platform(sender, subject)
        if not platform:
            return None

        # Extract full email body
        payload = gmail_message.get("payload", {})
        from services.services.email_parser import EmailParser
        parser = EmailParser()
        full_body = parser._extract_email_body(payload)

        # Try pattern-based extraction first
        items = self._extract_items_pattern_based(full_body, subject)

        # If pattern-based fails and we have LLM, use AI extraction
        if not items and self.llm_provider:
            items = self._extract_items_with_llm(full_body, subject, platform)

        if not items:
            logger.info(f"No items extracted from {platform} order email")
            return None

        # Calculate totals
        total_items = len(items)
        subtotal = sum(item['total_price'] for item in items)

        # Extract order details
        order_id = self._extract_order_id(subject, full_body)
        delivery_charges = self._extract_delivery_charges(full_body)
        taxes = self._extract_taxes(full_body)
        discounts = self._extract_discounts(full_body)

        grand_total = subtotal + delivery_charges + taxes - discounts

        return {
            'platform': platform,
            'order_id': order_id,
            'items': items,
            'item_count': total_items,
            'subtotal': float(subtotal),
            'delivery_charges': float(delivery_charges),
            'taxes': float(taxes),
            'discounts': float(discounts),
            'grand_total': float(grand_total),
            'extraction_method': 'pattern' if items else 'llm',
        }

    def _identify_platform(self, sender: str, subject: str) -> Optional[str]:
        """Identify e-commerce/food delivery platform from email."""
        combined = f"{sender} {subject}".lower()

        # Check e-commerce platforms
        for platform, domains in self.E_COMMERCE_DOMAINS.items():
            if any(domain in combined for domain in domains):
                return platform

        # Check food delivery platforms
        for platform, domains in self.FOOD_DELIVERY_DOMAINS.items():
            if any(domain in combined for domain in domains):
                return platform

        # Check for generic order keywords
        if any(keyword in combined for keyword in ['order confirmed', 'order receipt', 'purchase confirmation']):
            return 'generic'

        return None

    def _extract_items_pattern_based(self, body: str, subject: str) -> List[Dict]:
        """Extract items using regex patterns."""
        items = []

        for pattern in self.ITEM_LINE_PATTERNS:
            matches = re.finditer(pattern, body, re.IGNORECASE | re.MULTILINE)

            for match in matches:
                groups = match.groups()

                # Parse based on pattern structure
                if len(groups) == 3:
                    # Could be (qty, name, price) or (name, price, qty)
                    if groups[0].isdigit():
                        qty_str, name, price_str = groups
                    else:
                        name, price_str, qty_str = groups
                else:
                    continue

                # Parse quantity
                try:
                    quantity = int(qty_str) if qty_str.isdigit() else 1
                except (ValueError, AttributeError):
                    quantity = 1

                # Parse price
                try:
                    price_str = price_str.replace(',', '').strip()
                    price = Decimal(price_str)
                except (InvalidOperation, ValueError, AttributeError):
                    continue

                # Calculate unit and total price
                if quantity > 1:
                    unit_price = price / quantity
                    total_price = price
                else:
                    unit_price = price
                    total_price = price

                # Clean item name
                name = name.strip().strip('*-•◦▪▫').strip()
                if not name or len(name) < 3:
                    continue

                # Auto-categorize
                category = self._auto_categorize_item(name)

                items.append({
                    'name': name,
                    'quantity': quantity,
                    'unit_price': float(unit_price),
                    'total_price': float(total_price),
                    'category': category,
                    'metadata': {
                        'extraction_method': 'pattern',
                        'confidence': 0.8,
                    }
                })

        # Deduplicate items (keep highest confidence)
        unique_items = {}
        for item in items:
            key = item['name'].lower()
            if key not in unique_items or item['total_price'] > unique_items[key]['total_price']:
                unique_items[key] = item

        return list(unique_items.values())

    def _extract_items_with_llm(self, body: str, subject: str, platform: str) -> List[Dict]:
        """Extract items using LLM for structured extraction."""
        if not self.llm_provider:
            return []

        prompt = f"""Extract all items from this {platform} order email.

Email Subject: {subject}

Email Body:
{body[:3000]}  # Limit to prevent token overflow

Extract the following for each item:
- name: Item/product name
- quantity: Number of items (default 1)
- unit_price: Price per unit
- total_price: Total price for this item (quantity × unit_price)
- category: Best matching category from: {', '.join(self.CATEGORY_KEYWORDS.keys())}

Return as JSON array:
[
  {{
    "name": "Product Name",
    "quantity": 2,
    "unit_price": 250.50,
    "total_price": 501.00,
    "category": "Electronics"
  }}
]

Only include actual purchased items, not taxes, delivery charges, or discounts.
"""

        try:
            # Use LLM to extract structured data
            response = self.llm_provider.generate(
                prompt=prompt,
                response_format='json'
            )

            import json
            items = json.loads(response)

            # Add metadata
            for item in items:
                item['metadata'] = {
                    'extraction_method': 'llm',
                    'confidence': 0.9,
                    'model': getattr(self.llm_provider, 'model_name', 'unknown'),
                }

            return items

        except Exception as e:
            logger.error(f"LLM extraction failed: {e}")
            return []

    def _auto_categorize_item(self, item_name: str) -> Optional[str]:
        """Auto-categorize item based on keywords."""
        name_lower = item_name.lower()

        for category, keywords in self.CATEGORY_KEYWORDS.items():
            if any(keyword in name_lower for keyword in keywords):
                return category

        return None

    def _extract_order_id(self, subject: str, body: str) -> Optional[str]:
        """Extract order ID from email."""
        patterns = [
            r'Order\s*#?\s*:?\s*([A-Z0-9\-]+)',
            r'Order\s+ID\s*:?\s*([A-Z0-9\-]+)',
            r'Order\s+Number\s*:?\s*([A-Z0-9\-]+)',
            r'Reference\s*#?\s*:?\s*([A-Z0-9\-]+)',
        ]

        combined = f"{subject} {body[:500]}"

        for pattern in patterns:
            match = re.search(pattern, combined, re.IGNORECASE)
            if match:
                return match.group(1)

        return None

    def _extract_delivery_charges(self, body: str) -> Decimal:
        """Extract delivery/shipping charges."""
        patterns = [
            r'Delivery\s+Charges?\s*:?\s*(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)',
            r'Shipping\s+Charges?\s*:?\s*(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)',
            r'Delivery\s+Fee\s*:?\s*(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)',
        ]

        return self._extract_amount_by_patterns(body, patterns)

    def _extract_taxes(self, body: str) -> Decimal:
        """Extract tax amount."""
        patterns = [
            r'Tax(?:es)?\s*:?\s*(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)',
            r'GST\s*:?\s*(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)',
            r'VAT\s*:?\s*(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)',
        ]

        return self._extract_amount_by_patterns(body, patterns)

    def _extract_discounts(self, body: str) -> Decimal:
        """Extract discount amount."""
        patterns = [
            r'Discount\s*:?\s*(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)',
            r'Coupon\s+Discount\s*:?\s*(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)',
            r'You\s+Saved\s*:?\s*(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)',
        ]

        return self._extract_amount_by_patterns(body, patterns)

    def _extract_amount_by_patterns(self, text: str, patterns: List[str]) -> Decimal:
        """Extract amount using multiple patterns."""
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    amount_str = match.group(1).replace(',', '').strip()
                    return Decimal(amount_str)
                except (InvalidOperation, ValueError):
                    continue

        return Decimal('0.00')

    def create_transaction_with_items(
        self,
        order_data: Dict,
        transaction_data: Dict,
        user,
        account,
        category_mapping: Optional[Dict[str, int]] = None
    ) -> Tuple[object, List[object]]:
        """
        Create a Transaction with TransactionDetails from order data.

        Args:
            order_data: Parsed order data from parse_order_email()
            transaction_data: Basic transaction data (amount, date, etc.)
            user: User instance
            account: Account instance
            category_mapping: Optional dict mapping category names to Category IDs

        Returns:
            Tuple of (Transaction, List[TransactionDetail])
        """
        from finance.models import Transaction, TransactionDetail

        # Create main transaction
        transaction = Transaction.objects.create(
            user=user,
            account=account,
            amount=Decimal(str(order_data['grand_total'])),
            description=f"{order_data['platform'].title()} Order {order_data.get('order_id', '')}",
            date=transaction_data.get('date'),
            is_credit=False,  # Orders are expenses
            currency=transaction_data.get('currency', 'INR'),
            status='active',
            metadata={
                'source': 'gmail_order',
                'platform': order_data['platform'],
                'order_id': order_data.get('order_id'),
                'item_count': order_data['item_count'],
                'subtotal': order_data['subtotal'],
                'delivery_charges': order_data['delivery_charges'],
                'taxes': order_data['taxes'],
                'discounts': order_data['discounts'],
                'extraction_method': order_data['extraction_method'],
            }
        )

        # Create line items
        details = []
        for item in order_data['items']:
            # Map category name to Category ID if provided
            category_id = None
            if category_mapping and item.get('category'):
                category_id = category_mapping.get(item['category'])

            detail = TransactionDetail.create_line_item(
                transaction=transaction,
                name=item['name'],
                amount=Decimal(str(item['total_price'])),
                quantity=Decimal(str(item['quantity'])),
                unit_price=Decimal(str(item['unit_price'])),
                metadata=item.get('metadata', {}),
            )

            # Set category if available
            if category_id:
                detail.category_id = category_id
                detail.save()

            details.append(detail)

        # Create additional detail entries for charges/taxes
        if order_data['delivery_charges'] > 0:
            details.append(TransactionDetail.objects.create(
                transaction=transaction,
                user=user,
                detail_type='fee',
                name='Delivery Charges',
                amount=Decimal(str(order_data['delivery_charges'])),
                description='Delivery/Shipping fee'
            ))

        if order_data['taxes'] > 0:
            details.append(TransactionDetail.objects.create(
                transaction=transaction,
                user=user,
                detail_type='tax_detail',
                name='Tax',
                amount=Decimal(str(order_data['taxes'])),
                description='GST/VAT'
            ))

        if order_data['discounts'] > 0:
            details.append(TransactionDetail.objects.create(
                transaction=transaction,
                user=user,
                detail_type='discount',
                name='Discount',
                amount=Decimal(str(order_data['discounts'])),
                description='Coupon/Offer discount'
            ))

        return transaction, details
