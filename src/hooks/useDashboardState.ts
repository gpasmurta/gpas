import { useState, useCallback } from 'react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, addDays } from 'date-fns';
import { DashboardTab, DateRange } from '../types/dashboard';

export function useDashboardState() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('analytics');
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const today = new Date();
    const start = startOfWeek(today);
    const end = endOfWeek(today);
    return {
      start,
      end,
      label: 'This Week'
    };
  });

  const handleDateRangeChange = useCallback((range: DateRange) => {
    setIsLoading(true);
    setDateRange(range);
    // Simulate loading state
    setTimeout(() => setIsLoading(false), 500);
  }, []);

  return {
    activeTab,
    setActiveTab,
    isLoading,
    dateRange,
    handleDateRangeChange
  };
} 