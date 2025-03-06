import React from 'react';

interface PowerQuestionsSectionProps {
  questions: string[];
}

export const PowerQuestionsSection: React.FC<PowerQuestionsSectionProps> = ({ questions }) => {
  if (!questions.length) {
    return null;
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        Power Questions
      </h3>
      <ul className="space-y-3">
        {questions.map((question, index) => (
          <li key={index} className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 mt-1 mr-3">
              <svg
                className="w-6 h-6 text-purple-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </span>
            <div className="flex-1">
              <p className="text-gray-700 font-medium">{question}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}; 