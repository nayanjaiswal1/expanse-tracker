import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './PolicyPages.css';

const TermsOfService: React.FC = () => {
  return (
    <div className="policy-page-container">
      <Link to="/landing" className="policy-back-link">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
      </Link>
      <h1 className="policy-title">Terms of Service</h1>
      <p className="policy-paragraph">
        Welcome to BUDGETON! These Terms of Service ("Terms") govern your use of our website and
        services. By accessing or using our services, you agree to be bound by these Terms.
      </p>
      <h2 className="policy-heading">1. Use of Services</h2>
      <p className="policy-paragraph">
        You must be at least 18 years old to use our services. You agree to use our services only
        for lawful purposes and in accordance with these Terms.
      </p>
      <h2 className="policy-heading">2. User Accounts</h2>
      <p className="policy-paragraph">
        When you create an account with us, you must provide information that is accurate, complete,
        and current at all times. Failure to do so constitutes a breach of the Terms, which may
        result in immediate termination of your account on our Service.
      </p>
      <h2 className="policy-heading">3. Intellectual Property</h2>
      <p className="policy-paragraph">
        The Service and its original content, features, and functionality are and will remain the
        exclusive property of BUDGETON and its licensors.
      </p>
      <h2 className="policy-heading">4. Termination</h2>
      <p className="policy-paragraph">
        We may terminate or suspend your account immediately, without prior notice or liability, for
        any reason whatsoever, including without limitation if you breach the Terms.
      </p>
      <h2 className="policy-heading">5. Limitation of Liability</h2>
      <p className="policy-paragraph">
        In no event shall BUDGETON, nor its directors, employees, partners, agents, suppliers, or
        affiliates, be liable for any indirect, incidental, special, consequential or punitive
        damages, including without limitation, loss of profits, data, use, goodwill, or other
        intangible losses, resulting from (i) your access to or use of or inability to access or use
        the Service; (ii) any conduct or content of any third party on the Service; (iii) any
        content obtained from the Service; and (iv) unauthorized access, use or alteration of your
        transmissions or content, whether based on warranty, contract (including negligence) or any
        other legal theory, whether or not we have been informed of the possibility of such damage,
        and even if a remedy set forth herein is found to have failed of its essential purpose.
      </p>
      <h2 className="policy-heading">6. Governing Law</h2>
      <p className="policy-paragraph">
        These Terms shall be governed and construed in accordance with the laws of [Your
        Country/State], without regard to its conflict of law provisions.
      </p>
      <h2 className="policy-heading">7. Changes to Terms</h2>
      <p className="policy-paragraph">
        We reserve the right, at our sole discretion, to modify or replace these Terms at any time.
        If a revision is material we will try to provide at least 30 days' notice prior to any new
        terms taking effect. What constitutes a material change will be determined at our sole
        discretion.
      </p>
      <h2 className="policy-heading">Contact Us</h2>
      <p className="policy-paragraph">
        If you have any questions about these Terms, please contact us at legal@budgeton.com.
      </p>
    </div>
  );
};

export default TermsOfService;
