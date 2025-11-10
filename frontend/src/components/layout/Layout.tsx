import { useState, useRef, useEffect } from 'react';
import {
  LogOut,
  CreditCard,
  Menu,
  Grid3X3,
  FolderOpen,
  Settings,
  ChevronLeft,
  Target,
  User,
  ChevronDown,
  Brain,
  Mail,
  Download,
  Bot,
  RefreshCw,
  SettingsIcon,
  Globe,
  Receipt,
  Wallet,
  CheckCircle,
  Code2,
  MessageSquare,
  Lock,
} from 'lucide-react';
import { CreditDisplay } from '../common/CreditDisplay';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { apiClient } from '../../api/client';
import { safeLog } from '../../utils/logger';
import { FlexBetween } from '../ui/Layout';

export const Layout = () => {
  const { state, logout, loadUserSections } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const navigation = [
    { path: '/dashboard', name: 'Dashboard', icon: Grid3X3 },
    { path: '/chat', name: 'Chat', icon: MessageSquare },
    { path: '/transactions', name: 'Operations', icon: FolderOpen },
    { path: '/accounts', name: 'Accounts & Statements', icon: CreditCard },
    { path: '/goals', name: 'Goals', icon: Target },
    { path: '/budgets', name: 'Budgets', icon: Wallet },
    { path: '/expenses', name: 'Expense Tracker', icon: Receipt },
    { path: '/settings', name: 'Settings', icon: Settings },
  ];

  const settingsNavigation = [
    { path: '/settings/profile', name: 'Profile & Appearance', icon: User },
    { path: '/settings/preferences', name: 'Preferences', icon: Globe },
    { path: '/settings/ai-settings', name: 'AI Configuration', icon: Brain },
    { path: '/settings/passwords', name: 'Statement Passwords', icon: Lock },
    { path: '/settings/subscriptions', name: 'Subscriptions', icon: RefreshCw },
    { path: '/settings/automation', name: 'Automation', icon: SettingsIcon },
    { path: '/settings/integrations', name: 'Integrations', icon: Mail },
    { path: '/settings/data', name: 'Data & Privacy', icon: Download },
    ...(state.user?.is_staff
      ? [{ path: '/settings/telegram-admin', name: 'Telegram Bot Admin', icon: Bot }]
      : []),
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch pending transaction count
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const data = await apiClient.getPendingTransactionCount();
        setPendingCount(data.count);
      } catch (error) {
        console.error('Error fetching pending count:', error);
      }
    };

    fetchPendingCount();
    // Poll every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!state.user) return;

    loadUserSections(['profile', 'preferences', 'subscription']).catch((error) => {
      safeLog.warn('Failed to load user sections in layout', error);
    });
  }, [state.user, loadUserSections]);

  // If the user is not logged in, don't render the layout
  if (!state.user) {
    return null;
  }

  const overlayVariants = {
    visible: { opacity: 1 },
    hidden: { opacity: 0 },
  };

  const dropdownVariants: Variants = {
    open: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring' as const, stiffness: 300, damping: 30 },
    },
    closed: { opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.2 } },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-secondary-100 dark:from-secondary-900 dark:to-secondary-800 flex">
      {/* Skip to main content link for screen readers */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 btn btn-primary rounded-md z-50 focus:z-[60]"
      >
        Skip to main content
      </a>

      {/* Sidebar */}
      <motion.aside
        className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-secondary-900 border-r border-secondary-200 dark:border-secondary-800 flex flex-col ${
          isMobile ? 'lg:block' : 'block'
        }`}
        initial={false}
        animate={{
          width: isMobile ? '18rem' : sidebarMinimized ? '5rem' : '18rem',
          x: isMobile ? (sidebarOpen ? 0 : '-100%') : 0,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 35, mass: 0.8 }}
        aria-label="Sidebar navigation"
      >
        {/* Logo */}
        <motion.div
          className={`flex items-center h-20 border-b border-secondary-200 dark:border-secondary-800 relative overflow-hidden`}
          animate={{
            paddingLeft: sidebarMinimized ? '1rem' : '1.5rem',
            paddingRight: sidebarMinimized ? '1rem' : '1.5rem',
            justifyContent: sidebarMinimized ? 'center' : 'flex-start',
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        >
          <motion.div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg p-2.5 shadow-sm">
            <CreditCard className="h-6 w-6" />
          </motion.div>

          <AnimatePresence>
            {!sidebarMinimized && (
              <motion.h1
                className="text-xl font-bold text-secondary-800 dark:text-secondary-100 tracking-wide ml-3"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ delay: 0.15, duration: 0.25 }}
              >
                BUDGETON
              </motion.h1>
            )}
          </AnimatePresence>

          {/* Minimize Button - Only show on desktop */}
          <motion.button
            onClick={() => setSidebarMinimized(!sidebarMinimized)}
            className={`hidden lg:flex absolute top-1/2 -translate-y-1/2 right-4 h-8 w-8 items-center justify-center rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-secondary-600 dark:text-secondary-400 shadow-md hover:bg-secondary-50 dark:hover:bg-secondary-700 hover:text-secondary-900 dark:hover:text-secondary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transition-colors z-50`}
            aria-label={sidebarMinimized ? 'Expand sidebar' : 'Minimize sidebar'}
            aria-expanded={!sidebarMinimized}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              initial={false}
              animate={{ rotate: sidebarMinimized ? 180 : 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              <ChevronLeft className="h-4 w-4" />
            </motion.div>
          </motion.button>
        </motion.div>

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Back to Main Navigation Button */}
          {location.pathname.startsWith('/settings') && (
            <div className="px-4 py-2 border-b border-secondary-200 dark:border-secondary-800">
              <motion.button
                onClick={() => navigate('/dashboard')}
                className={`group flex items-center w-full ${
                  sidebarMinimized ? 'px-3 py-3 justify-center' : 'px-4 py-2.5'
                } text-sm font-semibold rounded-lg transition-colors duration-200 text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800 hover:text-secondary-900 dark:hover:text-secondary-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2`}
                title={sidebarMinimized ? 'Back to Dashboard' : undefined}
                whileHover={{ x: -5 }}
                whileTap={{ scale: 0.98 }}
              >
                <ChevronLeft
                  className={`${
                    sidebarMinimized ? '' : 'mr-3'
                  } h-5 w-5 transition-colors text-secondary-400 dark:text-secondary-500 group-hover:text-secondary-600 dark:group-hover:text-secondary-300`}
                />
                {!sidebarMinimized && (
                  <span className="overflow-hidden whitespace-nowrap">Back to Dashboard</span>
                )}

                {/* Tooltip for minimized state */}
                {sidebarMinimized && (
                  <span className="absolute left-full ml-4 px-3 py-2 bg-secondary-800 dark:bg-secondary-700 text-secondary-100 dark:text-secondary-100 border border-secondary-700 dark:border-secondary-600 text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
                    Back to Dashboard
                    <span className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-secondary-800 dark:bg-secondary-700 transform rotate-45"></span>
                  </span>
                )}
              </motion.button>
            </div>
          )}

          <nav
            className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-secondary-300 dark:scrollbar-thumb-secondary-600 scrollbar-track-transparent"
            aria-label="Main navigation"
          >
            <AnimatePresence>
              {(location.pathname.startsWith('/settings') ? settingsNavigation : navigation).map(
                (item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.path);

                  return (
                    <motion.div
                      key={item.path}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Link
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={`group flex items-center ${
                          sidebarMinimized ? 'px-3 py-3 justify-center' : 'px-4 py-2.5'
                        } text-sm font-semibold rounded-lg transition-all duration-200 relative focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
                          isActive
                            ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-300 shadow-sm'
                            : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800 hover:text-secondary-900 dark:hover:text-secondary-200 hover:scale-105'
                        }`}
                        title={sidebarMinimized ? item.name : undefined}
                      >
                        <Icon
                          className={`${sidebarMinimized ? '' : 'mr-3'} h-5 w-5 transition-colors ${
                            isActive
                              ? 'text-primary-500 dark:text-primary-300'
                              : 'text-secondary-400 dark:text-secondary-500 group-hover:text-secondary-600 dark:group-hover:text-secondary-300'
                          }`}
                        />
                        {!sidebarMinimized && (
                          <span className="overflow-hidden whitespace-nowrap flex items-center gap-2">
                            {item.name}
                            {item.path === '/transactions' && pendingCount > 0 && (
                              <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-yellow-500 rounded-full min-w-[1.25rem]">
                                {pendingCount}
                              </span>
                            )}
                          </span>
                        )}

                        {/* Tooltip for minimized state */}
                        {sidebarMinimized && (
                          <span className="absolute left-full ml-4 px-3 py-2 bg-secondary-800 dark:bg-secondary-700 text-secondary-100 dark:text-secondary-100 border border-secondary-700 dark:border-secondary-600 text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg flex items-center gap-2">
                            <span>{item.name}</span>
                            {item.path === '/transactions' && pendingCount > 0 && (
                              <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-yellow-500 rounded-full min-w-[1.25rem]">
                                {pendingCount}
                              </span>
                            )}
                            <span className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-secondary-800 dark:bg-secondary-700 transform rotate-45"></span>
                          </span>
                        )}

                        {/* Badge for minimized state */}
                        {sidebarMinimized && item.path === '/transactions' && pendingCount > 0 && (
                          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold leading-none text-white bg-yellow-500 rounded-full">
                            {pendingCount > 9 ? '9+' : pendingCount}
                          </span>
                        )}
                      </Link>
                    </motion.div>
                  );
                }
              )}
            </AnimatePresence>
          </nav>

          {/* User Section */}
          <div className="border-secondary-200 dark:border-secondary-700 border-t p-4 bg-white dark:bg-secondary-900 mt-auto">
            {sidebarMinimized ? (
              <div className="flex flex-col items-center space-y-3">
                <div className="relative" ref={dropdownRef}>
                  <motion.button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="bg-secondary-100 dark:bg-secondary-700 rounded-full h-10 w-10 flex items-center justify-center group relative hover:bg-secondary-100 dark:hover:bg-secondary-600 transition-colors overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                    aria-label="Profile menu"
                    whileTap={{ scale: 0.9 }}
                  >
                    {state.user.profile_photo_thumbnail_url || state.user.profile_photo_url ? (
                      <img
                        src={state.user.profile_photo_thumbnail_url || state.user.profile_photo_url}
                        alt="Profile"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <span className="text-lg font-medium text-secondary-900 dark:text-secondary-100">
                        {state.user.full_name?.charAt(0) || state.user.email?.charAt(0) || 'U'}
                      </span>
                    )}
                  </motion.button>

                  {/* Profile Dropdown - Minimized */}
                  <AnimatePresence>
                    {profileDropdownOpen && (
                      <motion.div
                        className="absolute left-full ml-4 bottom-0 bg-white dark:bg-secondary-700 border-secondary-200 dark:border-secondary-600 border rounded-lg shadow-xl py-2 w-48 z-50"
                        variants={dropdownVariants}
                        initial="closed"
                        animate="open"
                        exit="closed"
                      >
                        <div className="px-4 py-2 border-secondary-200 dark:border-secondary-700 border-b">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100 truncate">
                              {state.user.full_name || 'User'}
                            </p>
                            {state.user.is_verified && (
                              <CheckCircle className="h-4 w-4 text-blue-500" />
                            )}
                          </div>
                          <p className="text-xs text-secondary-500 dark:text-secondary-400 truncate block max-w-full overflow-hidden">
                            {state.user.email}
                          </p>
                        </div>
                        <motion.button
                          onClick={() => {
                            navigate('/settings/profile');
                            setProfileDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-600 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                          whileHover={{ x: 5 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <User className="h-4 w-4" />
                          Profile Settings
                        </motion.button>
                        <motion.button
                          onClick={() => {
                            navigate('/settings');
                            setProfileDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-600 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                          whileHover={{ x: 5 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Settings className="h-4 w-4" />
                          All Settings
                        </motion.button>
                        <motion.button
                          onClick={() => {
                            logout();
                            setProfileDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-600 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                          whileHover={{ x: 5 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <LogOut className="h-4 w-4" />
                          Logout
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <FlexBetween
                  as={motion.button}
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="w-full hover:bg-secondary-100 dark:hover:bg-secondary-600 p-2 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                  aria-label="Profile menu"
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="bg-secondary-100 dark:bg-secondary-700 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {state.user.profile_photo_thumbnail_url || state.user.profile_photo_url ? (
                        <img
                          src={
                            state.user.profile_photo_thumbnail_url || state.user.profile_photo_url
                          }
                          alt="Profile"
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <span className="text-lg font-medium text-secondary-900 dark:text-secondary-100">
                          {state.user.full_name?.charAt(0) || state.user.email?.charAt(0) || 'U'}
                        </span>
                      )}
                    </div>
                    <div className="ml-4 flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-medium text-secondary-900 dark:text-secondary-100 truncate">
                          {state.user.full_name || 'User'}
                        </p>
                        {state.user.is_verified && (
                          <CheckCircle className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      <p className="text-sm text-secondary-500 dark:text-secondary-400 truncate block max-w-full">
                        {state.user.email}
                      </p>
                      {state.user.ai_credits_remaining !== undefined && (
                        <div className="mt-1">
                          <CreditDisplay
                            credits={state.user.ai_credits_remaining}
                            showLabel={false}
                            className="justify-start"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: profileDropdownOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-4 w-4 text-secondary-500 dark:text-secondary-400" />
                  </motion.div>
                </FlexBetween>

                {/* Profile Dropdown - Expanded */}
                <AnimatePresence>
                  {profileDropdownOpen && (
                    <motion.div
                      className="absolute bottom-full mb-2 left-0 right-0 bg-white dark:bg-secondary-700 border-secondary-200 dark:border-secondary-600 border rounded-lg shadow-xl py-2 z-50"
                      variants={dropdownVariants}
                      initial="closed"
                      animate="open"
                      exit="closed"
                    >
                      <div className="px-4 py-2 border-secondary-200 dark:border-secondary-700 border-b">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100 truncate">
                            {state.user.full_name || 'User'}
                          </p>
                          {state.user.is_verified && (
                            <CheckCircle className="h-4 w-4 text-blue-500" />
                          )}
                        </div>
                        <p className="text-xs text-secondary-500 dark:text-secondary-400 truncate block max-w-full overflow-hidden">
                          {state.user.email}
                        </p>
                      </div>
                      <motion.button
                        onClick={() => {
                          navigate('/settings/profile');
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-600 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        whileHover={{ x: 5 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <User className="h-4 w-4" />
                        Profile Settings
                      </motion.button>
                      <motion.button
                        onClick={() => {
                          navigate('/settings');
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-600 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        whileHover={{ x: 5 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Settings className="h-4 w-4" />
                        All Settings
                      </motion.button>
                      <div className="border-secondary-200 dark:border-secondary-700 border-t my-1"></div>
                      <motion.button
                        onClick={() => {
                          logout();
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-600 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        whileHover={{ x: 5 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && isMobile && (
          <motion.div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={overlayVariants}
            onClick={() => setSidebarOpen(false)}
            style={{ top: 0 }}
          />
        )}
      </AnimatePresence>

      {/* Main content */}
      <div
        className={`flex-1 min-w-0 transition-all duration-300 ease-in-out ${
          sidebarMinimized ? 'lg:ml-20' : 'lg:ml-72'
        }`}
      >
        {/* Mobile header */}
        <FlexBetween className="lg:hidden fixed top-0 left-0 right-0 bg-white dark:bg-secondary-800 shadow-sm border-secondary-200 dark:border-secondary-700 border-b px-5 py-4 z-30">
          <motion.button
            onClick={() => setSidebarOpen(true)}
            className="btn btn-ghost focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            aria-label="Open navigation menu"
            aria-expanded={sidebarOpen}
            whileTap={{ scale: 0.9 }}
          >
            <Menu className="h-6 w-6" />
          </motion.button>
          <motion.h1
            className="text-xl font-semibold text-secondary-900 dark:text-secondary-100"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            BUDGETON
          </motion.h1>
          <div className="w-10" /> {/* Spacer for balance */}
        </FlexBetween>

        {/* Page content */}
        <motion.main
          id="main-content"
          className="flex-1 overflow-auto main-content pt-20 lg:pt-0 h-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
};
