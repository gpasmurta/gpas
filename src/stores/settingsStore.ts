import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type OpenAIModel = 'gpt-3.5-turbo' | 'gpt-4';

interface SettingsState {
  openAIModel: OpenAIModel;
  setOpenAIModel: (model: OpenAIModel) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      openAIModel: 'gpt-3.5-turbo',
      setOpenAIModel: (model) => set({ openAIModel: model }),
    }),
    {
      name: 'settings-storage',
    }
  )
); 