import React from 'react';

interface QuickStartActionsProps {
  hasAddedAccount: boolean;
  hasConnectedGmail: boolean;
  onAddAccount: () => void;
  onConnectGmail: () => void;
}

export const QuickStartActions: React.FC<QuickStartActionsProps> = ({
  hasAddedAccount,
  hasConnectedGmail,
  onAddAccount,
  onConnectGmail,
}) => {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Quick start (optional)
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
          Get started faster by adding your first account or connecting Gmail
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onAddAccount}
          className={`relative rounded-xl border-2 p-4 text-left transition-all hover:shadow-md ${
            hasAddedAccount
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-400'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                hasAddedAccount
                  ? 'bg-emerald-100 dark:bg-emerald-900/40'
                  : 'bg-blue-100 dark:bg-blue-900/40'
              }`}
            >
              <svg
                className={`w-5 h-5 ${hasAddedAccount ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  Add a first account
                </h4>
                {hasAddedAccount && (
                  <svg
                    className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                Track balances immediately by adding your first account
              </p>
              <span
                className={`inline-block mt-2 text-xs font-medium ${
                  hasAddedAccount
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-blue-600 dark:text-blue-400'
                }`}
              >
                {hasAddedAccount ? 'Account added • Click to add more' : 'Click to add account →'}
              </span>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={onConnectGmail}
          className={`relative rounded-xl border-2 p-4 text-left transition-all hover:shadow-md ${
            hasConnectedGmail
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-400'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                hasConnectedGmail
                  ? 'bg-emerald-100 dark:bg-emerald-900/40'
                  : 'bg-red-100 dark:bg-red-900/40'
              }`}
            >
              <svg
                className={`w-5 h-5 ${hasConnectedGmail ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L12 9.545l8.073-6.052C21.69 2.28 24 3.434 24 5.457z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  Link Gmail for imports
                </h4>
                {hasConnectedGmail && (
                  <svg
                    className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                Auto-import financial emails to keep transactions current
              </p>
              <span
                className={`inline-block mt-2 text-xs font-medium ${
                  hasConnectedGmail
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {hasConnectedGmail ? 'Connected • Click to manage' : 'Click to connect →'}
              </span>
            </div>
          </div>
        </button>
      </div>
    </section>
  );
};
