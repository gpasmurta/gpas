import React from 'react';

interface EnergyPatternsSectionProps {
  patterns: string[];
}

export const EnergyPatternsSection: React.FC<EnergyPatternsSectionProps> = ({ patterns }) => {
  if (!patterns.length) {
    return null;
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        Energy Patterns
      </h3>
      <ul className="space-y-2">
        {patterns.map((pattern, index) => (
          <li key={index} className="flex items-start">
            <span className="flex-shrink-0 w-5 h-5 mt-1 mr-2">
              <svg
                className="w-5 h-5 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </span>
            <span className="text-gray-700">{pattern}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}; 