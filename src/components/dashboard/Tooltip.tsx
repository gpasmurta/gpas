import React from 'react';
import { Info } from 'lucide-react';

interface TooltipProps {
  content: string;
}

export function Tooltip({ content }: TooltipProps) {
  return (
    <div className="group relative inline-block">
      <Info className="w-4 h-4 text-gray-400 cursor-help" />
      <div className="absolute z-10 w-64 p-2 text-xs bg-gray-800 text-white rounded shadow-lg 
                    opacity-0 group-hover:opacity-100 transition-opacity duration-300 
                    pointer-events-none bottom-full left-1/2 transform -translate-x-1/2 mb-1">
        {content}
        <div className="absolute w-2 h-2 bg-gray-800 transform rotate-45 left-1/2 -translate-x-1/2 -bottom-1"></div>
      </div>
    </div>
  );
} 