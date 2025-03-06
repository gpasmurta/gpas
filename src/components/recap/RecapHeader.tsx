import React from 'react';
import { useRecapStore } from '../../stores/recapStore';

interface RecapHeaderProps {
  onGenerateClick: () => void;
  onSettingsClick: () => void;
  isLoading: boolean;
  hasRecap: boolean;
  showSettings: boolean;
}

export const RecapHeader: React.FC<RecapHeaderProps> = ({
  onGenerateClick,
  onSettingsClick,
  isLoading,
  hasRecap,
  showSettings,
}) => {
  const { isExpanded, setIsExpanded } = useRecapStore();

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-t-lg border-b border-gray-200">
      <div className="flex items-center space-x-2">
        <h2 className="text-lg font-semibold text-gray-900">Daily Recap</h2>
        {hasRecap && !showSettings && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label={isExpanded ? 'Collapse recap' : 'Expand recap'}
          >
            <svg
              className={`w-5 h-5 transition-transform ${
                isExpanded ? 'transform rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onGenerateClick}
          disabled={isLoading}
          className={`
            inline-flex items-center px-4 py-2 text-sm font-medium rounded-md
            ${isLoading 
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
            }
            text-white transition-colors duration-150 ease-in-out
          `}
        >
          {isLoading ? (
            <>
              <svg
                className="w-4 h-4 mr-2 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Generate
            </>
          )}
        </button>

        {hasRecap && (
          <button
            onClick={onSettingsClick}
            className={`
              p-2 rounded-md focus:outline-none
              ${showSettings 
                ? 'text-blue-600 bg-blue-100 hover:bg-blue-200'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }
            `}
            aria-label="Settings"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}; 