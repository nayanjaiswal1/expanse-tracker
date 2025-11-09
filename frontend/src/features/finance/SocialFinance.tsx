import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { SocialFinanceHeader } from './components/socialFinance/SocialFinanceHeader';
import { SocialFinanceTabSwitcher } from './components/socialFinance/SocialFinanceTabSwitcher';
import { SocialFinanceGroupsGrid } from './components/socialFinance/SocialFinanceGroupsGrid';
import { SocialFinanceContactList } from './components/socialFinance/SocialFinanceContactList';
import { SocialFinanceContactDetails } from './components/socialFinance/SocialFinanceContactDetails';
import {
  SocialFinanceRepaymentModal,
  type RepaymentFormData,
} from './components/socialFinance/SocialFinanceRepaymentModal';
import { SocialFinanceContactModal } from './components/socialFinance/SocialFinanceContactModal';
import { SocialFinanceGroupModal } from './components/socialFinance/SocialFinanceGroupModal';
import { SocialFinanceLendingTransactionModal } from './components/socialFinance/SocialFinanceLendingTransactionModal';
import { SocialFinanceExpenseModal } from './components/socialFinance/SocialFinanceExpenseModal';
import { useSocialFinanceData } from './hooks/socialFinance/useSocialFinanceData';
import type { LendingTransaction } from '../../types';
import type {
  SocialFinanceGroup,
  SocialFinanceContactBalance,
} from './hooks/socialFinance/useSocialFinanceData';

export const SocialFinance: React.FC = () => {
  const { state: authState } = useAuth();
  const { showSuccess, showError } = useToast();

  const { contacts, accounts, groups, lendingTransactions, contactBalances, loading, refresh } =
    useSocialFinanceData();

  // Tab state
  const [activeTab, setActiveTab] = useState<'groups' | 'lending'>('groups');

  const [showCreateContactModal, setShowCreateContactModal] = useState(false);

  // Group expenses state
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);

  // Lending state
  const [selectedContact, setSelectedContact] = useState<SocialFinanceContactBalance | null>(null);
  const [contactTransactions, setContactTransactions] = useState<LendingTransaction[]>([]);
  const [showCreateLendingModal, setShowCreateLendingModal] = useState(false);
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<LendingTransaction | null>(null);

  // Group expense state
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<SocialFinanceGroup | null>(null);

  // Form states
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    members: [] as number[],
  });

  const [newLendingTransaction, setNewLendingTransaction] = useState({
    contact: '',
    account: '',
    transaction_type: 'lent' as 'lent' | 'borrowed',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [repaymentData, setRepaymentData] = useState<RepaymentFormData>({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [newExpense, setNewExpense] = useState({
    title: '',
    description: '',
    total_amount: '',
    date: new Date().toISOString().split('T')[0],
    account: '',
    paid_by: authState.user?.id || 1,
    notes: '',
    split_method: 'equal' as 'equal' | 'custom',
    shares: [] as { contact_id: number; amount: number }[],
  });

  // Receipt upload state

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      setActiveDropdown(null);
      // Close member dropdown if clicked outside
      const target = event.target as Element;
      if (!target.closest('.member-dropdown')) {
        setShowMemberDropdown(false);
      }
    };

    if (showMemberDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMemberDropdown]);

  const loadContactTransactions = async (contactId: number) => {
    try {
      const allTransactions = await apiClient.getLendingTransactions();
      const filtered = allTransactions.filter((t) => t.contact === contactId);
      setContactTransactions(filtered);
    } catch (error) {
      console.error('Failed to load contact transactions:', error);
      showError('Failed to load transactions', 'Please try again');
    }
  };

  const handleContactSelect = async (contact: SocialFinanceContactBalance) => {
    setSelectedContact(contact);
    await loadContactTransactions(contact.id);
  };

  const handleRecordRepaymentClick = useCallback((transaction: LendingTransaction) => {
    setSelectedTransaction(transaction);
    setRepaymentData((prev) => ({
      ...prev,
      amount: transaction.remaining_amount.toString(),
    }));
    setShowRepaymentModal(true);
  }, []);

  const handleRepaymentDataChange = useCallback((updates: Partial<RepaymentFormData>) => {
    setRepaymentData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name.trim()) {
      showError('Name Required', 'Please enter a contact name');
      return;
    }

    try {
      const contact = await apiClient.createContact(newContact);
      setNewContact({ name: '', email: '', phone: '' });
      setShowCreateContactModal(false);
      await refresh();
      showSuccess('Contact Added', `${contact.name} has been added successfully`);
    } catch (error) {
      console.error('Failed to add contact:', error);
      showError('Failed to add contact', 'Please try again');
    }
  };

  // Memoized handlers to prevent modal flickering
  const handleGroupNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewGroup((prev) => ({ ...prev, name: e.target.value }));
  }, []);

  const handleGroupDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewGroup((prev) => ({ ...prev, description: e.target.value }));
  }, []);

  const handleMemberSelect = useCallback((contactId: number) => {
    setNewGroup((prev) => ({
      ...prev,
      members: prev.members.includes(contactId)
        ? prev.members.filter((id) => id !== contactId)
        : [...prev.members, contactId],
    }));
  }, []);

  const handleRemoveMember = useCallback((contactId: number) => {
    setNewGroup((prev) => ({
      ...prev,
      members: prev.members.filter((id) => id !== contactId),
    }));
  }, []);

  const handleMemberDropdownToggle = useCallback(() => {
    setShowMemberDropdown((prev) => !prev);
  }, []);

  const handleContactFieldChange = useCallback(
    (field: 'name' | 'email' | 'phone', value: string) => {
      setNewContact((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleLendingTransactionChange = useCallback(
    (
      updates: Partial<{
        contact: string;
        account: string;
        transaction_type: 'lent' | 'borrowed';
        amount: string;
        description: string;
        date: string;
        notes: string;
      }>
    ) => {
      setNewLendingTransaction((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const handleExpenseChange = useCallback(
    (
      updates: Partial<{
        description: string;
        total_amount: string;
        date: string;
        account: string;
        notes: string;
      }>
    ) => {
      setNewExpense((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const handleCloseGroupModal = useCallback(() => {
    setShowCreateGroupModal(false);
    setShowMemberDropdown(false);
  }, []);

  // Get selected contacts for display
  const selectedContacts = useMemo(
    () => contacts.filter((contact) => newGroup.members.includes(contact.id)),
    [contacts, newGroup.members]
  );

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroup.name.trim()) {
      showError('Group Name Required', 'Please enter a group name');
      return;
    }

    try {
      // Create an initial GroupExpense to establish the group
      // This ensures the group persists and will reload properly
      if (!accounts.length) {
        showError('No Account Found', 'Please add an account first to create a group');
        return;
      }

      const initialExpenseData = {
        account: accounts[0].id, // Use first available account
        title: newGroup.name,
        description: newGroup.description || `Initial setup for ${newGroup.name} group`,
        total_amount: '0.01', // Minimal amount to create the group
        currency: authState.user?.preferred_currency || 'USD',
        date: new Date().toISOString().split('T')[0],
        paid_by: Number(authState.user?.id) || 1,
        status: 'active' as const,
        notes: 'Group creation - initial placeholder expense',
      };

      await apiClient.createGroupExpense(initialExpenseData);

      // Reload data to reflect the new group
      await refresh();

      setNewGroup({ name: '', description: '', members: [] });
      setShowCreateGroupModal(false);
      setShowMemberDropdown(false);
      showSuccess('Group Created', `${newGroup.name} has been created successfully`);
    } catch (error) {
      console.error('Failed to create group:', error);
      showError('Failed to create group', 'Please try again');
    }
  };

  const handleCreateLendingTransaction = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !newLendingTransaction.contact ||
      !newLendingTransaction.account ||
      !newLendingTransaction.amount ||
      !newLendingTransaction.description.trim()
    ) {
      showError('Missing Information', 'Please fill in all required fields');
      return;
    }

    try {
      await apiClient.createLendingTransaction({
        ...newLendingTransaction,
        contact: parseInt(newLendingTransaction.contact),
        account: parseInt(newLendingTransaction.account),
        date: new Date(newLendingTransaction.date).toISOString(),
        currency: 'USD',
        repaid_amount: '0.00',
        status: 'active',
      });

      setNewLendingTransaction({
        contact: '',
        account: '',
        transaction_type: 'lent',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setShowCreateLendingModal(false);

      await refresh();
      if (selectedContact) {
        await loadContactTransactions(selectedContact.id);
      }

      showSuccess('Transaction Added', 'Lending transaction has been recorded successfully');
    } catch (error) {
      console.error('Failed to create lending transaction:', error);
      showError('Failed to create transaction', 'Please try again');
    }
  };

  const handleRecordRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransaction || !repaymentData.amount) {
      showError('Missing Information', 'Please enter repayment amount');
      return;
    }

    try {
      await apiClient.recordLendingRepayment(
        selectedTransaction.id,
        repaymentData.amount,
        repaymentData.date,
        repaymentData.notes
      );

      setRepaymentData({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setShowRepaymentModal(false);
      setSelectedTransaction(null);

      await refresh();
      if (selectedContact) {
        await loadContactTransactions(selectedContact.id);
      }

      showSuccess('Repayment Recorded', 'Payment has been recorded successfully');
    } catch (error) {
      console.error('Failed to record repayment:', error);
      showError('Failed to record repayment', 'Please try again');
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !selectedGroup ||
      !newExpense.total_amount ||
      !newExpense.account ||
      !newExpense.description.trim()
    ) {
      showError('Missing Information', 'Please fill in all required fields');
      return;
    }

    try {
      const expenseData = {
        account: parseInt(newExpense.account),
        title: selectedGroup.name,
        description: newExpense.description,
        total_amount: newExpense.total_amount,
        currency: authState.user?.preferred_currency || 'USD',
        date: newExpense.date,
        paid_by: Number(authState.user?.id) || 1,
        status: 'active' as const,
        notes: newExpense.notes || `Group expense for ${selectedGroup.name}`,
      };

      await apiClient.createGroupExpense(expenseData);

      setNewExpense({
        title: '',
        description: '',
        total_amount: '',
        date: new Date().toISOString().split('T')[0],
        account: '',
        paid_by: authState.user?.id || 1,
        notes: '',
        split_method: 'equal',
        shares: [],
      });
      setShowAddExpenseModal(false);
      setSelectedGroup(null);

      await refresh();
      showSuccess('Expense Added', `Expense has been added to ${selectedGroup.name} successfully`);
    } catch (error) {
      console.error('Failed to add expense:', error);
      showError('Failed to add expense', 'Please try again');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-yellow-100 text-yellow-800',
      partially_repaid: 'bg-blue-100 text-blue-800',
      fully_repaid: 'bg-green-100 text-green-800',
      written_off: 'bg-red-100 text-red-800',
    };

    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  return loading ? (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  ) : (
    <div className="space-y-6">
      <SocialFinanceHeader
        groupsCount={groups.length}
        lendingContactsCount={contactBalances.length}
        contactsCount={contacts.length}
        activeTab={activeTab}
        onAddContact={() => setShowCreateContactModal(true)}
        onPrimaryAction={() =>
          activeTab === 'groups' ? setShowCreateGroupModal(true) : setShowCreateLendingModal(true)
        }
      />

      <SocialFinanceTabSwitcher
        activeTab={activeTab}
        groupsCount={groups.length}
        lendingTransactionCount={lendingTransactions.length}
        onTabChange={(tab) => setActiveTab(tab)}
      />

      {/* Content */}
      {activeTab === 'groups' && (
        <div className="space-y-6">
          <SocialFinanceGroupsGrid
            groups={groups}
            user={authState.user}
            activeDropdown={activeDropdown}
            onDropdownToggle={(groupId) => setActiveDropdown(groupId)}
            onCreateGroup={() => setShowCreateGroupModal(true)}
            onAddExpense={(group) => {
              setShowAddExpenseModal(true);
              setSelectedGroup(group);
            }}
          />
        </div>
      )}

      {activeTab === 'lending' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Contact List - Khata Book Style */}
          <div className="lg:col-span-2">
            <SocialFinanceContactList
              contacts={contactBalances}
              selectedContactId={selectedContact?.id ?? null}
              onSelect={handleContactSelect}
              onCreateContact={() => setShowCreateContactModal(true)}
              user={authState.user}
            />
          </div>

          {/* Transaction Details */}
          <div className="lg:col-span-3">
            <SocialFinanceContactDetails
              contact={selectedContact}
              transactions={contactTransactions}
              user={authState.user}
              onRecordRepayment={handleRecordRepaymentClick}
              getStatusBadge={getStatusBadge}
            />
          </div>
        </div>
      )}

      <SocialFinanceContactModal
        isOpen={showCreateContactModal}
        contact={newContact}
        onFieldChange={handleContactFieldChange}
        onSubmit={handleCreateContact}
        onClose={() => setShowCreateContactModal(false)}
      />

      <SocialFinanceGroupModal
        isOpen={showCreateGroupModal}
        group={newGroup}
        contacts={contacts}
        selectedContacts={selectedContacts}
        showMemberDropdown={showMemberDropdown}
        onToggleMemberDropdown={handleMemberDropdownToggle}
        onMemberSelect={handleMemberSelect}
        onMemberRemove={handleRemoveMember}
        onNameChange={handleGroupNameChange}
        onDescriptionChange={handleGroupDescriptionChange}
        onSubmit={handleCreateGroup}
        onClose={handleCloseGroupModal}
      />

      {/* Create Lending Transaction Modal */}
      <SocialFinanceLendingTransactionModal
        isOpen={showCreateLendingModal}
        transaction={newLendingTransaction}
        contacts={contacts}
        accounts={accounts}
        onChange={handleLendingTransactionChange}
        onSubmit={handleCreateLendingTransaction}
        onClose={() => setShowCreateLendingModal(false)}
      />

      <SocialFinanceRepaymentModal
        isOpen={showRepaymentModal}
        transaction={selectedTransaction}
        repaymentData={repaymentData}
        onChange={handleRepaymentDataChange}
        onSubmit={handleRecordRepayment}
        onClose={() => setShowRepaymentModal(false)}
        user={authState.user}
      />

      <SocialFinanceExpenseModal
        isOpen={showAddExpenseModal}
        groupName={selectedGroup?.name}
        expense={newExpense}
        accounts={accounts}
        onChange={handleExpenseChange}
        onSubmit={handleAddExpense}
        onClose={() => setShowAddExpenseModal(false)}
      />
    </div>
  );
};
