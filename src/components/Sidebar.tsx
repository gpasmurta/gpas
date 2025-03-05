import React from 'react';
import { BarChart3, Calendar, Plus, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTimeAuditStore } from '../store/timeAuditStore';

interface SidebarProps {
  currentView: 'dashboard' | 'planner';
  onViewChange: (view: 'dashboard' | 'planner') => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const { setTaskModalOpen } = useTimeAuditStore();

  const handleNewTask = () => {
    // Switch to planner view and open task modal
    onViewChange('planner');
    
    // Reset any existing task data in the store before opening the modal
    // This ensures we're creating a fresh task with no persisted data
    
    // We need to use a slight delay to ensure the planner component is mounted
    // before we open the modal, which will reset the task state properly
    setTimeout(() => {
      setTaskModalOpen(true);
    }, 50);
  };

  return (
    <div className="w-64 sm:w-56 border-r border-gray-200 bg-white flex flex-col h-full shadow-lg md:shadow-none">
      {/* App Branding */}
      <div className="h-16 flex items-center px-4 border-b border-gray-200">
        <Clock className="w-6 h-6 text-blue-600 mr-2" />
        <h1 className="text-lg font-semibold text-gray-900">15-Minute Audit</h1>
      </div>
      
      {/* Navigation Items */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        <button
          onClick={() => onViewChange('dashboard')}
          className={cn(
            'w-full flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors',
            currentView === 'dashboard'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100'
          )}
        >
          <BarChart3 className="w-5 h-5 mr-3" />
          Dashboard
        </button>
        
        <button
          onClick={() => onViewChange('planner')}
          className={cn(
            'w-full flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors',
            currentView === 'planner'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100'
          )}
        >
          <Calendar className="w-5 h-5 mr-3" />
          Daily Planner
        </button>
      </nav>
      
      {/* New Task Button */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleNewTask}
          className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Task
        </button>
      </div>
    </div>
  );
}