import React, { useState, useMemo } from 'react';
import { Users, User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/preferences';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/Button';

// Clean, single-responsibility components
import { IndividualLending } from './components/IndividualLending';
import { GroupLending } from './components/GroupLending';
import { ExpenseOverviewSidebar } from './components/ExpenseOverviewSidebar';

// API hooks for dynamic data
import { useIndividualLendingSummary } from './hooks/useIndividualLending';
import { useSplitwiseGroups } from './hooks/useSplitwiseGroups';
import { PageToolbar } from '../../components/layout/PageToolbar';
import { useModalStates } from '../../hooks/useCrudModals';

const ExpenseTracker: React.FC = () => {
  const { state: authState } = useAuth();

  // State - Simplified to two main views
  const [activeView, setActiveView] = useState<'individual' | 'groups'>('individual');
  const [showBalances, setShowBalances] = useState(true);
  const [groupSearch, setGroupSearch] = useState('');
  const { states: modalStates, toggle: toggleModal } = useModalStates({
    filters: false,
    overview: false,
  });
  const [activeFilterSection, setActiveFilterSection] = useState<'view'>('view');

  // Real API data
  const { data: lendingSummary, refetch: refetchLendingSummary } = useIndividualLendingSummary();
  const groupQueryFilters = useMemo(
    () =>
      activeView === 'groups' && groupSearch.trim() ? { search: groupSearch.trim() } : undefined,
    [activeView, groupSearch]
  );

  const { data: groups = [], refetch: refetchGroups } = useSplitwiseGroups(groupQueryFilters);

  // Calculate summary stats from real data
  const summaryStats = useMemo(() => {
    const totalLent = lendingSummary?.total_lent || 0;
    const totalBorrowed = lendingSummary?.total_borrowed || 0;
    const totalActivity = totalLent + totalBorrowed;
    const activeGroups = groups.length;

    return {
      totalOwed: totalLent,
      totalOwing: totalBorrowed,
      totalExpenses: totalActivity,
      activeGroups,
    };
  }, [lendingSummary, groups]);

  const appliedFilterChips = useMemo(() => {
    const chips: Array<{ key: 'search' | 'view'; label: string }> = [];

    if (groupSearch.trim()) {
      chips.push({ key: 'search', label: `Search: ${groupSearch.trim()}` });
    }

    if (activeView === 'groups') {
      chips.push({ key: 'view', label: 'View: Money groups' });
    }

    return chips;
  }, [activeView, groupSearch]);

  const onRefresh = () => {
    refetchLendingSummary();
    refetchGroups();
  };

  return (
    <>
      <div
        className={`min-h-screen ${modalStates.overview ? 'grid xl:grid-cols-[minmax(0,1fr)_400px]' : ''}`}
      >
        <div className="space-y-6 pb-12 pt-6 px-4 sm:px-6 lg:px-8">
          <PageToolbar
            searchValue={groupSearch}
            onSearchChange={setGroupSearch}
            onFilterClick={() => toggleModal('filters')}
            onOverviewClick={() => toggleModal('overview')}
            searchPlaceholder="Search groups"
          />

          {appliedFilterChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-700/30 bg-gray-800/30 px-4 py-2 text-sm text-purple-200">
              {appliedFilterChips.map((chip) => (
                <span
                  key={`${chip.key}-${chip.label}`}
                  className="inline-flex items-center gap-2 rounded-full bg-purple-900/60 px-3 py-1 text-sm font-medium shadow-sm"
                >
                  {chip.label}
                  <Button
                    type="button"
                    variant="link-purple"
                    onClick={() => {
                      if (chip.key === 'search') {
                        setGroupSearch('');
                      } else {
                        setActiveView('individual');
                      }
                    }}
                    aria-label={`Remove ${chip.label}`}
                  >
                    ×
                  </Button>
                </span>
              ))}
              <Button
                type="button"
                variant="link-uppercase-accent"
                onClick={() => {
                  setGroupSearch('');
                  setActiveView('individual');
                }}
              >
                Clear all
              </Button>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 border border-gray-200 dark:border-gray-700">
              {[
                { key: 'individual', label: 'Individual Lending', icon: User },
                { key: 'groups', label: 'Money Groups', icon: Users },
              ].map(({ key, label, icon: Icon }) => (
                <Button
                  key={key}
                  onClick={() => setActiveView(key as any)}
                  className={`
                    flex items-center px-6 py-3 rounded-xl transition-all duration-200 font-medium
                    ${
                      activeView === key
                        ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-md shadow-gray-200/50 dark:shadow-gray-900/50'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Content Area - Clean Component Separation */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeView === 'individual' && <IndividualLending showBalances={showBalances} />}

              {activeView === 'groups' && (
                <GroupLending showBalances={showBalances} searchTerm={groupSearch} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {modalStates.overview && (
          <ExpenseOverviewSidebar
            totalOwed={formatCurrency(summaryStats.totalOwed, authState.user)}
            totalOwing={formatCurrency(summaryStats.totalOwing, authState.user)}
            totalExpenses={formatCurrency(summaryStats.totalExpenses, authState.user)}
            activeGroups={summaryStats.activeGroups}
            showBalances={showBalances}
            onClose={() => toggleModal('overview')}
            onToggleBalances={() => setShowBalances((current) => !current)}
            onRefresh={onRefresh}
          />
        )}
      </div>

      {/* Filters Modal */}
      {modalStates.filters && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/25" onClick={() => toggleModal('filters')} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-2xl transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl">
              <div className="flex h-[400px]">
                <div className="w-48 border-r bg-gray-50 dark:bg-gray-900/50 dark:border-gray-700">
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Filter by
                    </h3>
                    <Button
                      onClick={() => setActiveFilterSection('view')}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                        activeFilterSection === 'view'
                          ? 'bg-purple-100 text-purple-900 dark:bg-purple-900/40 dark:text-purple-200'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                      }`}
                    >
                      View
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {activeFilterSection === 'view' && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                        Select view
                      </h4>
                      {[
                        { value: 'individual', label: 'Individual Lending' },
                        { value: 'groups', label: 'Money Groups' },
                      ].map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="view"
                            value={option.value}
                            checked={activeView === option.value}
                            onChange={(e) =>
                              setActiveView(e.target.value as 'individual' | 'groups')
                            }
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {option.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end gap-2">
                <Button
                  onClick={() => {
                    setGroupSearch('');
                    setActiveView('individual');
                  }}
                  variant="ghost"
                  size="sm"
                >
                  Clear all
                </Button>
                <Button onClick={() => toggleModal('filters')} variant="primary" size="sm">
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExpenseTracker;
