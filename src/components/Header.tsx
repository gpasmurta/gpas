import React, { ReactNode } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { useTimeAuditStore } from '../store/timeAuditStore';

interface HeaderProps {
  title: string;
  view: 'dashboard' | 'planner';
  onMenuClick?: () => void;
  children?: ReactNode;
}

export function Header({ title, view, onMenuClick, children }: HeaderProps) {
  const { selectedDate, setSelectedDate } = useTimeAuditStore();

  const handlePreviousDay = () => {
    setSelectedDate(subDays(selectedDate, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate max-w-[60%]">{title}</h1>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Date Navigator (only visible in Planner view) */}
          {view === 'planner' && (
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={handlePreviousDay}
                className="p-1 rounded-full text-gray-500 hover:bg-gray-100"
                aria-label="Previous day"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mr-1 sm:mr-2 hidden xs:inline-block" />
                <span className="text-sm sm:text-base text-gray-700 font-medium whitespace-nowrap">
                  {format(selectedDate, 'MMM d, yyyy')}
                </span>
              </div>
              
              <button
                onClick={handleNextDay}
                className="p-1 rounded-full text-gray-500 hover:bg-gray-100"
                aria-label="Next day"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
          
          {/* User menu or other header content */}
          {children}
        </div>
      </div>
    </header>
  );
}