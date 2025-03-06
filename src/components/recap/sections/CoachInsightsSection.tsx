import React from 'react';

interface CoachInsightsSectionProps {
  insights: string[];
}

export const CoachInsightsSection: React.FC<CoachInsightsSectionProps> = ({ insights }) => {
  if (!insights.length) {
    return null;
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        Coach Insights
      </h3>
      <ul className="space-y-3">
        {insights.map((insight, index) => (
          <li key={index} className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 mt-1 mr-3">
              <svg
                className="w-6 h-6 text-yellow-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </span>
            <div className="flex-1">
              <p className="text-gray-700">{insight}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}; 