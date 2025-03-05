import React from 'react';
import { BarChart3, Sparkles } from 'lucide-react';
import { DashboardTab } from '../../types/dashboard';

interface TabNavigationProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="flex space-x-4">
      <button
        onClick={() => onTabChange('analytics')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
          ${activeTab === 'analytics'
            ? 'bg-blue-50 text-blue-700'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
      >
        <BarChart3 className="w-4 h-4" />
        Analytics
      </button>
      
      <button
        onClick={() => onTabChange('automation')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
          ${activeTab === 'automation'
            ? 'bg-blue-50 text-blue-700'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
      >
        <Sparkles className="w-4 h-4" />
        Automation
      </button>
    </div>
  );
} 