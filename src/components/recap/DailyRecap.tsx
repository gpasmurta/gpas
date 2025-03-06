import React, { useEffect, useState } from 'react';
import { useRecapStore } from '../../stores/recapStore';
import { recapService } from '../../services/recap';
import { RecapHeader } from './RecapHeader';
import { RecapContent } from './RecapContent';
import { RecapSettings } from './RecapSettings';

interface DailyRecapProps {
  date: string; // YYYY-MM-DD
  className?: string;
}

export const DailyRecap: React.FC<DailyRecapProps> = ({ date, className = '' }) => {
  const {
    currentRecap,
    isLoading,
    error,
    isExpanded,
    generateRecap,
    setCurrentRecap,
    setIsLoading,
    setError,
    setIsExpanded
  } = useRecapStore();

  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const loadRecap = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const recap = await recapService.fetchDailyRecap(date);
        setCurrentRecap(recap);
        if (recap) {
          setIsExpanded(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load daily recap');
      } finally {
        setIsLoading(false);
      }
    };

    loadRecap();
  }, [date, setCurrentRecap, setIsLoading, setError, setIsExpanded]);

  const handleGenerateRecap = async () => {
    setShowSettings(false); // Close settings if open
    await generateRecap(date);
    setIsExpanded(true); // Ensure the recap is expanded after generation
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      <RecapHeader
        onGenerateClick={handleGenerateRecap}
        onSettingsClick={() => setShowSettings(!showSettings)}
        isLoading={isLoading}
        hasRecap={!!currentRecap}
        showSettings={showSettings}
      />
      
      {showSettings && currentRecap ? (
        <RecapSettings />
      ) : (
        <RecapContent
          recap={currentRecap}
          isLoading={isLoading}
          error={error}
        />
      )}
    </div>
  );
}; 