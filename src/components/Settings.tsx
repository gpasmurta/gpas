import React from 'react';
import { useSettingsStore, OpenAIModel } from '../stores/settingsStore';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { openAIModel, setOpenAIModel } = useSettingsStore();

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setOpenAIModel(e.target.value as OpenAIModel);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label htmlFor="openai-model" className="block text-sm font-medium text-gray-700">
              OpenAI Model
            </label>
            <select
              id="openai-model"
              value={openAIModel}
              onChange={handleModelChange}
              className={cn(
                "mt-1 block w-full rounded-md border-gray-300 shadow-sm",
                "focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              )}
            >
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster)</option>
              <option value="gpt-4">GPT-4 (More Accurate)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Select which OpenAI model to use for task categorization and process summarization.
              GPT-4 is more accurate but slower and may cost more credits.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 