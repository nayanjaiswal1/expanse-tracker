import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './PolicyPages.css';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="policy-page-container">
      <Link to="/landing" className="policy-back-link">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
      </Link>
      <h1 className="policy-title">Privacy Policy</h1>
      <p className="policy-paragraph">
        Your privacy is important to us. This Privacy Policy explains how we collect, use, disclose,
        and safeguard your information when you visit our website and use our services.
      </p>
      <h2 className="policy-heading">Information We Collect</h2>
      <p className="policy-paragraph">
        We may collect personal information that you voluntarily provide to us when you register on
        the website, express an interest in obtaining information about us or our products and
        services, when you participate in activities on the website, or otherwise when you contact
        us.
      </p>
      <h2 className="policy-heading">How We Use Your Information</h2>
      <p className="policy-paragraph">
        We use personal information collected via our website for a variety of business purposes
        described below. We process your personal information for these purposes in reliance on our
        legitimate business interests, in order to enter into or perform a contract with you, with
        your consent, and/or for compliance with our legal obligations.
      </p>
      <h2 className="policy-heading">Disclosure of Your Information</h2>
      <p className="policy-paragraph">
        We may share information we have collected about you in certain situations. Your information
        may be disclosed as follows:
      </p>
      <ul className="policy-list">
        <li className="policy-list-item">By Law or to Protect Rights</li>
        <li className="policy-list-item">Business Transfers</li>
        <li className="policy-list-item">Third-Party Service Providers</li>
      </ul>
      <h2 className="policy-heading">Security of Your Information</h2>
      <p className="policy-paragraph">
        We use administrative, technical, and physical security measures to help protect your
        personal information. While we have taken reasonable steps to secure the personal
        information you provide to us, please be aware that despite our efforts, no security
        measures are perfect or impenetrable, and no method of data transmission can be guaranteed
        against any interception or other type of misuse.
      </p>
      <h2 className="policy-heading">Contact Us</h2>
      <p className="policy-paragraph">
        If you have questions or comments about this Privacy Policy, please contact us at
        privacy@budgeton.com.
      </p>
    </div>
  );
};

export default PrivacyPolicy;
