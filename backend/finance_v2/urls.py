from rest_framework.routers import DefaultRouter

from . import views


router = DefaultRouter()
router.register(r"entities", views.EntityViewSet, basename="entity")
router.register(r"groups", views.GroupViewSet, basename="group")
router.register(r"group-members", views.GroupMemberViewSet, basename="group-member")
router.register(r"transactions", views.TransactionViewSet, basename="transaction")
router.register(r"pending-transactions", views.PendingTransactionViewSet, basename="pending-transaction")
router.register(r"uploaded-files", views.UploadedFileViewSet, basename="uploaded-file")
router.register(r"chat/messages", views.ChatMessageViewSet, basename="chat-message")
router.register(r"statement-passwords", views.StatementPasswordViewSet, basename="statement-password")

urlpatterns = router.urls
