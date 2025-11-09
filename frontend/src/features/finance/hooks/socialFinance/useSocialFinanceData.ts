import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../../../api/client';
import { useToast } from '../../../../components/ui/Toast';
import type { Contact, Account, UnifiedTransaction, GroupExpense } from '@/types';

export type SocialFinanceTab = 'groups' | 'lending';

export interface SocialFinanceGroup {
  id: number;
  name: string;
  description: string;
  members: Contact[];
  balance: number;
  totalExpenses: number;
  recentActivity: string;
}

export interface SocialFinanceContactBalance {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  totalLent: number;
  totalBorrowed: number;
  netBalance: number;
  lastActivity: string;
  transactionCount: number;
}

interface UseSocialFinanceDataResult {
  contacts: Contact[];
  accounts: Account[];
  groups: SocialFinanceGroup[];
  lendingTransactions: UnifiedTransaction[];
  contactBalances: SocialFinanceContactBalance[];
  loading: boolean;
  refresh: () => Promise<void>;
}

export const useSocialFinanceData = (): UseSocialFinanceDataResult => {
  const { showError } = useToast();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [groups, setGroups] = useState<SocialFinanceGroup[]>([]);
  const [lendingTransactions, setLendingTransactions] = useState<UnifiedTransaction[]>([]);
  const [contactBalances, setContactBalances] = useState<SocialFinanceContactBalance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    const failedServices: string[] = [];
    let contactsData: Contact[] = [];
    let accountsData: Account[] = [];
    let groupExpensesData: GroupExpense[] = [];
    let lendingData: UnifiedTransaction[] = [];

    try {
      console.log('Loading social finance data...');

      try {
        contactsData = await apiClient.getContacts();
        console.log('Contacts loaded:', contactsData.length);
      } catch (err) {
        console.error('Failed to load contacts:', err);
        failedServices.push('contacts');
      }

      try {
        accountsData = await apiClient.getAccounts();
        console.log('Accounts loaded:', accountsData.length);
      } catch (err) {
        console.error('Failed to load accounts:', err);
        failedServices.push('accounts');
      }

      try {
        groupExpensesData = await apiClient.getExpenseGroups();
        console.log('Group expenses loaded:', groupExpensesData.length);
      } catch (err) {
        console.error('Failed to load group expenses:', err);
        failedServices.push('group expenses');
      }

      try {
        lendingData = await apiClient.getLendingTransactions();
        console.log('Lending transactions loaded:', lendingData.length);
      } catch (err) {
        console.error('Failed to load lending transactions:', err);
        failedServices.push('lending transactions');
      }

      setContacts(contactsData);
      setAccounts(accountsData);
      setLendingTransactions(lendingData);

      const groupsMap = new Map<number, SocialFinanceGroup>();
      groupExpensesData.forEach((groupItem: any) => {
        // Assuming groupItem has id, name, description, created_at
        if (!groupsMap.has(groupItem.id)) {
          groupsMap.set(groupItem.id, {
            id: groupItem.id,
            name: groupItem.name,
            description: groupItem.description || '',
            members: [],
            balance: 0, // Not directly available from getExpenseGroups
            totalExpenses: 0, // Not directly available from getExpenseGroups
            recentActivity: groupItem.created_at
              ? new Date(groupItem.created_at).toLocaleDateString()
              : 'N/A',
          });
        }
      });

      setGroups(Array.from(groupsMap.values()));

      const contactMap = new Map<number, SocialFinanceContactBalance>();

      contactsData.forEach((contact) => {
        contactMap.set(contact.id, {
          id: contact.id,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          totalLent: 0,
          totalBorrowed: 0,
          netBalance: 0,
          lastActivity: 'Never',
          transactionCount: 0,
        });
      });

      lendingData.forEach((transaction) => {
        const contactId = transaction.contact_user;
        if (contactId === undefined) return; // Ensure contactId is defined

        const contactBalance = contactMap.get(contactId);
        if (!contactBalance) return;

        const amount = parseFloat(transaction.amount);
        const remainingAmount = transaction.remaining_amount ?? 0; // Handle undefined

        if (transaction.transaction_type === 'lend') {
          contactBalance.totalLent += amount;
          contactBalance.netBalance += remainingAmount;
        } else if (transaction.transaction_type === 'borrow') {
          // Explicitly check for 'borrow'
          contactBalance.totalBorrowed += amount;
          contactBalance.netBalance -= remainingAmount;
        }

        contactBalance.transactionCount++;
        contactBalance.lastActivity = new Date(transaction.date).toLocaleDateString();
      });

      setContactBalances(Array.from(contactMap.values()).filter((cb) => cb.transactionCount > 0));

      if (failedServices.length > 0) {
        const failedList = failedServices.join(', ');
        showError(
          'Partial Data Load',
          `Could not load: ${failedList}. Some features may not work properly.`
        );
      }
    } catch (error: unknown) {
      console.error('Unexpected error during data loading:', error);
      showError(
        'Failed to load data',
        'An unexpected error occurred. Please try refreshing the page.'
      );
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await loadData();
  }, [loadData]);

  return {
    contacts,
    accounts,
    groups,
    lendingTransactions,
    contactBalances,
    loading,
    refresh,
  };
};
