import { create } from 'zustand';
import { Task, TaskValue, EnergyLevel, TaskCategory, ScheduledTask, ParkingLotTask, TimerStep } from '../types';
import { startOfDay, format, addDays, subDays, isSameDay, parseISO, addMinutes, parse, isValid } from 'date-fns';
import { persist } from 'zustand/middleware';
import { 
  AutomationAnalysis, 
  emptyAnalysis, 
  analyzeTasksForAutomation,
  getMockAnalysis
} from '../lib/automationAnalysis';
import { DateRange } from '../components/DateRangePicker';
import { supabase } from '../lib/supabase';
import { getTasks, createTask, updateTask, deleteTask, addTimerStep } from '../services/taskService';

interface TimeAuditState {
  tasks: Task[];
  selectedDate: Date;
  selectedDateRange: DateRange | null;
  automationAnalysis: AutomationAnalysis;
  isAnalyzing: boolean;
  lastAnalysisDate: Date | null;
  debugMode: boolean;
  isTaskModalOpen: boolean;
  parkingLotTasks: ParkingLotTask[];
  scheduledTasks: ScheduledTask[];
  activeTimerTask: string | null;
  timerRunning: boolean;
  timerStartTime: number | null;
  timerElapsedTime: number;
  isLoading: boolean;
  userId: string | null;
  setUserId: (userId: string | null) => void;
  fetchUserTasks: (userId: string) => Promise<void>;
  addTask: (task: Omit<Task, 'id'>) => Promise<void>;
  updateTask: (id: string, task: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  setSelectedDate: (date: Date) => void;
  setSelectedDateRange: (dateRange: DateRange) => void;
  runAutomationAnalysis: (dateRange: DateRange) => Promise<void>;
  toggleDebugMode: () => void;
  setTaskModalOpen: (isOpen: boolean) => void;
  addParkingLotTask: (task: Omit<ParkingLotTask, 'id' | 'order'>) => Promise<ParkingLotTask | undefined>;
  updateParkingLotTask: (id: string, task: Partial<ParkingLotTask>) => Promise<void>;
  deleteParkingLotTask: (id: string) => Promise<void>;
  addScheduledTask: (task: Omit<ScheduledTask, 'id'>) => Promise<ScheduledTask | undefined>;
  updateScheduledTask: (id: string, task: Partial<ScheduledTask>) => Promise<void>;
  deleteScheduledTask: (id: string) => Promise<void>;
  moveTaskToTimeSlot: (taskId: string, timeSlot: string, fromParkingLot?: boolean) => Promise<void>;
  moveTaskToParkingLot: (taskId: string) => Promise<void>;
  startTimer: (taskId: string) => void;
  pauseTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  addTimerStep: (taskId: string, description: string) => Promise<void>;
  getTasksForDate: (date: Date) => {
    parkingLotTasks: ParkingLotTask[];
    scheduledTasks: ScheduledTask[];
  };
  getTaskDurationInMinutes: (task: ScheduledTask) => number;
}

export const useTimeAuditStore = create<TimeAuditState>()(
  persist(
    (set, get) => ({
      tasks: [],
      selectedDate: startOfDay(new Date()),
      selectedDateRange: null,
      automationAnalysis: emptyAnalysis,
      isAnalyzing: false,
      lastAnalysisDate: null,
      debugMode: false,
      isTaskModalOpen: false,
      parkingLotTasks: [],
      scheduledTasks: [],
      activeTimerTask: null,
      timerRunning: false,
      timerStartTime: null,
      timerElapsedTime: 0,
      isLoading: false,
      userId: null,
      
      setUserId: (userId) => set({ userId }),
      
      fetchUserTasks: async (userId) => {
        try {
          set({ isLoading: true });
          
          // Fetch tasks from Supabase
          const userTasks = await getTasks(userId);
          
          // Separate tasks into parkingLot and scheduled
          const parkingLotTasks: ParkingLotTask[] = [];
          const scheduledTasks: ScheduledTask[] = [];
          
          userTasks.forEach(task => {
            // Ensure timerElapsed is initialized
            const timerElapsed = task.timerElapsed || 0;
            
            if (task.parkingLot) {
              parkingLotTasks.push({
                ...task,
                timerElapsed,
                order: parkingLotTasks.length // Assign order based on array length
              } as ParkingLotTask);
            } else if (task.scheduled) {
              scheduledTasks.push({
                ...task,
                timerElapsed,
                timeSlot: task.startTime // Use startTime as timeSlot
              } as ScheduledTask);
            }
          });
          
          set({ 
            tasks: userTasks,
            parkingLotTasks,
            scheduledTasks,
            isLoading: false,
            userId
          });
        } catch (error) {
          console.error('Error fetching user tasks:', error);
          set({ isLoading: false });
        }
      },
      
      addTask: async (task) => {
        const { userId } = get();
        if (!userId) return;
        
        try {
          // Create task in Supabase
          const newTask = await createTask(task, userId);
          
          set((state) => {
            const newTasks = [...state.tasks, newTask];
            return { tasks: newTasks };
          });
        } catch (error) {
          console.error('Error adding task:', error);
        }
      },
      
      updateTask: async (id, updatedTask) => {
        const { userId } = get();
        if (!userId) return;
        
        try {
          // Update task in Supabase
          await updateTask(id, updatedTask, userId);
          
          set((state) => ({
            tasks: state.tasks.map((task) =>
              task.id === id ? { ...task, ...updatedTask } : task
            ),
          }));
        } catch (error) {
          console.error('Error updating task:', error);
        }
      },
      
      deleteTask: async (id) => {
        const { userId } = get();
        if (!userId) return;
        
        try {
          // Delete task from Supabase
          await deleteTask(id, userId);
          
          set((state) => ({
            tasks: state.tasks.filter((task) => task.id !== id),
          }));
        } catch (error) {
          console.error('Error deleting task:', error);
        }
      },
      
      setSelectedDate: (date) =>
        set(() => ({
          selectedDate: startOfDay(date),
        })),
        
      setSelectedDateRange: (dateRange) =>
        set(() => ({
          selectedDateRange: dateRange,
        })),
        
      runAutomationAnalysis: async (dateRange) => {
        const { tasks } = get();
        
        // Don't run if already analyzing
        if (get().isAnalyzing) return;
        
        // Don't run if no tasks
        if (tasks.length === 0) {
          // Use mock data for demo purposes when no tasks exist
          set({ 
            automationAnalysis: getMockAnalysis(dateRange),
            lastAnalysisDate: new Date(),
            isAnalyzing: false
          });
          return;
        }
        
        set({ isAnalyzing: true });
        
        try {
          const analysis = await analyzeTasksForAutomation(tasks, dateRange);
          set({ 
            automationAnalysis: analysis,
            lastAnalysisDate: new Date(),
            isAnalyzing: false
          });
          
          if (get().debugMode) {
            console.log('Automation analysis completed:', analysis);
            console.log(`Analyzed ${analysis.taskCount} tasks in range ${analysis.dateRange.label}`);
          }
        } catch (error) {
          console.error('Error running automation analysis:', error);
          set({ isAnalyzing: false });
        }
      },
      
      toggleDebugMode: () => set((state) => ({ debugMode: !state.debugMode })),
      
      setTaskModalOpen: (isOpen) => set(() => ({ isTaskModalOpen: isOpen })),
      
      // Parking Lot Tasks
      addParkingLotTask: async (task) => {
        const { userId } = get();
        if (!userId) return;
        
        try {
          const parkingLotTask = { 
            ...task, 
            parkingLot: true,
            scheduled: false,
            timerElapsed: 0 // Initialize timer to 0
          };
          
          // Create task in Supabase
          const newTask = await createTask(parkingLotTask, userId);
          
          // Add order property for frontend
          const newParkingLotTask = {
            ...newTask,
            order: get().parkingLotTasks.length
          } as ParkingLotTask;
          
          set((state) => ({ 
            parkingLotTasks: [...state.parkingLotTasks, newParkingLotTask],
            tasks: [...state.tasks, newTask]
          }));
          
          return newParkingLotTask;
        } catch (error) {
          console.error('Error adding parking lot task:', error);
          return undefined;
        }
      },
      
      updateParkingLotTask: async (id, updatedTask) => {
        const { userId } = get();
        if (!userId) return;
        
        try {
          // Update task in Supabase
          await updateTask(id, updatedTask, userId);
          
          // Update in parking lot tasks
          const updatedParkingLotTasks = get().parkingLotTasks.map((task) =>
            task.id === id ? { ...task, ...updatedTask } : task
          );
          
          // Also update in main tasks list
          const updatedTasks = get().tasks.map((task) =>
            task.id === id ? { ...task, ...updatedTask } : task
          );
          
          set({ 
            parkingLotTasks: updatedParkingLotTasks,
            tasks: updatedTasks
          });
        } catch (error) {
          console.error('Error updating parking lot task:', error);
        }
      },
      
      deleteParkingLotTask: async (id) => {
        const { userId } = get();
        if (!userId) return;
        
        try {
          // Delete task from Supabase
          await deleteTask(id, userId);
          
          // Remove from parking lot tasks
          const filteredParkingLotTasks = get().parkingLotTasks.filter((task) => task.id !== id);
          
          // Reorder remaining tasks
          const reorderedParkingLotTasks = filteredParkingLotTasks.map((task, index) => ({
            ...task,
            order: index
          }));
          
          // Also remove from main tasks list if it's not scheduled
          const isScheduled = get().scheduledTasks.some(task => task.id === id);
          const filteredTasks = isScheduled 
            ? get().tasks 
            : get().tasks.filter((task) => task.id !== id);
          
          set({ 
            parkingLotTasks: reorderedParkingLotTasks,
            tasks: filteredTasks
          });
        } catch (error) {
          console.error('Error deleting parking lot task:', error);
        }
      },
      
      // Scheduled Tasks
      addScheduledTask: async (task) => {
        const { userId } = get();
        if (!userId) return;
        
        try {
          const scheduledTask = { 
            ...task, 
            scheduled: true,
            parkingLot: false,
            timerElapsed: 0 // Initialize timer to 0
          };
          
          // Create task in Supabase
          const newTask = await createTask(scheduledTask, userId);
          
          // Add timeSlot property for frontend
          const newScheduledTask = {
            ...newTask,
            timeSlot: task.timeSlot
          } as ScheduledTask;
          
          set((state) => ({ 
            scheduledTasks: [...state.scheduledTasks, newScheduledTask],
            tasks: [...state.tasks, newTask]
          }));
          
          return newScheduledTask;
        } catch (error) {
          console.error('Error adding scheduled task:', error);
          return undefined;
        }
      },
      
      updateScheduledTask: async (id, updatedTask) => {
        const { userId } = get();
        if (!userId) return;
        
        try {
          // Update task in Supabase
          await updateTask(id, updatedTask, userId);
          
          // Update in scheduled tasks
          const updatedScheduledTasks = get().scheduledTasks.map((task) =>
            task.id === id ? { ...task, ...updatedTask } : task
          );
          
          // Also update in main tasks list
          const updatedTasks = get().tasks.map((task) =>
            task.id === id ? { ...task, ...updatedTask } : task
          );
          
          set({ 
            scheduledTasks: updatedScheduledTasks,
            tasks: updatedTasks
          });
        } catch (error) {
          console.error('Error updating scheduled task:', error);
        }
      },
      
      deleteScheduledTask: async (id) => {
        const { userId } = get();
        if (!userId) return;
        
        try {
          // Delete task from Supabase
          await deleteTask(id, userId);
          
          // Remove from scheduled tasks
          const filteredScheduledTasks = get().scheduledTasks.filter((task) => task.id !== id);
          
          // Also remove from main tasks list if it's not in parking lot
          const isInParkingLot = get().parkingLotTasks.some(task => task.id === id);
          const filteredTasks = isInParkingLot 
            ? get().tasks 
            : get().tasks.filter((task) => task.id !== id);
          
          set({ 
            scheduledTasks: filteredScheduledTasks,
            tasks: filteredTasks
          });
        } catch (error) {
          console.error('Error deleting scheduled task:', error);
        }
      },
      
      // Move tasks between parking lot and time slots
      moveTaskToTimeSlot: async (taskId, timeSlot, fromParkingLot = true) => {
        const { userId } = get();
        if (!userId) return;
        
        let taskToMove: Task | undefined;
        let updatedParkingLotTasks = [...get().parkingLotTasks];
        let updatedScheduledTasks = [...get().scheduledTasks];
        
        // Find the task to move
        if (fromParkingLot) {
          taskToMove = get().parkingLotTasks.find(task => task.id === taskId);
          if (taskToMove) {
            // Remove from parking lot
            updatedParkingLotTasks = get().parkingLotTasks.filter(task => task.id !== taskId);
            
            // Reorder remaining parking lot tasks
            updatedParkingLotTasks = updatedParkingLotTasks.map((task, index) => ({
              ...task,
              order: index
            }));
          }
        } else {
          // Moving from one time slot to another
          taskToMove = get().scheduledTasks.find(task => task.id === taskId);
          if (taskToMove) {
            // Remove from scheduled tasks
            updatedScheduledTasks = get().scheduledTasks.filter(task => task.id !== taskId);
          }
        }
        
        if (!taskToMove) return;
        
        // Calculate end time based on start time and duration
        const startTime = timeSlot;
        let endTime = '';
        
        try {
          // Parse the start time
          const parsedStartTime = parse(startTime, 'HH:mm', new Date());
          
          if (!isValid(parsedStartTime)) {
            throw new Error('Invalid start time');
          }
          
          // Calculate duration in minutes from the original task
          let durationMinutes = 15; // Default to 15 minutes
          
          if (taskToMove.startTime && taskToMove.endTime) {
            const originalStart = parse(taskToMove.startTime, 'HH:mm', new Date());
            const originalEnd = parse(taskToMove.endTime, 'HH:mm', new Date());
            
            if (isValid(originalStart) && isValid(originalEnd)) {
              durationMinutes = (originalEnd.getTime() - originalStart.getTime()) / (1000 * 60);
            }
          }
          
          // Calculate the new end time
          const parsedEndTime = addMinutes(parsedStartTime, durationMinutes);
          endTime = format(parsedEndTime, 'HH:mm');
        } catch (error) {
          console.error('Error calculating end time:', error);
          // Fallback to 15 minutes later
          try {
            const parsedStartTime = parse(startTime, 'HH:mm', new Date());
            const parsedEndTime = addMinutes(parsedStartTime, 15);
            endTime = format(parsedEndTime, 'HH:mm');
          } catch (fallbackError) {
            console.error('Fallback error calculating end time:', fallbackError);
            // Last resort fallback
            endTime = startTime;
          }
        }
        
        // Create scheduled task object
        const scheduledTask: ScheduledTask = {
          ...taskToMove,
          timeSlot,
          startTime,
          endTime,
          scheduled: true,
          parkingLot: false
        };
        
        // Remove 'order' property if it exists
        if ('order' in scheduledTask) {
          delete (scheduledTask as any).order;
        }
        
        // Update task in Supabase
        try {
          await updateTask(taskId, {
            startTime,
            endTime,
            scheduled: true,
            parkingLot: false
          }, userId);
          
          // Add to scheduled tasks
          updatedScheduledTasks.push(scheduledTask);
          
          // Update in main tasks list
          const updatedTasks = get().tasks.map(task => 
            task.id === taskId 
              ? { ...task, startTime, endTime, scheduled: true, parkingLot: false }
              : task
          );
          
          set({
            parkingLotTasks: updatedParkingLotTasks,
            scheduledTasks: updatedScheduledTasks,
            tasks: updatedTasks
          });
        } catch (error) {
          console.error('Error moving task to time slot:', error);
        }
      },
      
      moveTaskToParkingLot: async (taskId) => {
        const { userId } = get();
        if (!userId) return;
        
        // Find the task in scheduled tasks
        const taskToMove = get().scheduledTasks.find(task => task.id === taskId);
        if (!taskToMove) return;
        
        // Remove from scheduled tasks
        const updatedScheduledTasks = get().scheduledTasks.filter(task => task.id !== taskId);
        
        // Create parking lot task object
        const parkingLotTask: ParkingLotTask = {
          ...taskToMove,
          order: get().parkingLotTasks.length,
          parkingLot: true,
          scheduled: false
        };
        
        // Remove 'timeSlot' property if it exists
        if ('timeSlot' in parkingLotTask) {
          delete (parkingLotTask as any).timeSlot;
        }
        
        try {
          // Update task in Supabase
          await updateTask(taskId, {
            parkingLot: true,
            scheduled: false
          }, userId);
          
          // Add to parking lot tasks
          const updatedParkingLotTasks = [...get().parkingLotTasks, parkingLotTask];
          
          // Update in main tasks list
          const updatedTasks = get().tasks.map(task => 
            task.id === taskId 
              ? { ...task, parkingLot: true, scheduled: false }
              : task
          );
          
          set({
            scheduledTasks: updatedScheduledTasks,
            parkingLotTasks: updatedParkingLotTasks,
            tasks: updatedTasks
          });
        } catch (error) {
          console.error('Error moving task to parking lot:', error);
        }
      },
      
      // Calculate task duration in minutes
      getTaskDurationInMinutes: (task) => {
        if (!task.startTime || !task.endTime) return 0;
        
        const startTime = parse(task.startTime, 'HH:mm', new Date());
        const endTime = parse(task.endTime, 'HH:mm', new Date());
        
        if (!isValid(startTime) || !isValid(endTime)) return 0;
        
        const diffInMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
        return Math.max(0, diffInMinutes);
      },
      
      // Timer functions
      startTimer: (taskId: string) => {
        console.log('Starting timer for task:', taskId);
        const now = Date.now();
        
        // Get the task's previous elapsed time
        const task = get().scheduledTasks.find(t => t.id === taskId) || 
                    get().parkingLotTasks.find(t => t.id === taskId);
        
        const previousElapsed = task?.timerElapsed ? task.timerElapsed * 1000 : 0;
        
        set((state) => {
          // If it's the same task that was already running, keep the elapsed time
          const isSameTask = state.activeTimerTask === taskId;
          return {
            activeTimerTask: taskId,
            timerRunning: true,
            timerStartTime: now,
            timerElapsedTime: isSameTask ? state.timerElapsedTime : previousElapsed
          };
        });
      },
      
      pauseTimer: () => {
        console.log('Pausing timer');
        const { timerStartTime, timerElapsedTime } = get();
        if (!timerStartTime) return;
        
        const now = Date.now();
        const elapsedSinceStart = now - timerStartTime;
        const totalElapsed = timerElapsedTime + elapsedSinceStart;
        
        set({
          timerRunning: false,
          timerStartTime: null,
          timerElapsedTime: totalElapsed
        });
      },
      
      stopTimer: () => {
        console.log('Stopping timer');
        const { timerStartTime, timerElapsedTime, activeTimerTask } = get();
        if (!timerStartTime || !activeTimerTask) return;
        
        const now = Date.now();
        const elapsedSinceStart = now - timerStartTime;
        const totalElapsed = timerElapsedTime + elapsedSinceStart;
        const elapsedSeconds = Math.floor(totalElapsed / 1000);
        
        // Update the task's elapsed time in the database
        const task = get().scheduledTasks.find(t => t.id === activeTimerTask) || 
                    get().parkingLotTasks.find(t => t.id === activeTimerTask);
                    
        if (task) {
          // Update the task's timer_elapsed field
          get().updateTask(activeTimerTask, {
            timerElapsed: elapsedSeconds
          });
          
          // Update local state
          const updatedScheduledTasks = get().scheduledTasks.map(t => 
            t.id === activeTimerTask ? { ...t, timerElapsed: elapsedSeconds } : t
          );
          
          const updatedParkingLotTasks = get().parkingLotTasks.map(t => 
            t.id === activeTimerTask ? { ...t, timerElapsed: elapsedSeconds } : t
          );
          
          set({
            scheduledTasks: updatedScheduledTasks,
            parkingLotTasks: updatedParkingLotTasks,
            activeTimerTask: null,
            timerRunning: false,
            timerStartTime: null,
            timerElapsedTime: 0
          });
        }
      },
      
      resetTimer: () => {
        console.log('Resetting timer');
        set({
          activeTimerTask: null,
          timerRunning: false,
          timerStartTime: null,
          timerElapsedTime: 0
        });
      },
      
      addTimerStep: async (taskId, description) => {
        const { userId } = get();
        if (!userId) return;
        
        // Calculate current elapsed time
        const state = get();
        const now = Date.now();
        const elapsedSinceStart = state.timerRunning && state.timerStartTime 
          ? now - state.timerStartTime 
          : 0;
        const totalElapsed = state.timerElapsedTime + elapsedSinceStart;
        const elapsedSeconds = Math.floor(totalElapsed / 1000);
        
        const newStep: TimerStep = {
          description,
          elapsedTime: elapsedSeconds
        };
        
        try {
          // Add timer step to Supabase
          await addTimerStep(taskId, newStep, userId);
          
          // Find the task in either scheduled or parking lot tasks
          let updatedTasks = [...state.tasks];
          let updatedScheduledTasks = [...state.scheduledTasks];
          let updatedParkingLotTasks = [...state.parkingLotTasks];
          
          // Update in main tasks list
          updatedTasks = updatedTasks.map(task => {
            if (task.id === taskId) {
              const currentSteps = task.timerSteps || [];
              return { ...task, timerSteps: [...currentSteps, newStep] };
            }
            return task;
          });
          
          // Update in scheduled tasks
          updatedScheduledTasks = updatedScheduledTasks.map(task => {
            if (task.id === taskId) {
              const currentSteps = task.timerSteps || [];
              return { ...task, timerSteps: [...currentSteps, newStep] };
            }
            return task;
          });
          
          // Update in parking lot tasks
          updatedParkingLotTasks = updatedParkingLotTasks.map(task => {
            if (task.id === taskId) {
              const currentSteps = task.timerSteps || [];
              return { ...task, timerSteps: [...currentSteps, newStep] };
            }
            return task;
          });
          
          set({
            tasks: updatedTasks,
            scheduledTasks: updatedScheduledTasks,
            parkingLotTasks: updatedParkingLotTasks
          });
        } catch (error) {
          console.error('Error adding timer step:', error);
        }
      },
      
      // Get tasks for a specific date
      getTasksForDate: (date) => {
        const { parkingLotTasks, scheduledTasks } = get();
        
        // Filter parking lot tasks for the selected date
        const filteredParkingLotTasks = parkingLotTasks.filter((task) => {
          try {
            return isSameDay(parseISO(task.date), date);
          } catch (error) {
            console.error('Error parsing date:', error);
            return false;
          }
        });
        
        // Filter scheduled tasks for the selected date
        const filteredScheduledTasks = scheduledTasks.filter((task) => {
          try {
            return isSameDay(parseISO(task.date), date);
          } catch (error) {
            console.error('Error parsing date:', error);
            return false;
          }
        });
        
        return {
          parkingLotTasks: filteredParkingLotTasks,
          scheduledTasks: filteredScheduledTasks
        };
      }
    }),
    {
      name: 'time-audit-storage',
      partialize: (state) => ({
        selectedDate: state.selectedDate.toISOString(),
        selectedDateRange: state.selectedDateRange ? {
          start: state.selectedDateRange.start.toISOString(),
          end: state.selectedDateRange.end.toISOString(),
          label: state.selectedDateRange.label
        } : null,
        automationAnalysis: {
          ...state.automationAnalysis,
          lastUpdated: state.automationAnalysis.lastUpdated.toISOString(),
          dateRange: {
            start: state.automationAnalysis.dateRange.start.toISOString(),
            end: state.automationAnalysis.dateRange.end.toISOString(),
            label: state.automationAnalysis.dateRange.label
          }
        },
        lastAnalysisDate: state.lastAnalysisDate?.toISOString() || null,
        debugMode: state.debugMode,
        userId: state.userId
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert date strings back to Date objects
          try {
            state.selectedDate = new Date(state.selectedDate);
            
            if (state.lastAnalysisDate) {
              state.lastAnalysisDate = new Date(state.lastAnalysisDate);
            }
            
            if (state.selectedDateRange) {
              state.selectedDateRange = {
                start: new Date(state.selectedDateRange.start),
                end: new Date(state.selectedDateRange.end),
                label: state.selectedDateRange.label
              };
            }
            
            if (state.automationAnalysis) {
              state.automationAnalysis.lastUpdated = new Date(state.automationAnalysis.lastUpdated);
              state.automationAnalysis.dateRange = {
                start: new Date(state.automationAnalysis.dateRange.start),
                end: new Date(state.automationAnalysis.dateRange.end),
                label: state.automationAnalysis.dateRange.label
              };
            }
            
            // Fetch user tasks if we have a userId
            if (state.userId) {
              state.fetchUserTasks(state.userId);
            }
          } catch (error) {
            console.error('Error converting dates during rehydration:', error);
          }
        }
      },
    }
  )
);