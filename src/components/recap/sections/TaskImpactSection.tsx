import React from 'react';

interface TaskImpactSectionProps {
  impacts: string[];
}

export const TaskImpactSection: React.FC<TaskImpactSectionProps> = ({ impacts }) => {
  if (!impacts.length) {
    return null;
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        Task Impact
      </h3>
      <ul className="space-y-2">
        {impacts.map((impact, index) => (
          <li key={index} className="flex items-start">
            <span className="flex-shrink-0 w-5 h-5 mt-1 mr-2">
              <svg
                className="w-5 h-5 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </span>
            <span className="text-gray-700">{impact}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}; 