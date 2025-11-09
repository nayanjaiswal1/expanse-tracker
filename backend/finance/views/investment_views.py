"""
Investment-related views for the finance app.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from ..filters import InvestmentFilter

from ..models import Investment
# from ..serializers import InvestmentSerializer
from ..services import InvestmentService


# class InvestmentViewSet(viewsets.ModelViewSet):
#     """ViewSet for investment management"""

#     serializer_class = InvestmentSerializer
#     permission_classes = [permissions.IsAuthenticated]
#     filter_backends = [DjangoFilterBackend, OrderingFilter]
#     filterset_class = InvestmentFilter
#     ordering_fields = ["name", "value", "created_at"]
#     ordering = ["-created_at"]

#     def get_queryset(self):
#         return Investment.objects.filter(user=self.request.user)

#     def get_service(self):
#         """Get investment service instance"""
#         return InvestmentService(user=self.request.user)

#     @action(detail=True, methods=["post"])
#     def buy(self, request, pk=None):
#         """Record a buy transaction for an investment"""
#         investment = self.get_object()
#         service = self.get_service()

#         try:
#             quantity = request.data.get("quantity")
#             price_per_unit = request.data.get("price_per_unit")
#             fees = request.data.get("fees", 0)
#             transaction_date = request.data.get("transaction_date")
#             account_id = request.data.get("account_id") or request.data.get("account")

#             if not quantity or not price_per_unit:
#                 return Response(
#                     {"error": "Quantity and price_per_unit are required"},
#                     status=status.HTTP_400_BAD_REQUEST,
#                 )

#             buy_transaction = service.buy_investment(
#                 investment_id=investment.id,
#                 quantity=quantity,
#                 price_per_unit=price_per_unit,
#                 fees=fees,
#                 transaction_date=transaction_date,
#                 account=account_id,
#             )

#             return Response(
#                 {
#                     "message": "Buy transaction recorded successfully",
#                     "transaction_id": buy_transaction.id,
#                     "total_cost": str(buy_transaction.amount),
#                     "quantity": str(buy_transaction.quantity) if buy_transaction.quantity is not None else None,
#                     "price_per_unit": str(buy_transaction.price_per_unit) if buy_transaction.price_per_unit is not None else None,
#                 },
#                 status=status.HTTP_201_CREATED,
#             )

#         except Exception as e:
#             return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

#     @action(detail=True, methods=["post"])
#     def sell(self, request, pk=None):
#         """Record a sell transaction for an investment"""
#         investment = self.get_object()
#         service = self.get_service()

#         try:
#             quantity = request.data.get("quantity")
#             price_per_unit = request.data.get("price_per_unit")
#             fees = request.data.get("fees", 0)
#             transaction_date = request.data.get("transaction_date")
#             account_id = request.data.get("account_id") or request.data.get("account")

#             if not quantity or not price_per_unit:
#                 return Response(
#                     {"error": "Quantity and price_per_unit are required"},
#                     status=status.HTTP_400_BAD_REQUEST,
#                 )

#             sell_transaction = service.sell_investment(
#                 investment_id=investment.id,
#                 quantity=quantity,
#                 price_per_unit=price_per_unit,
#                 fees=fees,
#                 transaction_date=transaction_date,
#                 account=account_id,
#             )

#             return Response(
#                 {
#                     "message": "Sell transaction recorded successfully",
#                     "transaction_id": sell_transaction.id,
#                     "total_proceeds": str(sell_transaction.amount),
#                     "quantity": str(sell_transaction.quantity) if sell_transaction.quantity is not None else None,
#                     "price_per_unit": str(sell_transaction.price_per_unit) if sell_transaction.price_per_unit is not None else None,
#                 },
#                 status=status.HTTP_201_CREATED,
#             )

#         except Exception as e:
#             return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

#     @action(detail=True, methods=["post"])
#     def dividend(self, request, pk=None):
#         """Record a dividend payment"""
#         investment = self.get_object()
#         service = self.get_service()

#         try:
#             amount = request.data.get("amount")
#             payment_date = request.data.get("payment_date")
#             account_id = request.data.get("account_id") or request.data.get("account")

#             if not amount:
#                 return Response(
#                     {"error": "Amount is required"}, status=status.HTTP_400_BAD_REQUEST
#                 )

#             dividend_transaction = service.record_dividend(
#                 investment_id=investment.id,
#                 amount=amount,
#                 payment_date=payment_date,
#                 account=account_id,
#             )

#             return Response(
#                 {
#                     "message": "Dividend recorded successfully",
#                     "transaction_id": dividend_transaction.id,
#                     "amount": str(dividend_transaction.amount),
#                 },
#                 status=status.HTTP_201_CREATED,
#             )

#         except Exception as e:
#             return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

#     @action(detail=True, methods=["post"])
#     def update_price(self, request, pk=None):
#         """Update investment current price"""
#         investment = self.get_object()
#         service = self.get_service()

#         try:
#             new_price = request.data.get("price")
#             price_source = request.data.get("source", "manual")

#             if not new_price:
#                 return Response(
#                     {"error": "Price is required"}, status=status.HTTP_400_BAD_REQUEST
#                 )

#             updated_investment = service.update_investment_price(
#                 investment_id=investment.id,
#                 new_price=new_price,
#                 price_source=price_source,
#             )

#             return Response(
#                 {
#                     "message": "Price updated successfully",
#                     "new_price": updated_investment.current_price,
#                     "last_update": updated_investment.last_price_update,
#                 },
#                 status=status.HTTP_200_OK,
#             )

#         except Exception as e:
#             return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

#     @action(detail=True, methods=["get"])
#     def history(self, request, pk=None):
#         """Get transaction history for an investment"""
#         investment = self.get_object()
#         service = self.get_service()

#         start_date = request.query_params.get("start_date")
#         end_date = request.query_params.get("end_date")

#         transactions = service.get_investment_history(
#             investment_id=investment.id, start_date=start_date, end_date=end_date
#         )

#         transaction_data = []
#         for transaction in transactions:
#             transaction_data.append(
#                 {
#                     "id": transaction.id,
#                     "type": transaction.transaction_subtype,
#                     "quantity": str(transaction.quantity) if transaction.quantity is not None else None,
#                     "price_per_unit": str(transaction.price_per_unit) if transaction.price_per_unit is not None else None,
#                     "amount": str(transaction.amount),
#                     "fees": str(transaction.fees) if transaction.fees is not None else None,
#                     "date": transaction.date,
#                     "description": transaction.description,
#                 }
#             )

#         return Response(
#             {"investment": investment.symbol, "transactions": transaction_data},
#             status=status.HTTP_200_OK,
#         )

#     @action(detail=False, methods=["get"])
#     def portfolio_performance(self, request):
#         """Get portfolio performance metrics"""
#         service = self.get_service()
#         portfolio_name = request.query_params.get("portfolio", "Default")

#         performance = service.get_portfolio_performance(portfolio_name)

#         return Response(performance, status=status.HTTP_200_OK)

#     @action(detail=False, methods=["get"])
#     def top_performers(self, request):
#         """Get top performing investments"""
#         service = self.get_service()
#         limit = int(request.query_params.get("limit", 5))

#         performers = service.get_top_performers(limit)

#         return Response({"top_performers": performers}, status=status.HTTP_200_OK)

#     @action(detail=False, methods=["get"])
#     def realized_gains(self, request):
#         """Get realized gains/losses"""
#         service = self.get_service()
#         investment_id = request.query_params.get("investment_id")

#         gains = service.calculate_realized_gains(investment_id)

#         return Response(gains, status=status.HTTP_200_OK)
