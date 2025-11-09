import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  Users,
  ArrowRight,
  Bot,
  TrendingUp,
  Repeat,
  Tag,
  MessageSquare,
  Settings,
  Banknote,
  Target,
  FileScan,
  Briefcase,
  Sun,
  Moon,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import '../components/ProLandingPage.css';
import { useSubscribeNewsletter } from '../hooks/settings';

const ProLandingPage: React.FC = () => {
  const { toggleTheme, isDark } = useTheme();
  const { state } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const subscribeMutation = useSubscribeNewsletter();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null); // Clear previous messages

    if (!email) {
      setMessage({ type: 'error', text: 'Please enter your email address.' });
      return;
    }

    setIsLoading(true);
    try {
      const data = await subscribeMutation.mutateAsync(email);
      if ((data as any)?.error) {
        setMessage({
          type: 'error',
          text: (data as any).error || 'Subscription failed. Please try again.',
        });
      } else {
        setMessage({
          type: 'success',
          text: (data as any)?.message || 'Subscribed!',
        });
        setEmail('');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      setMessage({
        type: 'error',
        text: 'Network error. Please try again later.',
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1,
        duration: 0.6,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  };

  const menuVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  };

  return (
    <div className="pro-landing-page gradient-bg overflow-x-hidden">
      {/* Header */}
      <motion.header
        className="pro-header"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{
          type: 'spring',
          stiffness: 120,
          damping: 14,
          duration: 0.5,
        }}
      >
        <div>
          <div className="pro-logo">
            <Mail className="h-8 w-8 text-primary-600" />
            <span className="pro-logo-text">BUDGETON</span>
          </div>
          <nav className="pro-nav">
            <motion.a href="#features" className="pro-nav-link" whileHover={{ scale: 1.05 }}>
              Features
            </motion.a>
            <motion.a href="#how-it-works" className="pro-nav-link" whileHover={{ scale: 1.05 }}>
              How It Works
            </motion.a>
            <motion.a href="#testimonials" className="pro-nav-link" whileHover={{ scale: 1.05 }}>
              Testimonials
            </motion.a>
          </nav>
          <div className="pro-header-actions">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                onClick={toggleTheme}
                className="rounded-full p-3 shadow-soft hover:shadow-md"
                variant="secondary"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            </motion.div>
            {!state.user ? (
              <>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="hidden md:block"
                >
                  <Link to="/login">
                    <Button variant="secondary">Login</Button>
                  </Link>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="hidden md:block"
                >
                  <Link to="/login">
                    <Button variant="primary">Get Started</Button>
                  </Link>
                </motion.div>
              </>
            ) : (
              <>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="hidden md:block"
                >
                  <Link to="/dashboard">
                    <Button variant="primary">Dashboard</Button>
                  </Link>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="hidden md:block"
                >
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Welcome, {state.user.full_name || state.user.username}!
                  </span>
                </motion.div>
              </>
            )}
            <div className="md:hidden">
              <Button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                variant="secondary"
                className="p-3"
              >
                {isMenuOpen ? <X /> : <Menu />}
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="mobile-nav"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={menuVariants}
          >
            <nav className="flex flex-col items-center gap-4">
              <a href="#features" className="pro-nav-link" onClick={() => setIsMenuOpen(false)}>
                Features
              </a>
              <a href="#how-it-works" className="pro-nav-link" onClick={() => setIsMenuOpen(false)}>
                How It Works
              </a>
              <a href="#testimonials" className="pro-nav-link" onClick={() => setIsMenuOpen(false)}>
                Testimonials
              </a>
              {!state.user ? (
                <>
                  <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="secondary" className="w-full">
                      Login
                    </Button>
                  </Link>
                  <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="primary" className="w-full">
                      Get Started
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <div className="text-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Welcome, {state.user.full_name || state.user.username}!
                  </div>
                  <Link to="/dashboard" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="primary" className="w-full">
                      Dashboard
                    </Button>
                  </Link>
                </>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <main className="pro-main">
        <section className="pro-hero">
          <motion.div initial="hidden" animate="visible" variants={containerVariants}>
            <motion.h1 className="pro-hero-title" variants={itemVariants}>
              {!state.user
                ? 'Take Control of Your Financial Future'
                : `Welcome back, ${state.user.full_name || state.user.username}!`}
            </motion.h1>
            <motion.p className="pro-hero-subtitle" variants={itemVariants}>
              {!state.user
                ? 'Smart budgeting and expense tracking to help you achieve your financial goals.'
                : 'Ready to continue your financial journey? Access your dashboard or add new transactions.'}
            </motion.p>
            <motion.div variants={itemVariants}>
              {!state.user ? (
                <Link to="/login">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="primary" size="lg">
                      Get Started Today <ArrowRight className="ml-2" />
                    </Button>
                  </motion.div>
                </Link>
              ) : (
                <Link to="/dashboard">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="primary" size="lg">
                      Go to Dashboard <ArrowRight className="ml-2" />
                    </Button>
                  </motion.div>
                </Link>
              )}
            </motion.div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section id="features" className="pro-section">
          <motion.h2
            className="pro-section-title"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={itemVariants}
          >
            All-in-One Finance Tracker
          </motion.h2>
          <motion.div
            className="pro-features-grid"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={containerVariants}
          >
            <motion.div
              className="pro-feature-card"
              variants={itemVariants}
              whileHover={{ translateY: -5 }}
            >
              <div className="pro-feature-icon bg-primary-100 dark:bg-primary-900/30">
                <Bot className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="pro-feature-title">AI-Powered Insights</h3>
              <p className="pro-feature-description">
                Leverage the power of AI to get personalized financial insights and recommendations.
              </p>
            </motion.div>
            <motion.div
              className="pro-feature-card"
              variants={itemVariants}
              whileHover={{ translateY: -5 }}
            >
              <div className="pro-feature-icon bg-success-100 dark:bg-success-900/30">
                <TrendingUp className="h-8 w-8 text-success-600" />
              </div>
              <h3 className="pro-feature-title">Financial Analysis</h3>
              <p className="pro-feature-description">
                Generate detailed monthly analysis reports and get a clear overview of your
                finances.
              </p>
            </motion.div>
            <motion.div
              className="pro-feature-card"
              variants={itemVariants}
              whileHover={{ translateY: -5 }}
            >
              <div className="pro-feature-icon bg-warning-100 dark:bg-warning-900/30">
                <Mail className="h-8 w-8 text-warning-600" />
              </div>
              <h3 className="pro-feature-title">Gmail Integration</h3>
              <p className="pro-feature-description">
                Automatically sync your emails and extract transaction information from your
                receipts.
              </p>
            </motion.div>
            <motion.div
              className="pro-feature-card"
              variants={itemVariants}
              whileHover={{ translateY: -5 }}
            >
              <div className="pro-feature-icon bg-danger-100 dark:bg-danger-900/30">
                <Briefcase className="h-8 w-8 text-danger-600" />
              </div>
              <h3 className="pro-feature-title">Investment Tracking</h3>
              <p className="pro-feature-description">
                Track your investment portfolio and get a summary of your performance.
              </p>
            </motion.div>
            <motion.div
              className="pro-feature-card"
              variants={itemVariants}
              whileHover={{ translateY: -5 }}
            >
              <div className="pro-feature-icon bg-info-100 dark:bg-info-900/30">
                <Banknote className="h-8 w-8 text-info-600" />
              </div>
              <h3 className="pro-feature-title">Bank Account Management</h3>
              <p className="pro-feature-description">
                Securely connect and manage all your bank accounts in one place.
              </p>
            </motion.div>
            <motion.div
              className="pro-feature-card"
              variants={itemVariants}
              whileHover={{ translateY: -5 }}
            >
              <div className="pro-feature-icon bg-purple-100 dark:bg-purple-900/30">
                <Settings className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="pro-feature-title">Transaction Categorization</h3>
              <p className="pro-feature-description">
                Automatically categorize your transactions to understand your spending habits.
              </p>
            </motion.div>
            <motion.div
              className="pro-feature-card"
              variants={itemVariants}
              whileHover={{ translateY: -5 }}
            >
              <div className="pro-feature-icon bg-pink-100 dark:bg-pink-900/30">
                <Target className="h-8 w-8 text-pink-600" />
              </div>
              <h3 className="pro-feature-title">Financial Goals</h3>
              <p className="pro-feature-description">
                Set and track your financial goals to stay motivated and achieve them faster.
              </p>
            </motion.div>
            <motion.div
              className="pro-feature-card"
              variants={itemVariants}
              whileHover={{ translateY: -5 }}
            >
              <div className="pro-feature-icon bg-yellow-100 dark:bg-yellow-900/30">
                <Users className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="pro-feature-title">Group Expense Sharing</h3>
              <p className="pro-feature-description">
                Easily split bills and expenses with your friends and family.
              </p>
            </motion.div>
            <motion.div
              className="pro-feature-card"
              variants={itemVariants}
              whileHover={{ translateY: -5 }}
            >
              <div className="pro-feature-icon bg-gray-100 dark:bg-gray-900/30">
                <FileScan className="h-8 w-8 text-gray-600" />
              </div>
              <h3 className="pro-feature-title">Invoice OCR</h3>
              <p className="pro-feature-description">
                Extract data from your invoices with our powerful OCR technology.
              </p>
            </motion.div>
            <motion.div
              className="pro-feature-card"
              variants={itemVariants}
              whileHover={{ translateY: -5 }}
            >
              <div className="pro-feature-icon bg-green-100 dark:bg-green-900/30">
                <Repeat className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="pro-feature-title">Recurring Investments</h3>
              <p className="pro-feature-description">
                Set up and manage your recurring investments with ease.
              </p>
            </motion.div>
            <motion.div
              className="pro-feature-card"
              variants={itemVariants}
              whileHover={{ translateY: -5 }}
            >
              <div className="pro-feature-icon bg-blue-100 dark:bg-blue-900/30">
                <Tag className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="pro-feature-title">Tagging Transactions</h3>
              <p className="pro-feature-description">
                Organize your transactions with custom tags for better tracking.
              </p>
            </motion.div>
            <motion.div
              className="pro-feature-card"
              variants={itemVariants}
              whileHover={{ translateY: -5 }}
            >
              <div className="pro-feature-icon bg-indigo-100 dark:bg-indigo-900/30">
                <MessageSquare className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="pro-feature-title">Telegram Integration</h3>
              <p className="pro-feature-description">
                Get notifications and interact with your finances through Telegram.
              </p>
            </motion.div>
          </motion.div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="pro-section">
          <motion.h2
            className="pro-section-title"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={itemVariants}
          >
            How It Works
          </motion.h2>
          <motion.div
            className="pro-how-it-works-steps"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={containerVariants}
          >
            {/* Step 1 */}
            <motion.div
              className="pro-step"
              variants={itemVariants}
              whileHover={{ translateY: -5 }}
            >
              <div className="pro-step-number">1</div>
              <h3 className="pro-step-title">Create an Account</h3>
              <p className="pro-step-description">
                Sign up for free and set up your financial goals.
              </p>
            </motion.div>
            {/* Step 2 */}
            <motion.div
              className="pro-step"
              variants={itemVariants}
              whileHover={{ translateY: -5 }}
            >
              <div className="pro-step-number">2</div>
              <h3 className="pro-step-title">Link Your Accounts</h3>
              <p className="pro-step-description">
                Securely connect your bank accounts for automated transaction tracking.
              </p>
            </motion.div>
            <motion.div
              className="pro-step-arrow"
              variants={itemVariants}
              whileHover={{ scale: 1.1 }}
            >
              &rarr;
            </motion.div>
            {/* Step 3 */}
            <motion.div
              className="pro-step"
              variants={itemVariants}
              whileHover={{ translateY: -5 }}
            >
              <div className="pro-step-number">3</div>
              <h3 className="pro-step-title">Achieve Your Goals</h3>
              <p className="pro-step-description">
                Use our insights and tools to stay on track and achieve your financial goals.
              </p>
            </motion.div>
          </motion.div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="pro-section">
          <motion.h2
            className="pro-section-title"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={itemVariants}
          >
            Loved by Thousands
          </motion.h2>
          <motion.div
            className="pro-testimonials-grid"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={containerVariants}
          >
            <motion.div
              className="pro-testimonial-card glass"
              variants={itemVariants}
              whileHover={{ translateY: -5 }}
            >
              <img
                src="https://i.pravatar.cc/150?u=a042581f4e29026704d"
                alt="Avatar"
                className="pro-testimonial-avatar"
              />
              <p className="pro-testimonial-text">
                "Budgeton has been a game-changer for my personal finances. I finally feel in
                control of my money."
              </p>
              <div className="pro-testimonial-author">- Nayan jaiswal</div>
            </motion.div>
            <motion.div
              className="pro-testimonial-card glass"
              variants={itemVariants}
              whileHover={{ translateY: -5 }}
            >
              <img
                src="https://i.pravatar.cc/150?u=a042581f4e29026704e"
                alt="Avatar"
                className="pro-testimonial-avatar"
              />
              <p className="pro-testimonial-text">
                "The best budgeting app I've ever used. The interface is beautiful and easy to use."
              </p>
              <div className="pro-testimonial-author">- Rishi Chouksey</div>
            </motion.div>
            <motion.div
              className="pro-testimonial-card glass"
              variants={itemVariants}
              whileHover={{ translateY: -5 }}
            >
              <img
                src="https://i.pravatar.cc/150?u=a042581f4e29026704f"
                alt="Avatar"
                className="pro-testimonial-avatar"
              />
              <p className="pro-testimonial-text">
                "I love the group expense feature. It makes splitting bills with my roommates a
                breeze."
              </p>
              <div className="pro-testimonial-author">- Deepesh Patel</div>
            </motion.div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <motion.footer
        className="pro-footer"
        initial={{ y: 100, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{
          type: 'spring',
          stiffness: 100,
          damping: 20,
          duration: 0.8,
        }}
      >
        <div className="pro-footer-content">
          <div className="pro-footer-left">
            <div className="pro-logo">
              <Mail className="h-8 w-8 text-primary-600" />
              <span className="pro-logo-text">BUDGETON</span>
            </div>
            <p className="pro-footer-text">Take control of your financial future.</p>
            <div className="pro-social-links">
              <motion.a
                href="#"
                className="pro-social-link"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <i className="fab fa-facebook-f"></i>
              </motion.a>
              <motion.a
                href="#"
                className="pro-social-link"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <i className="fab fa-twitter"></i>
              </motion.a>
              <motion.a
                href="#"
                className="pro-social-link"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <i className="fab fa-instagram"></i>
              </motion.a>
            </div>
          </div>
          <div className="pro-footer-right">
            <h3 className="pro-footer-heading">Subscribe to our newsletter</h3>
            <form className="pro-newsletter-form" onSubmit={handleSubscribe}>
              <input
                type="email"
                placeholder="Enter your email"
                className="pro-newsletter-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" variant="primary" disabled={isLoading}>
                {isLoading ? 'Subscribing...' : 'Subscribe'}
              </Button>
            </form>
            {message && (
              <p
                className={`mt-2 text-sm ${
                  message.type === 'success' ? 'text-success-600' : 'text-danger-600'
                }`}
              >
                {message.text}
              </p>
            )}
          </div>
        </div>
        <div className="pro-footer-bottom">
          <p>&copy; 2025 BUDGETON. All rights reserved.</p>
          <div className="pro-footer-links">
            <motion.a
              href="/privacy-policy"
              className="pro-footer-link"
              whileHover={{ scale: 1.05 }}
            >
              Privacy Policy
            </motion.a>
            <motion.a
              href="/terms-of-service"
              className="pro-footer-link"
              whileHover={{ scale: 1.05 }}
            >
              Terms of Service
            </motion.a>
          </div>
        </div>
      </motion.footer>
    </div>
  );
};

export default ProLandingPage;
