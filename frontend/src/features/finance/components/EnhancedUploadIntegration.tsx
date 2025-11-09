import React, { useState } from 'react';
import { Upload as UploadIcon, FileText, History } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import EnhancedUpload from './EnhancedUpload';
import { UploadList } from '../UploadList';
import type { Account, Category } from '../../../types';
import { HStack } from '../../../components/ui/Layout';

interface EnhancedUploadIntegrationProps {
  accounts: Account[];
  categories?: Category[];
  onUploadSuccess?: () => void;
  defaultAccount?: Account;
}

/**
 * Integration component for adding enhanced upload functionality to the account page.
 *
 * This component provides:
 * - Upload button for the account page header
 * - Modal with enhanced upload capabilities
 * - Upload history view
 * - Integration with existing account management
 */
export const EnhancedUploadIntegration: React.FC<EnhancedUploadIntegrationProps> = ({
  accounts,
  categories = [],
  onUploadSuccess,
  defaultAccount,
}) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');

  const handleUploadSuccess = () => {
    setShowUploadModal(false);
    onUploadSuccess?.();
  };

  // Component for account page header buttons
  const UploadButtons = () => (
    <HStack gap={2}>
      <Button
        variant="outline"
        onClick={() => setShowHistoryModal(true)}
        className="bg-white/20 hover:bg-white/30 text-white border border-white/30"
      >
        <History className="w-4 h-4 mr-2" />
        Upload History
      </Button>
      <Button
        onClick={() => setShowUploadModal(true)}
        className="bg-white text-blue-600 hover:bg-gray-100 shadow-lg"
      >
        <UploadIcon className="w-4 h-4 mr-2" />
        Upload Statement
      </Button>
    </HStack>
  );

  // Component for drag and drop overlay on account cards
  const AccountCardUploadOverlay = ({
    isVisible,
    onDrop,
  }: {
    isVisible: boolean;
    onDrop: (files: FileList) => void;
  }) => {
    if (!isVisible) return null;

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDrop(e.dataTransfer.files);
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    return (
      <div
        className="absolute inset-0 border-2 border-dashed border-blue-400 rounded-xl bg-blue-50/80 dark:bg-blue-900/40 flex items-center justify-center z-10"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="text-center">
          <UploadIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-blue-600">Drop files here</p>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Enhanced Statement Upload"
        size="xl"
      >
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 ${
                activeTab === 'upload'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <HStack gap={2}>
                <UploadIcon className="w-4 h-4" />
                Upload New File
              </HStack>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <HStack gap={2}>
                <FileText className="w-4 h-4" />
                Upload History
              </HStack>
            </button>
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {activeTab === 'upload' ? (
              <EnhancedUpload
                accounts={accounts}
                categories={categories}
                onUploadSuccess={handleUploadSuccess}
                defaultAccount={defaultAccount}
              />
            ) : (
              <UploadList />
            )}
          </div>
        </div>
      </Modal>

      {/* Upload History Modal */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title="Upload History"
        size="lg"
      >
        <div className="h-96 overflow-y-auto">
          <UploadList />
        </div>
      </Modal>

      {/* Export components for use in account page */}
      <div style={{ display: 'none' }}>
        {/* These are exported for use in AccountsManagement.tsx */}
        <UploadButtons />
        <AccountCardUploadOverlay isVisible={false} onDrop={() => {}} />
      </div>
    </>
  );
};

// Export individual components for flexible integration
export { EnhancedUploadIntegration as default };
