import React from 'react';

interface TomorrowFocusSectionProps {
  focus: string[];
}

export const TomorrowFocusSection: React.FC<TomorrowFocusSectionProps> = ({ focus }) => {
  if (!focus.length) {
    return null;
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        Tomorrow's Focus
      </h3>
      <ul className="space-y-3">
        {focus.map((item, index) => (
          <li key={index} className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 mt-1 mr-3">
              <svg
                className="w-6 h-6 text-indigo-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </span>
            <div className="flex-1">
              <p className="text-gray-700">{item}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}; 