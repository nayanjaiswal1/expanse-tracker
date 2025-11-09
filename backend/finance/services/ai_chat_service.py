"""
AI-powered conversational service for transaction chat (subscription-based).
"""

import json
import logging
from decimal import Decimal
from typing import Dict, List, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class AIChatService:
    """
    Premium AI service for conversational transaction parsing.

    Features:
    - Advanced natural language understanding
    - Context-aware suggestions
    - Multi-turn conversation handling
    - Intelligent category matching
    - Spending pattern analysis
    """

    def __init__(self, user):
        self.user = user
        self.profile = getattr(user, 'profile', None)

    def is_ai_enabled(self) -> bool:
        """Check if user has AI features enabled in their plan."""
        if not self.profile:
            return False

        # Check subscription status
        if self.profile.subscription_status not in ['trial', 'active']:
            return False

        # Check if AI features are in plan
        features = self.profile.custom_features or {}
        return features.get('ai_chat', False) or features.get('advanced_ai', False)

    def has_credits(self, required_credits: int = 1) -> bool:
        """Check if user has enough AI credits."""
        if not self.profile:
            return False
        return self.profile.ai_credits_remaining >= required_credits

    def consume_credits(self, credits: int = 1) -> bool:
        """Consume AI credits and return success status."""
        if not self.profile:
            return False
        return self.profile.consume_ai_credits(credits)

    def get_ai_provider(self) -> str:
        """Get configured AI provider."""
        if not self.profile:
            return 'system'
        return self.profile.preferred_ai_provider

    def enhance_suggestion(
        self,
        message: str,
        basic_suggestion: Dict[str, Any],
        conversation_history: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Enhance basic suggestion with AI-powered analysis.

        Args:
            message: User's input message
            basic_suggestion: Basic parsed suggestion from QuickAddService
            conversation_history: Previous messages in conversation

        Returns:
            Enhanced suggestion with AI improvements
        """
        # Check if user has premium AI features
        has_premium_ai = self.is_ai_enabled()
        has_credits = self.has_credits(1)

        # If no premium AI or no credits, use heuristics with upgrade prompt
        if not has_premium_ai or not has_credits:
            result = self._enhance_with_heuristics(message, basic_suggestion)
            result['suggestion']['upgrade_prompt'] = not has_premium_ai
            result['suggestion']['credits_depleted'] = has_premium_ai and not has_credits
            return result

        # Premium user with credits - use AI provider
        provider = self.get_ai_provider()

        if provider == 'openai':
            return self._enhance_with_openai(message, basic_suggestion, conversation_history)
        elif provider == 'ollama':
            return self._enhance_with_ollama(message, basic_suggestion, conversation_history)
        else:
            # System default - basic enhancements
            return self._enhance_with_heuristics(message, basic_suggestion)

    def _enhance_with_openai(
        self,
        message: str,
        basic_suggestion: Dict[str, Any],
        conversation_history: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Enhance suggestion using OpenAI API."""
        try:
            import openai

            # Get decrypted API key
            api_key = self.profile.decrypt_api_key()
            if not api_key:
                return {
                    'enhanced': False,
                    'reason': 'OpenAI API key not configured',
                    'suggestion': basic_suggestion,
                    'config_required': True,
                }

            openai.api_key = api_key
            model = self.profile.openai_model or 'gpt-3.5-turbo'

            # Build conversation context
            messages = self._build_openai_context(message, basic_suggestion, conversation_history)

            # Call OpenAI API
            response = openai.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.3,
                max_tokens=200,
                response_format={"type": "json_object"}
            )

            # Parse AI response
            ai_result = json.loads(response.choices[0].message.content)

            # Consume credits
            self.consume_credits(1)

            # Merge with basic suggestion
            enhanced = {**basic_suggestion}
            enhanced.update({
                'description': ai_result.get('description', basic_suggestion.get('description')),
                'merchant_name': ai_result.get('merchant_name', basic_suggestion.get('merchant_name')),
                'suggested_category': ai_result.get('category'),
                'confidence': min(ai_result.get('confidence', 0.8), 1.0),
                'ai_insights': ai_result.get('insights', []),
                'tags': ai_result.get('tags', []),
            })

            return {
                'enhanced': True,
                'suggestion': enhanced,
                'ai_provider': 'openai',
                'credits_used': 1,
            }

        except Exception as e:
            logger.error(f"OpenAI enhancement failed: {e}")
            return {
                'enhanced': False,
                'reason': str(e),
                'suggestion': basic_suggestion,
                'error': True,
            }

    def _enhance_with_ollama(
        self,
        message: str,
        basic_suggestion: Dict[str, Any],
        conversation_history: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Enhance suggestion using local Ollama."""
        try:
            import requests

            endpoint = self.profile.ollama_endpoint or 'http://localhost:11434'
            model = self.profile.ollama_model or 'llama2'

            prompt = self._build_ollama_prompt(message, basic_suggestion)

            response = requests.post(
                f"{endpoint}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "format": "json",
                    "stream": False,
                },
                timeout=10,
            )

            if response.status_code == 200:
                result = response.json()
                ai_result = json.loads(result.get('response', '{}'))

                # Consume credits (less for local model)
                self.consume_credits(1)

                enhanced = {**basic_suggestion}
                enhanced.update({
                    'description': ai_result.get('description', basic_suggestion.get('description')),
                    'confidence': min(ai_result.get('confidence', 0.7), 1.0),
                    'ai_insights': ai_result.get('insights', []),
                })

                return {
                    'enhanced': True,
                    'suggestion': enhanced,
                    'ai_provider': 'ollama',
                    'credits_used': 1,
                }
            else:
                raise Exception(f"Ollama returned status {response.status_code}")

        except Exception as e:
            logger.error(f"Ollama enhancement failed: {e}")
            return {
                'enhanced': False,
                'reason': str(e),
                'suggestion': basic_suggestion,
                'error': True,
            }

    def _enhance_with_heuristics(
        self,
        message: str,
        basic_suggestion: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Basic enhancement using heuristics (no API calls)."""
        enhanced = {**basic_suggestion}

        # Add simple contextual insights
        insights = []

        amount = basic_suggestion.get('amount')
        if amount:
            try:
                amt_decimal = Decimal(str(amount))
                if amt_decimal > 100:
                    insights.append("Large transaction")
                elif amt_decimal < 5:
                    insights.append("Small transaction")
            except:
                pass

        description = basic_suggestion.get('description', '').lower()
        if any(word in description for word in ['coffee', 'lunch', 'dinner', 'food']):
            insights.append("Recurring expense category")

        enhanced['ai_insights'] = insights
        enhanced['confidence'] = min(enhanced.get('confidence', 0.5) + 0.1, 0.95)

        return {
            'enhanced': True,
            'suggestion': enhanced,
            'ai_provider': 'heuristics',
            'credits_used': 0,
        }

    def _build_openai_context(
        self,
        message: str,
        basic_suggestion: Dict[str, Any],
        conversation_history: List[Dict[str, Any]] = None
    ) -> List[Dict[str, str]]:
        """Build context for OpenAI API call."""
        system_prompt = """You are a financial assistant helping to parse transaction descriptions.
Analyze the user's message and improve the transaction details.

Return a JSON object with:
- description: Clear transaction description
- merchant_name: Merchant/vendor name if identifiable
- category: Suggested category (e.g., food, transport, entertainment, shopping, utilities)
- confidence: Confidence score 0-1
- insights: Array of helpful insights about this transaction
- tags: Relevant tags for categorization

Be concise and accurate."""

        messages = [{"role": "system", "content": system_prompt}]

        # Add conversation history
        if conversation_history:
            for msg in conversation_history[-3:]:  # Last 3 messages
                messages.append({
                    "role": msg.get('role', 'user'),
                    "content": msg.get('content', '')
                })

        # Current message with basic parse
        user_content = f"""User message: "{message}"

Basic parsing found:
- Amount: {basic_suggestion.get('amount', 'Not detected')}
- Description: {basic_suggestion.get('description', 'Not detected')}
- Type: {basic_suggestion.get('transaction_type', 'expense')}

Please enhance this transaction with better categorization and insights."""

        messages.append({"role": "user", "content": user_content})

        return messages

    def _build_ollama_prompt(
        self,
        message: str,
        basic_suggestion: Dict[str, Any]
    ) -> str:
        """Build prompt for Ollama."""
        return f"""Analyze this transaction and return JSON with enhanced details:

User input: "{message}"

Detected amount: {basic_suggestion.get('amount', 'unknown')}
Detected description: {basic_suggestion.get('description', 'unknown')}

Return JSON with:
- description: improved description
- confidence: 0-1
- insights: array of insights

JSON:"""

    def generate_spending_insights(self, transactions: List[Dict]) -> Dict[str, Any]:
        """Generate AI-powered spending insights from transaction history."""
        if not self.is_ai_enabled() or not self.has_credits(2):
            return {
                'available': False,
                'reason': 'Premium feature - upgrade plan',
            }

        # This would call AI to analyze spending patterns
        # For now, return placeholder
        return {
            'available': True,
            'insights': [
                "This feature requires 2 AI credits per analysis",
                "Upgrade to Pro for unlimited insights"
            ],
            'credits_required': 2,
        }
