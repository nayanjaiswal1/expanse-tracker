import { useState, useRef, useEffect } from 'react';
import { Plus, Upload, Receipt, FileText, Wallet, DollarSign } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface ActionMenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  color?: string;
}

interface FloatingActionMenuProps {
  onQuickAddTransaction?: () => void;
  onUploadInvoice?: () => void;
  onUploadReceipt?: () => void;
  onUploadStatement?: () => void;
  onAddAccount?: () => void;
}

export const FloatingActionMenu: React.FC<FloatingActionMenuProps> = ({
  onQuickAddTransaction,
  onUploadInvoice,
  onUploadReceipt,
  onUploadStatement,
  onAddAccount,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const handleQuickAdd = () => {
    if (onQuickAddTransaction) {
      onQuickAddTransaction();
    } else {
      navigate('/transactions', { state: { openQuickAdd: true } });
    }
    setIsOpen(false);
  };

  const handleUploadInvoice = () => {
    if (onUploadInvoice) {
      onUploadInvoice();
    } else {
      navigate('/transactions', { state: { openInvoiceUpload: true } });
    }
    setIsOpen(false);
  };

  const handleUploadReceipt = () => {
    if (onUploadReceipt) {
      onUploadReceipt();
    } else {
      navigate('/transactions', { state: { openReceiptUpload: true } });
    }
    setIsOpen(false);
  };

  const handleUploadStatement = () => {
    if (onUploadStatement) {
      onUploadStatement();
    } else {
      navigate('/accounts', { state: { openStatementUpload: true } });
    }
    setIsOpen(false);
  };

  const handleAddAccount = () => {
    if (onAddAccount) {
      onAddAccount();
    } else {
      navigate('/accounts', { state: { openAddAccountModal: true } });
    }
    setIsOpen(false);
  };

  const menuItems: ActionMenuItem[] = [
    {
      id: 'quick-add',
      label: 'Quick Add Transaction',
      icon: DollarSign,
      onClick: handleQuickAdd,
      color: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600',
    },
    {
      id: 'upload-invoice',
      label: 'Upload Invoice',
      icon: Upload,
      onClick: handleUploadInvoice,
      color: 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600',
    },
    {
      id: 'upload-receipt',
      label: 'Upload Receipt',
      icon: Receipt,
      onClick: handleUploadReceipt,
      color: 'bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600',
    },
    {
      id: 'upload-statement',
      label: 'Upload Bank Statement',
      icon: FileText,
      onClick: handleUploadStatement,
      color: 'bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600',
    },
    {
      id: 'add-account',
      label: 'Add Account',
      icon: Wallet,
      onClick: handleAddAccount,
      color: 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600',
    },
  ];

  return (
    <div ref={menuRef} className="fixed bottom-8 right-8 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-16 right-0 mb-2"
          >
            <div className="flex flex-col gap-2 bg-white dark:bg-slate-800 rounded-lg shadow-2xl p-3 border border-slate-200 dark:border-slate-700 min-w-[240px]">
              {menuItems.map((item, index) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={item.onClick}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all hover:scale-[1.02] text-white shadow-sm ${item.color}`}
                >
                  <div className="flex-shrink-0">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center h-14 w-14 rounded-full shadow-2xl transition-all hover:scale-110 ${
          isOpen
            ? 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700'
            : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
        }`}
        whileTap={{ scale: 0.95 }}
        animate={{ rotate: isOpen ? 45 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <Plus className="h-6 w-6 text-white" />
      </motion.button>

      {/* Overlay hint text when closed */}
      {!isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-16 right-0 mb-2 mr-2 pointer-events-none"
        >
          <div className="bg-slate-900/90 dark:bg-slate-700/90 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
            Quick Actions
          </div>
        </motion.div>
      )}
    </div>
  );
};
