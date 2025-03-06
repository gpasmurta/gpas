import React from 'react';
import { DailyRecap } from '../../types/recap';

interface RecapContentProps {
  recap: DailyRecap | null;
  isLoading: boolean;
  error: string | null;
}

export const RecapContent: React.FC<RecapContentProps> = ({
  recap,
  isLoading,
  error
}) => {
  if (error) {
    return (
      <div className="p-4 bg-red-50 border-t border-red-200">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!recap) {
    return (
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <p className="text-sm text-gray-500 text-center">
          No recap available. Click generate to create one.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {/* Quote Section */}
      <div className="p-6">
        <blockquote className="text-lg font-medium text-gray-900 italic text-center">
          "{recap.insights.quote}"
        </blockquote>
      </div>

      {/* Day Summary */}
      <div className="p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          📊 Day Summary
        </h3>
        <div className="whitespace-pre-line text-sm text-gray-600">
          {recap.insights.daySummary}
        </div>
      </div>

      {/* Energy Patterns */}
      <div className="p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          ⚡ Energy Patterns
        </h3>
        <ul className="space-y-2">
          {recap.insights.energyPatterns.map((pattern, index) => (
            <li key={index} className="text-sm text-gray-600">
              • {pattern}
            </li>
          ))}
        </ul>
      </div>

      {/* Task Impact */}
      <div className="p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          🎯 Task Impact
        </h3>
        <ul className="space-y-2">
          {recap.insights.taskImpact.map((impact, index) => (
            <li key={index} className="text-sm text-gray-600">
              • {impact}
            </li>
          ))}
        </ul>
      </div>

      {/* Coach Insights */}
      <div className="p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          💡 Coach Insights
        </h3>
        <ul className="space-y-2">
          {recap.insights.coachInsights.map((insight, index) => (
            <li key={index} className="text-sm text-gray-600">
              • {insight}
            </li>
          ))}
        </ul>
      </div>

      {/* Power Questions */}
      <div className="p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          🔥 Power Questions
        </h3>
        <ul className="space-y-2">
          {recap.insights.powerQuestions.map((question, index) => (
            <li key={index} className="text-sm text-gray-600">
              • {question}
            </li>
          ))}
        </ul>
      </div>

      {/* Tomorrow's Focus */}
      <div className="p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          📈 Tomorrow's Focus
        </h3>
        <ul className="space-y-2">
          {recap.insights.tomorrowFocus.map((focus, index) => (
            <li key={index} className="text-sm text-gray-600">
              • {focus}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}; 