import React from 'react';

interface QuoteSectionProps {
  quote: string;
}

export const QuoteSection: React.FC<QuoteSectionProps> = ({ quote }) => {
  if (!quote) {
    return null;
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        Daily Inspiration
      </h3>
      <blockquote className="text-gray-700 italic border-l-4 border-blue-500 pl-4">
        {quote}
      </blockquote>
    </div>
  );
}; 