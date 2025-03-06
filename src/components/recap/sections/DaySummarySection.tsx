import React from 'react';

interface DaySummarySectionProps {
  summary: string;
}

export const DaySummarySection: React.FC<DaySummarySectionProps> = ({ summary }) => {
  if (!summary) {
    return null;
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        Day Summary
      </h3>
      <p className="text-gray-700">
        {summary}
      </p>
    </div>
  );
}; 