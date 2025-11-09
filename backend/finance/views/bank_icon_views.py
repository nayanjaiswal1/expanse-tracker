"""
API endpoints for bank icon suggestions.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status


# Curated list of common banks and institutions with representative icon URLs.
# Icons leverage public logo aggregators that serve transparent PNG/SVG assets.
BANK_ICON_SUGGESTIONS = [
    {
        "name": "Chase",
        "identifier": "chase",
        "icon_url": "https://logo.clearbit.com/chase.com",
        "accent_color": "#0C4DA2",
        "website": "https://www.chase.com",
    },
    {
        "name": "Bank of America",
        "identifier": "bank_of_america",
        "icon_url": "https://logo.clearbit.com/bankofamerica.com",
        "accent_color": "#D4001A",
        "website": "https://www.bankofamerica.com",
    },
    {
        "name": "Wells Fargo",
        "identifier": "wells_fargo",
        "icon_url": "https://logo.clearbit.com/wellsfargo.com",
        "accent_color": "#c40329",
        "website": "https://www.wellsfargo.com",
    },
    {
        "name": "Citibank",
        "identifier": "citibank",
        "icon_url": "https://logo.clearbit.com/citi.com",
        "accent_color": "#0B4AA1",
        "website": "https://www.citi.com",
    },
    {
        "name": "Capital One",
        "identifier": "capital_one",
        "icon_url": "https://logo.clearbit.com/capitalone.com",
        "accent_color": "#004977",
        "website": "https://www.capitalone.com",
    },
    {
        "name": "HSBC",
        "identifier": "hsbc",
        "icon_url": "https://logo.clearbit.com/hsbc.com",
        "accent_color": "#DB0011",
        "website": "https://www.hsbc.com",
    },
    {
        "name": "Barclays",
        "identifier": "barclays",
        "icon_url": "https://logo.clearbit.com/barclays.co.uk",
        "accent_color": "#00AEEF",
        "website": "https://www.barclays.co.uk",
    },
    {
        "name": "Deutsche Bank",
        "identifier": "deutsche_bank",
        "icon_url": "https://logo.clearbit.com/db.com",
        "accent_color": "#001B44",
        "website": "https://www.db.com",
    },
    {
        "name": "ICICI Bank",
        "identifier": "icici",
        "icon_url": "https://logo.clearbit.com/icicibank.com",
        "accent_color": "#9C2F24",
        "website": "https://www.icicibank.com",
    },
    {
        "name": "HDFC Bank",
        "identifier": "hdfc",
        "icon_url": "https://logo.clearbit.com/hdfcbank.com",
        "accent_color": "#004197",
        "website": "https://www.hdfcbank.com",
    },
    {
        "name": "Axis Bank",
        "identifier": "axis_bank",
        "icon_url": "https://logo.clearbit.com/axisbank.com",
        "accent_color": "#9D0042",
        "website": "https://www.axisbank.com",
    },
    {
        "name": "State Bank of India",
        "identifier": "sbi",
        "icon_url": "https://logo.clearbit.com/sbi.co.in",
        "accent_color": "#1D4899",
        "website": "https://sbi.co.in",
    },
    {
        "name": "Standard Chartered",
        "identifier": "standard_chartered",
        "icon_url": "https://logo.clearbit.com/sc.com",
        "accent_color": "#0B9444",
        "website": "https://www.sc.com",
    },
    {
        "name": "ING",
        "identifier": "ing",
        "icon_url": "https://logo.clearbit.com/ing.com",
        "accent_color": "#FF6200",
        "website": "https://www.ing.com",
    },
    {
        "name": "Banco Santander",
        "identifier": "santander",
        "icon_url": "https://logo.clearbit.com/santander.com",
        "accent_color": "#EC0000",
        "website": "https://www.santander.com",
    },
]


class BankIconSuggestionView(APIView):
    """Return a curated list of bank icon metadata for use in account creation flows."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = request.query_params.get("q", "").strip().lower()

        if query:
            filtered = [
                bank
                for bank in BANK_ICON_SUGGESTIONS
                if query in bank["name"].lower()
                or query in bank["identifier"]
            ]
        else:
            filtered = BANK_ICON_SUGGESTIONS

        return Response(
            {
                "count": len(filtered),
                "results": filtered,
            },
            status=status.HTTP_200_OK,
        )
