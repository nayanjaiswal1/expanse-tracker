/**
 * Settings Page with AI Provider Management
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Key, Globe, Shield, Bell, Zap, Eye, EyeOff, Check, X } from 'lucide-react';
import clsx from 'clsx';

const mockProviders = [
  { id: '1', name: 'OpenAI', apiKey: 'sk-...x7yx', status: 'active', lastTested: '2 hours ago' },
  { id: '2', name: 'Claude', apiKey: 'sk-...k9pq', status: 'active', lastTested: '1 day ago' },
  { id: '3', name: 'Gemini', apiKey: 'Not configured', status: 'inactive', lastTested: 'Never' },
];

const SettingSection = ({ title, description, children }: any) => (
  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
    <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
    <p className="text-sm text-gray-500 mb-4">{description}</p>
    {children}
  </div>
);

export const SettingsPage = () => {
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [aiParsingDefault, setAiParsingDefault] = useState(true);
  const [autoCategorize, setAutoCategorize] = useState(true);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* AI Providers */}
      <SettingSection
        title="AI Provider API Keys"
        description="Manage API keys for AI-powered parsing and categorization"
      >
        <div className="space-y-3">
          {mockProviders.map((provider) => (
            <div
              key={provider.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                  <Zap size={20} className="text-purple-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-gray-900">
                      {provider.name}
                    </h4>
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs',
                        provider.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      )}
                    >
                      {provider.status === 'active' ? <Check size={10} /> : <X size={10} />}
                      {provider.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs text-gray-500">
                      {showApiKey[provider.id] ? provider.apiKey : '••••••••••••'}
                    </p>
                    <button
                      onClick={() =>
                        setShowApiKey((prev) => ({
                          ...prev,
                          [provider.id]: !prev[provider.id],
                        }))
                      }
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {showApiKey[provider.id] ? (
                        <EyeOff size={12} />
                      ) : (
                        <Eye size={12} />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Last tested: {provider.lastTested}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                {provider.status === 'active' && (
                  <button className="px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-100 transition-colors">
                    Test
                  </button>
                )}
                <button className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                  {provider.status === 'active' ? 'Update' : 'Configure'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </SettingSection>

      {/* Parsing Preferences */}
      <SettingSection
        title="Parsing Preferences"
        description="Configure how statements and documents are parsed"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                Use AI Parser by Default
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Automatically use AI for parsing new statements
              </p>
            </div>
            <button
              onClick={() => setAiParsingDefault(!aiParsingDefault)}
              className={clsx(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                aiParsingDefault ? 'bg-blue-600' : 'bg-gray-300'
              )}
            >
              <span
                className={clsx(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  aiParsingDefault ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                Auto-Categorize Transactions
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Automatically categorize transactions using AI
              </p>
            </div>
            <button
              onClick={() => setAutoCategorize(!autoCategorize)}
              className={clsx(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                autoCategorize ? 'bg-blue-600' : 'bg-gray-300'
              )}
            >
              <span
                className={clsx(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  autoCategorize ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        </div>
      </SettingSection>

      {/* Regional Settings */}
      <SettingSection
        title="Regional Settings"
        description="Set your currency, timezone, and regional preferences"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Currency
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>INR - Indian Rupee</option>
              <option>USD - US Dollar</option>
              <option>EUR - Euro</option>
              <option>GBP - British Pound</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timezone
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Asia/Kolkata (IST)</option>
              <option>America/New_York (EST)</option>
              <option>Europe/London (GMT)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Format
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>DD/MM/YYYY</option>
              <option>MM/DD/YYYY</option>
              <option>YYYY-MM-DD</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>India</option>
              <option>United States</option>
              <option>United Kingdom</option>
            </select>
          </div>
        </div>
      </SettingSection>

      {/* Statement Passwords */}
      <SettingSection
        title="Statement Passwords"
        description="Manage saved passwords for password-protected statements"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-gray-900">HDFC_*</h4>
              <p className="text-xs text-gray-500 mt-0.5">Used 12 times</p>
            </div>
            <button className="px-3 py-1.5 text-xs border border-red-300 text-red-700 rounded hover:bg-red-50 transition-colors">
              Remove
            </button>
          </div>

          <button className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors">
            + Add Statement Password
          </button>
        </div>
      </SettingSection>

      {/* Security */}
      <SettingSection
        title="Security"
        description="Manage security and encryption settings"
      >
        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-blue-600" />
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                Encryption Enabled
              </h4>
              <p className="text-xs text-gray-600 mt-0.5">
                All API keys and passwords are encrypted
              </p>
            </div>
          </div>
          <Check size={20} className="text-blue-600" />
        </div>
      </SettingSection>
    </div>
  );
};
