import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfDay, endOfDay, isValid, parse } from 'date-fns';
import { cn } from '../lib/utils';

export type DateRange = {
  start: Date;
  end: Date;
  label: string;
};

interface DateRangePickerProps {
  selectedRange: DateRange;
  onRangeChange: (range: DateRange) => void;
}

export function DateRangePicker({ selectedRange, onRangeChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startDateInput, setStartDateInput] = useState(format(selectedRange.start, 'MM/dd/yyyy'));
  const [endDateInput, setEndDateInput] = useState(format(selectedRange.end, 'MM/dd/yyyy'));
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update input fields when selected range changes
  useEffect(() => {
    setStartDateInput(format(selectedRange.start, 'MM/dd/yyyy'));
    setEndDateInput(format(selectedRange.end, 'MM/dd/yyyy'));
  }, [selectedRange]);

  // Preset range options
  const handleToday = () => {
    const today = new Date();
    onRangeChange({
      start: startOfDay(today),
      end: endOfDay(today),
      label: 'Today'
    });
    setIsOpen(false);
  };

  const handleLast7Days = () => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    onRangeChange({
      start: startOfDay(sevenDaysAgo),
      end: endOfDay(today),
      label: 'Last 7 Days'
    });
    setIsOpen(false);
  };

  const handleLast30Days = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 29);
    onRangeChange({
      start: startOfDay(thirtyDaysAgo),
      end: endOfDay(today),
      label: 'Last 30 Days'
    });
    setIsOpen(false);
  };

  // Custom date range
  const handleApplyCustomRange = () => {
    try {
      const startDate = parse(startDateInput, 'MM/dd/yyyy', new Date());
      const endDate = parse(endDateInput, 'MM/dd/yyyy', new Date());
      
      if (isValid(startDate) && isValid(endDate)) {
        onRangeChange({
          start: startOfDay(startDate),
          end: endOfDay(endDate),
          label: `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`
        });
        setIsOpen(false);
      } else {
        console.error('Invalid date format');
      }
    } catch (error) {
      console.error('Error parsing dates:', error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <div className="flex items-center">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 border border-blue-200 rounded-md bg-white hover:bg-blue-50 transition-colors text-sm"
          >
            <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            <span className="text-gray-700 truncate max-w-[150px] sm:max-w-none">{selectedRange.label}</span>
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center">
            <input
              type="text"
              placeholder="MM/DD/YYYY"
              value={startDateInput}
              onChange={(e) => setStartDateInput(e.target.value)}
              className="w-28 sm:w-32 px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 rounded-md text-xs sm:text-sm"
            />
          </div>
          <span className="text-gray-500 text-xs sm:text-sm">to</span>
          <div className="flex items-center">
            <input
              type="text"
              placeholder="MM/DD/YYYY"
              value={endDateInput}
              onChange={(e) => setEndDateInput(e.target.value)}
              className="w-28 sm:w-32 px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 rounded-md text-xs sm:text-sm"
            />
          </div>
          <button
            onClick={handleApplyCustomRange}
            className="px-2 sm:px-3 py-1 sm:py-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors text-xs sm:text-sm"
          >
            Apply
          </button>
        </div>
      </div>
      
      {isOpen && (
        <div className="absolute z-10 mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-200">
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-3 text-sm">Quick Select</h3>
            <div className="space-y-2">
              <button
                onClick={handleToday}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm",
                  selectedRange.label === 'Today'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                Today
              </button>
              <button
                onClick={handleLast7Days}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm",
                  selectedRange.label === 'Last 7 Days'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                Last 7 Days
              </button>
              <button
                onClick={handleLast30Days}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm",
                  selectedRange.label === 'Last 30 Days'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                Last 30 Days
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}