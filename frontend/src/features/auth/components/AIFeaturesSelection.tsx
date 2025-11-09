import React from 'react';

interface AIFeature {
  id: string;
  icon: string;
  title: string;
  description: string;
}

interface AIFeaturesSelectionProps {
  features: readonly AIFeature[];
  selectedFeatures: string[];
  onToggle: (featureId: string) => void;
}

export const AIFeaturesSelection: React.FC<AIFeaturesSelectionProps> = ({
  features,
  selectedFeatures,
  onToggle,
}) => {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Optional AI helpers
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
          Select features you'd like to enable (optional)
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {features.map((feature) => {
          const isSelected = selectedFeatures.includes(feature.id);
          return (
            <button
              key={feature.id}
              type="button"
              onClick={() => onToggle(feature.id)}
              className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-left transition ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-900/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className="text-lg">{feature.icon}</span>
              <div className="flex-1">
                <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  {feature.title}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  {feature.description}
                </p>
              </div>
              {isSelected && (
                <svg
                  className="ml-auto w-5 h-5 text-emerald-600 dark:text-emerald-300 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};
