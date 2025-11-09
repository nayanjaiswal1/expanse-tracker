import { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { Button } from './Button';

export const ConfirmDialogExamples = () => {
  const [showDanger, setShowDanger] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(false);
    setShowDanger(false);
  };

  return (
    <div className="space-y-4 p-8">
      <h2 className="text-2xl font-bold mb-6">ConfirmDialog Examples (2025)</h2>

      <div className="flex flex-wrap gap-4">
        {/* Danger variant - Delete action */}
        <Button onClick={() => setShowDanger(true)} variant="danger">
          Show Delete Dialog
        </Button>

        {/* Warning variant */}
        <Button onClick={() => setShowWarning(true)}>Show Warning Dialog</Button>

        {/* Info variant */}
        <Button onClick={() => setShowInfo(true)}>Show Info Dialog</Button>

        {/* Success variant */}
        <Button onClick={() => setShowSuccess(true)}>Show Success Dialog</Button>
      </div>

      {/* Danger Dialog - with loading state */}
      <ConfirmDialog
        isOpen={showDanger}
        onClose={() => setShowDanger(false)}
        onConfirm={handleDelete}
        variant="danger"
        title="Delete Account"
        message="Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed."
        confirmText="Delete Account"
        cancelText="Cancel"
        confirmLoading={isLoading}
      />

      {/* Warning Dialog - with translation keys */}
      <ConfirmDialog
        isOpen={showWarning}
        onClose={() => setShowWarning(false)}
        onConfirm={() => setShowWarning(false)}
        variant="warning"
        titleKey="common:warning"
        messageKey="common:unsavedChangesMessage"
        confirmTextKey="common:discard"
        cancelTextKey="common:cancel"
      />

      {/* Info Dialog */}
      <ConfirmDialog
        isOpen={showInfo}
        onClose={() => setShowInfo(false)}
        onConfirm={() => setShowInfo(false)}
        variant="info"
        title="Update Available"
        message="A new version of the app is available. Would you like to update now?"
        confirmText="Update Now"
        cancelText="Later"
      />

      {/* Success Dialog */}
      <ConfirmDialog
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        onConfirm={() => setShowSuccess(false)}
        variant="success"
        title="Export Complete"
        message="Your data has been successfully exported. Would you like to download it now?"
        confirmText="Download"
        cancelText="Close"
      />
    </div>
  );
};
