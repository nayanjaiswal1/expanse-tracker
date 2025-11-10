/**
 * Statements Page with Card Carousel
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  Download,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';
import clsx from 'clsx';

// Mock accounts
const mockAccounts = [
  {
    id: '1',
    name: 'HDFC Credit Card',
    type: 'credit',
    lastSync: '2025-11-10',
    balance: -15000,
    color: 'from-blue-600 to-purple-600',
  },
  {
    id: '2',
    name: 'HDFC Savings',
    type: 'savings',
    lastSync: '2025-11-09',
    balance: 45000,
    color: 'from-green-600 to-emerald-600',
  },
  {
    id: '3',
    name: 'ICICI Credit Card',
    type: 'credit',
    lastSync: '2025-11-08',
    balance: -8500,
    color: 'from-orange-600 to-red-600',
  },
];

const mockStatements = [
  {
    id: '1',
    filename: 'HDFC_Statement_Nov_2025.pdf',
    uploadDate: '2025-11-10',
    status: 'completed',
    transactions: 45,
    duplicates: 0,
    parseMethod: 'AI',
  },
  {
    id: '2',
    filename: 'HDFC_Statement_Oct_2025.csv',
    uploadDate: '2025-10-10',
    status: 'completed',
    transactions: 38,
    duplicates: 2,
    parseMethod: 'System',
  },
  {
    id: '3',
    filename: 'HDFC_Statement_Sep_2025.pdf',
    uploadDate: '2025-09-10',
    status: 'processing',
    transactions: 0,
    duplicates: 0,
    parseMethod: 'AI',
  },
];

const AccountCard = ({ account, isActive, onClick }: any) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={clsx(
      'flex-shrink-0 w-80 h-48 rounded-xl p-6 cursor-pointer transition-all',
      'bg-gradient-to-br text-white shadow-lg',
      account.color,
      isActive ? 'ring-4 ring-white' : 'opacity-70'
    )}
  >
    <div className="flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium opacity-90">{account.type.toUpperCase()}</span>
          <span className="text-xs opacity-75">Last sync: {account.lastSync}</span>
        </div>
        <h3 className="text-xl font-bold">{account.name}</h3>
      </div>

      <div>
        <p className="text-xs opacity-75 mb-1">Current Balance</p>
        <p className="text-3xl font-bold">
          ₹{Math.abs(account.balance).toLocaleString()}
          {account.balance < 0 && <span className="text-sm ml-1">due</span>}
        </p>
      </div>
    </div>
  </motion.div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const styles = {
    completed: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
    processing: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
    failed: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
  }[status] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock };

  const Icon = styles.icon;

  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium', styles.bg, styles.text)}>
      <Icon size={12} />
      {status}
    </span>
  );
};

export const StatementsPage = () => {
  const [selectedAccountIndex, setSelectedAccountIndex] = useState(0);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const selectedAccount = mockAccounts[selectedAccountIndex];

  const handlePrevAccount = () => {
    setSelectedAccountIndex((prev) =>
      prev > 0 ? prev - 1 : mockAccounts.length - 1
    );
  };

  const handleNextAccount = () => {
    setSelectedAccountIndex((prev) =>
      prev < mockAccounts.length - 1 ? prev + 1 : 0
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Statements</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your account statements and transactions
        </p>
      </div>

      {/* Account Carousel */}
      <div className="relative">
        <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-hide">
          <button
            onClick={handlePrevAccount}
            className="flex-shrink-0 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex gap-4 flex-1 justify-center">
            {mockAccounts.map((account, index) => (
              <AccountCard
                key={account.id}
                account={account}
                isActive={index === selectedAccountIndex}
                onClick={() => setSelectedAccountIndex(index)}
              />
            ))}
          </div>

          <button
            onClick={handleNextAccount}
            className="flex-shrink-0 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Statements Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">
            Statements for {selectedAccount.name}
          </h3>
          <button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Upload size={16} />
            Upload Statement
          </button>
        </div>

        <div className="p-4">
          <div className="space-y-3">
            {mockStatements.map((statement) => (
              <motion.div
                key={statement.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      {statement.filename}
                    </h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500">
                        Uploaded: {statement.uploadDate}
                      </span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-500">
                        Parsed: {statement.parseMethod}
                      </span>
                      {statement.transactions > 0 && (
                        <>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-500">
                            {statement.transactions} transactions
                          </span>
                        </>
                      )}
                      {statement.duplicates > 0 && (
                        <>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-yellow-600">
                            {statement.duplicates} duplicates
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={statement.status} />
                  <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors">
                    <Eye size={16} />
                  </button>
                  <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors">
                    <Download size={16} />
                  </button>
                  <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors">
                    <RefreshCw size={16} />
                  </button>
                  <button className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {uploadModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setUploadModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg p-6 max-w-md w-full"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Upload Statement
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select parsing method
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="px-4 py-3 border-2 border-blue-600 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                      AI Parser
                    </button>
                    <button className="px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:border-gray-400">
                      System Parser
                    </button>
                  </div>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload size={40} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-1">
                    Drop files here or click to upload
                  </p>
                  <p className="text-xs text-gray-400">
                    Supports CSV and PDF files
                  </p>
                  <input
                    type="file"
                    accept=".csv,.pdf"
                    className="hidden"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setUploadModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Upload
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
