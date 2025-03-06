import { create } from 'zustand';
import { DailyRecap, CoachingStyle } from '../types/recap';
import { recapService } from '../services/recap';
import { useTimeAuditStore } from './timeAudit';
import { Task } from '../types/task';

interface RecapStore {
  // State
  currentRecap: DailyRecap | null;
  isLoading: boolean;
  error: string | null;
  isExpanded: boolean;

  // Actions
  setCurrentRecap: (recap: DailyRecap | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setIsExpanded: (expanded: boolean) => void;
  generateRecap: (date: string) => Promise<void>;
}

const initialState = {
  currentRecap: null,
  isLoading: false,
  error: null,
  isExpanded: false,
};

export const useRecapStore = create<RecapStore>((set, get) => ({
  // Initial state
  ...initialState,

  // Actions
  setCurrentRecap: (recap) => set({ currentRecap: recap }),
  
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  setIsExpanded: (expanded) => set({ isExpanded: expanded }),
  
  generateRecap: async (date) => {
    try {
      set({ isLoading: true, error: null });
      console.log('Generating recap for date:', date); // Debug log
      
      // Get tasks from the store
      const { getTasksForDate } = useTimeAuditStore.getState();
      const { scheduledTasks, parkingLotTasks } = getTasksForDate(date);
      
      console.log('Tasks found:', { scheduledTasks, parkingLotTasks }); // Debug log

      // Generate the recap
      const recap: DailyRecap = {
        id: `recap-${date}`,
        date,
        insights: {
          quote: "It's not what we do once in a while that shapes our lives, but what we do CONSISTENTLY!",
          daySummary: `${scheduledTasks.length} tasks scheduled, ${scheduledTasks.filter((t: Task) => t.isCompleted).length} completed`,
          energyPatterns: [
            'Morning activity started at 6 AM',
            `${scheduledTasks.filter((t: Task) => t.category === 'work').length} work tasks scheduled`,
            'Consider tracking your energy levels throughout the day'
          ],
          taskImpact: [
            `${scheduledTasks.filter((t: Task) => t.isCompleted).length} tasks completed today`,
            'Building momentum with consistent task completion'
          ],
          coachInsights: [
            'Try scheduling specific tasks rather than using the parking lot',
            'Set realistic time blocks for each task',
            'Your morning routine sets the tone for your entire day'
          ],
          powerQuestions: [
            'What\'s the ONE task that would make tomorrow amazing if completed?',
            'How can you eliminate distractions during your peak energy hours?'
          ],
          tomorrowFocus: [
            'Plan your most important task before 10 AM',
            'Add more structure to your timeline',
            'Remember your "why" - connect your tasks to your bigger purpose'
          ]
        },
        stats: {
          productivityScore: Math.round((scheduledTasks.filter((t: Task) => t.isCompleted).length / scheduledTasks.length) * 100) || 0,
          completedTasks: scheduledTasks.filter((t: Task) => t.isCompleted).length,
          totalTasks: scheduledTasks.length + parkingLotTasks.length,
          timeDistribution: {
            work: 60,
            personal: 20,
            health: 10,
            learning: 10
          }
        },
        userPreferences: {
          coachingStyle: 'motivational' as CoachingStyle,
          autoGenerate: false,
          visibleSections: {
            quote: true,
            daySummary: true,
            energyPatterns: true,
            taskImpact: true,
            coachInsights: true,
            powerQuestions: true,
            tomorrowFocus: true
          }
        }
      };

      console.log('Generated recap:', recap); // Debug log
      
      set({ 
        currentRecap: recap, 
        isExpanded: true,
        error: null
      });
    } catch (error) {
      console.error('Error generating recap:', error); // Debug log
      set({ 
        error: error instanceof Error ? error.message : 'Failed to generate recap',
        currentRecap: null
      });
    } finally {
      set({ isLoading: false });
    }
  }
})); 