import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  tooltip?: string;
  subtitle?: string;
}

export function SummaryCard({ title, value, icon, tooltip, subtitle }: SummaryCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-gray-500">{icon}</div>
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        {tooltip && <Tooltip content={tooltip} />}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {subtitle && (
        <div className="text-sm text-gray-500 mt-1">{subtitle}</div>
      )}
    </div>
  );
} 