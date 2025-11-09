import React, { useState } from 'react';
import { Upload as UploadIcon, FileText, Settings } from 'lucide-react';
import { Upload } from './Upload';
import { UploadList } from './UploadList';
import { Modal } from '../../components/ui/Modal';
import type { Account } from '../../types';

interface BankStatementUploadProps {
  accounts: Account[];
}

export const BankStatementUpload: React.FC<BankStatementUploadProps> = ({ accounts }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const tabs = [
    {
      id: 'upload' as const,
      name: 'Upload Files',
      icon: UploadIcon,
      description: 'Upload bank statements and transaction files',
    },
    {
      id: 'history' as const,
      name: 'Upload History',
      icon: FileText,
      description: 'View and manage uploaded files',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Bank Statements</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Upload and manage your bank statements and transaction files
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'upload' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Upload */}
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
                  Quick Upload
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Drag and drop files directly on accounts in the accounts page, or use the upload
                  button for account selection.
                </p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="w-full bg-slate-900 dark:bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
                >
                  <UploadIcon className="w-4 h-4 inline mr-2" />
                  Upload Files
                </button>
              </div>

              {/* Supported Formats */}
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
                  Supported Formats
                </h3>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li className="flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-red-500" />
                    <strong>PDF:</strong> Bank statements with password support
                  </li>
                  <li className="flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-green-500" />
                    <strong>CSV:</strong> Transaction data with flexible column mapping
                  </li>
                  <li className="flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-blue-500" />
                    <strong>JSON:</strong> Structured transaction data
                  </li>
                  <li className="flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-emerald-500" />
                    <strong>Excel:</strong> .xls and .xlsx spreadsheets
                  </li>
                </ul>
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>AI-Powered:</strong> Automatic transaction categorization and duplicate
                    detection included
                  </p>
                </div>
              </div>
            </div>

            {/* Processing Features */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
                Smart Processing Features
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h4 className="font-medium text-slate-900 dark:text-white mb-2">
                    Auto-Categorization
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Automatically categorizes transactions using AI merchant pattern matching
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h4 className="font-medium text-slate-900 dark:text-white mb-2">
                    Duplicate Detection
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Prevents importing the same transactions multiple times
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <UploadIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h4 className="font-medium text-slate-900 dark:text-white mb-2">
                    Transaction Linking
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Automatically detects transfers and related transactions
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && <UploadList key={refreshKey} />}
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Bank Statement"
        size="lg"
      >
        <Upload
          accounts={accounts}
          onUploadSuccess={() => {
            setShowUploadModal(false);
            setActiveTab('history');
            setRefreshKey((prev) => prev + 1);
          }}
        />
      </Modal>
    </div>
  );
};

export default BankStatementUpload;
