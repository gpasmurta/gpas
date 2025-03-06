import React from 'react';
import { useRecapStore } from '../../stores/recapStore';
import { CoachingStyle } from '../../types/recap';

export const RecapSettings: React.FC = () => {
  const { currentRecap, setCurrentRecap } = useRecapStore();

  if (!currentRecap) return null;

  const handleCoachingStyleChange = (style: CoachingStyle) => {
    setCurrentRecap({
      ...currentRecap,
      userPreferences: {
        ...currentRecap.userPreferences,
        coachingStyle: style
      }
    });
  };

  const handleSectionToggle = (sectionKey: keyof typeof currentRecap.userPreferences.visibleSections) => {
    setCurrentRecap({
      ...currentRecap,
      userPreferences: {
        ...currentRecap.userPreferences,
        visibleSections: {
          ...currentRecap.userPreferences.visibleSections,
          [sectionKey]: !currentRecap.userPreferences.visibleSections[sectionKey]
        }
      }
    });
  };

  const handleAutoGenerateToggle = () => {
    setCurrentRecap({
      ...currentRecap,
      userPreferences: {
        ...currentRecap.userPreferences,
        autoGenerate: !currentRecap.userPreferences.autoGenerate
      }
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Coaching Style */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          🎯 Coaching Style
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(['motivational', 'analytical', 'supportive', 'directive'] as CoachingStyle[]).map((style) => (
            <button
              key={style}
              onClick={() => handleCoachingStyleChange(style)}
              className={`
                px-4 py-2 text-sm font-medium rounded-md capitalize
                ${currentRecap.userPreferences.coachingStyle === style
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }
              `}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      {/* Visible Sections */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          👁️ Visible Sections
        </h3>
        <div className="space-y-3">
          {Object.entries(currentRecap.userPreferences.visibleSections).map(([key, value]) => (
            <div key={key} className="flex items-center">
              <input
                type="checkbox"
                id={key}
                checked={value}
                onChange={() => handleSectionToggle(key as keyof typeof currentRecap.userPreferences.visibleSections)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor={key} className="ml-3 text-sm text-gray-700 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Auto Generate */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          ⚡ Auto Generate
        </h3>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="autoGenerate"
            checked={currentRecap.userPreferences.autoGenerate}
            onChange={handleAutoGenerateToggle}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="autoGenerate" className="ml-3 text-sm text-gray-700">
            Automatically generate recap at end of day
          </label>
        </div>
      </div>
    </div>
  );
}; 