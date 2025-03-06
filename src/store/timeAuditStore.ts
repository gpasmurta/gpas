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
import { getTasksForDate, createTask, updateTask, deleteTask, addTimerStep } from '../services/taskService';
import { calculateDurationInMinutes } from '../lib/utils';

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
  user: { id: string } | null;
  setUserId: (userId: string | null) => void;
  fetchUserTasks: (userId: string, date?: Date) => Promise<void>;
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
  getTasksForDate: (date: Date | string) => {
    parkingLotTasks: ParkingLotTask[];
    scheduledTasks: ScheduledTask[];
  };
  getTaskDurationInMinutes: (task: ScheduledTask) => number;
}

export const useTimeAuditStore = create<TimeAuditState>()(
  persist(
    (set, get) => {
      // Check initial authentication status
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          console.log('Initializing store with authenticated user:', user.id);
          set({ user: { id: user.id }, userId: user.id });
          
          // Fetch tasks for the current date
          const currentDate = get().selectedDate;
          // Ensure currentDate is a valid Date object
          if (currentDate instanceof Date && !isNaN(currentDate.getTime())) {
            get().fetchUserTasks(user.id, currentDate);
          } else {
            console.error('Invalid selectedDate in store:', currentDate);
            // Set a valid date and then fetch tasks
            set({ selectedDate: new Date() });
            get().fetchUserTasks(user.id, new Date());
          }
        }
      }).catch(error => {
        console.error('Error checking initial authentication:', error);
      });

      return {
        tasks: [],
        selectedDate: new Date(),
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
        user: null,
        
        setUserId: (userId) => set({ userId }),
        
        setSelectedDateRange: (dateRange: DateRange) => {
          console.log('Setting date range:', dateRange);
          set({ selectedDateRange: dateRange });
        },
        
        fetchUserTasks: async (userId: string, date?: Date) => {
          try {
            // Ensure we have a valid Date object in UTC
            let inputDate: Date;
            if (date instanceof Date && !isNaN(date.getTime())) {
              inputDate = date;
            } else if (date) {
              inputDate = new Date(date);
            } else {
              const storeDate = get().selectedDate;
              // Ensure storeDate is a valid Date object
              if (storeDate instanceof Date && !isNaN(storeDate.getTime())) {
                inputDate = storeDate;
              } else {
                console.error('Invalid selectedDate in store during fetchUserTasks:', storeDate);
                inputDate = new Date();
                // Update the store with a valid date
                set({ selectedDate: inputDate });
              }
            }

            console.log('Initial date in fetchUserTasks:', {
              inputDateType: typeof inputDate,
              inputDate: inputDate instanceof Date ? inputDate.toISOString() : String(inputDate),
              selectedDate: get().selectedDate instanceof Date ? 
                get().selectedDate.toISOString() : 
                `Invalid date: ${String(get().selectedDate)}`,
              now: new Date().toISOString()
            });

            // Create UTC midnight date for the current day
            const utcDate = new Date(Date.UTC(
              inputDate.getUTCFullYear(),
              inputDate.getUTCMonth(),
              inputDate.getUTCDate(),
              0, 0, 0, 0
            ));

            // Ensure it's a valid date
            if (isNaN(utcDate.getTime())) {
              console.error('Invalid date provided to fetchUserTasks:', date);
              return;
            }
            
            console.log('Starting fetchUserTasks:', {
              userId,
              inputDate: inputDate.toISOString(),
              utcDate: utcDate.toISOString(),
              currentState: {
                tasks: get().tasks.length,
                scheduledTasks: get().scheduledTasks.length,
                parkingLotTasks: get().parkingLotTasks.length
              }
            });
            
            set({ isLoading: true });
            
            // Format date to YYYY-MM-DD in UTC without timezone conversion
            const formattedDate = format(inputDate, 'yyyy-MM-dd');
            console.log('Fetching tasks with formatted date:', formattedDate, 'using local date format instead of UTC');
            
            // Fetch tasks from Supabase for the specific date
            const userTasks = await getTasksForDate(userId, formattedDate);
            console.log('Raw tasks from Supabase:', {
              count: userTasks.length,
              tasks: userTasks.map(t => ({
                id: t.id,
                title: t.title,
                date: t.date,
                parkingLot: t.parkingLot,
                scheduled: t.scheduled,
                startTime: t.startTime,
                endTime: t.endTime
              }))
            });
            
            // Separate tasks into parkingLot and scheduled
            const parkingLotTasks: ParkingLotTask[] = [];
            const scheduledTasks: ScheduledTask[] = [];
            
            userTasks.forEach(task => {
              // Log each task's date and properties for debugging
              console.log('Processing task for timeline:', {
                id: task.id,
                title: task.title,
                taskDate: task.date,
                currentDate: formattedDate,
                isParking: task.parkingLot,
                isScheduled: task.scheduled,
                startTime: task.startTime,
                endTime: task.endTime,
                timeSlot: task.scheduled ? (task as ScheduledTask).timeSlot : undefined,
                allProperties: task
              });
              
              // Ensure timerElapsed is initialized
              const timerElapsed = task.timerElapsed || 0;
              
              if (task.parkingLot) {
                console.log(`Task "${task.title}" added to parking lot`);
                parkingLotTasks.push({
                  ...task,
                  timerElapsed,
                  order: parkingLotTasks.length
                } as ParkingLotTask);
              } else if (task.scheduled && task.startTime) {
                console.log(`Task "${task.title}" added to timeline with:`, {
                  timeSlot: task.startTime,
                  startTime: task.startTime,
                  endTime: task.endTime
                });
                scheduledTasks.push({
                  ...task,
                  timerElapsed,
                  timeSlot: task.startTime
                } as ScheduledTask);
              } else {
                console.warn(`Task "${task.title}" not added to timeline - missing properties:`, {
                  scheduled: task.scheduled ? '✓' : '✗',
                  startTime: task.startTime ? '✓' : '✗',
                  parkingLot: task.parkingLot ? '✓' : '✗'
                });
              }
            });
            
            console.log('Tasks processed:', {
              totalTasks: userTasks.length,
              parkingLotTasks: {
                count: parkingLotTasks.length,
                tasks: parkingLotTasks.map(t => ({
                  id: t.id,
                  title: t.title,
                  date: t.date,
                  order: t.order,
                  startTime: t.startTime,
                  endTime: t.endTime
                }))
              },
              scheduledTasks: {
                count: scheduledTasks.length,
                tasks: scheduledTasks.map(t => ({
                  id: t.id,
                  title: t.title,
                  date: t.date,
                  timeSlot: t.timeSlot,
                  startTime: t.startTime,
                  endTime: t.endTime
                }))
              }
            });
            
            set({ 
              tasks: userTasks,
              parkingLotTasks,
              scheduledTasks,
              isLoading: false,
              userId
            });
            
            console.log('Store state after update:', {
              tasks: get().tasks.length,
              parkingLotTasks: get().parkingLotTasks.length,
              scheduledTasks: get().scheduledTasks.length,
              selectedDate: format(get().selectedDate, 'yyyy-MM-dd'),
              userId: get().userId
            });
            
          } catch (error) {
            console.error('Error in fetchUserTasks:', error);
            set({ isLoading: false });
          }
        },
        
        addTask: async (task) => {
          const { userId, selectedDate } = get();
          if (!userId) return;
          
          try {
            // Create UTC midnight date
            const utcDate = new Date(Date.UTC(
              selectedDate.getUTCFullYear(),
              selectedDate.getUTCMonth(),
              selectedDate.getUTCDate(),
              0, 0, 0, 0
            ));

            // Format date without timezone conversion
            const formattedDate = utcDate.toISOString().split('T')[0];
            
            // Ensure task has the correct date
            const taskWithDate = {
              ...task,
              date: formattedDate
            };
            
            // Create task in Supabase
            const newTask = await createTask(taskWithDate, userId);
            
            // Refresh tasks for the current date
            await get().fetchUserTasks(userId, selectedDate);
          } catch (error) {
            console.error('Error adding task:', error);
          }
        },
        
        updateTask: async (id, updatedTask) => {
          const { userId, selectedDate } = get();
          if (!userId) return;
          
          try {
            // Update task in Supabase
            await updateTask(id, updatedTask, userId);
            
            // Refresh tasks for the current date
            await get().fetchUserTasks(userId, selectedDate);
          } catch (error) {
            console.error('Error updating task:', error);
          }
        },
        
        deleteTask: async (id) => {
          const { userId, selectedDate } = get();
          if (!userId) return;
          
          try {
            // Delete task from Supabase
            await deleteTask(id, userId);
            
            // Refresh tasks for the current date
            await get().fetchUserTasks(userId, selectedDate);
          } catch (error) {
            console.error('Error deleting task:', error);
          }
        },
        
        setSelectedDate: (date: Date) => {
          try {
            // Ensure date is a valid Date object
            if (!(date instanceof Date) || isNaN(date.getTime())) {
              console.error('Invalid date provided to setSelectedDate:', date);
              date = new Date(); // Use current date as fallback
            }
            
            console.log('Setting selected date:', date.toISOString());
            set({ selectedDate: date });
            
            // Fetch tasks for the new date if user is authenticated
            const userId = get().userId;
            if (userId) {
              get().fetchUserTasks(userId, date);
            }
          } catch (error) {
            console.error('Error in setSelectedDate:', error);
            // Set to current date as fallback
            set({ selectedDate: new Date() });
          }
        },
        
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
        moveTaskToTimeSlot: async (taskId, timeSlot, fromParkingLot = false) => {
          const { userId, parkingLotTasks, scheduledTasks } = get();
          if (!userId) return;
          
          try {
            if (fromParkingLot) {
              // Moving from parking lot to timeline
              const task = parkingLotTasks.find(t => t.id === taskId);
              if (!task) return;
              
              // Calculate endTime based on timeSlot and a default 15 min duration
              const parsedStartTime = parse(timeSlot, 'HH:mm', new Date());
              const parsedEndTime = addMinutes(parsedStartTime, 15); // Default 15 min duration
              const endTime = format(parsedEndTime, 'HH:mm');
              
              // Update task properties
              const updatedTask = {
                ...task,
                timeSlot,
                startTime: timeSlot, // Set startTime to match the timeSlot
                endTime,            // Set endTime based on calculated duration
                scheduled: true,
                parkingLot: false,
                date: format(get().selectedDate, 'yyyy-MM-dd')
              };
              
              await updateTask(task.id, updatedTask, userId);
              
              // Update local state
              set(state => ({
                scheduledTasks: [...state.scheduledTasks, updatedTask],
                parkingLotTasks: state.parkingLotTasks.filter(t => t.id !== taskId)
              }));
            } else {
              // Moving an existing scheduled task
              const task = scheduledTasks.find(t => t.id === taskId);
              if (!task) return;
              
              // Calculate new endTime while preserving the task's duration
              const originalDuration = calculateDurationInMinutes(task.startTime, task.endTime);
              const parsedNewStartTime = parse(timeSlot, 'HH:mm', new Date());
              const parsedNewEndTime = addMinutes(parsedNewStartTime, originalDuration);
              const newEndTime = format(parsedNewEndTime, 'HH:mm');
              
              // Update task properties
              const updatedTask = {
                ...task,
                timeSlot,
                startTime: timeSlot, // Set startTime to match the timeSlot
                endTime: newEndTime, // Maintain the same duration
                date: format(get().selectedDate, 'yyyy-MM-dd')
              };
              
              await updateTask(task.id, updatedTask, userId);
              
              // Update local state
              set(state => ({
                scheduledTasks: state.scheduledTasks.map(t => 
                  t.id === taskId ? updatedTask : t
                )
              }));
            }
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
        getTasksForDate: (date: Date | string) => {
          try {
            let dateObj: Date;
            
            // Handle string dates (YYYY-MM-DD format)
            if (typeof date === 'string') {
              try {
                // Try to parse the string date
                dateObj = parseISO(date);
                if (isNaN(dateObj.getTime())) {
                  console.error('Invalid date string provided to getTasksForDate:', date);
                  dateObj = new Date(); // Use current date as fallback
                }
              } catch (error) {
                console.error('Error parsing date string in getTasksForDate:', error);
                dateObj = new Date(); // Use current date as fallback
              }
            } else if (date instanceof Date && !isNaN(date.getTime())) {
              // Use the provided Date object if it's valid
              dateObj = date;
            } else {
              // Handle invalid Date objects
              console.error('Invalid date provided to getTasksForDate:', date);
              dateObj = new Date(); // Use current date as fallback
            }
            
            const formattedDate = format(dateObj, 'yyyy-MM-dd');
            console.log(`Getting tasks for date: ${formattedDate}`);
            
            const parkingLotTasks = get().parkingLotTasks.filter(task => {
              try {
                // Handle case where task.date might be a string
                const taskDate = typeof task.date === 'string' ? task.date : format(task.date, 'yyyy-MM-dd');
                return taskDate === formattedDate;
              } catch (error) {
                console.error('Error filtering parking lot task by date:', error);
                return false;
              }
            });
            
            const scheduledTasks = get().scheduledTasks.filter(task => {
              try {
                // Handle case where task.date might be a string
                const taskDate = typeof task.date === 'string' ? task.date : format(task.date, 'yyyy-MM-dd');
                return taskDate === formattedDate;
              } catch (error) {
                console.error('Error filtering scheduled task by date:', error);
                return false;
              }
            });
            
            return { parkingLotTasks, scheduledTasks };
          } catch (error) {
            console.error('Error in getTasksForDate:', error);
            return { parkingLotTasks: [], scheduledTasks: [] };
          }
        }
      };
    },
    {
      name: 'time-audit-storage',
      // Serialize dates to ISO strings before storing
      serialize: (state) => {
        const typedState = state as unknown as TimeAuditState;
        const serialized = JSON.stringify({
          ...state,
          selectedDate: typedState.selectedDate instanceof Date ? typedState.selectedDate.toISOString() : new Date().toISOString(),
          lastAnalysisDate: typedState.lastAnalysisDate instanceof Date ? typedState.lastAnalysisDate.toISOString() : null
        });
        console.log('Serialized state for storage:', serialized.substring(0, 100) + '...');
        return serialized;
      },
      // Deserialize ISO strings back to Date objects
      deserialize: (str) => {
        try {
          const parsed = JSON.parse(str);
          
          // Convert selectedDate from ISO string to Date object
          if (typeof parsed.selectedDate === 'string') {
            try {
              parsed.selectedDate = new Date(parsed.selectedDate);
              console.log('Deserialized selectedDate:', parsed.selectedDate);
            } catch (e) {
              console.error('Error parsing selectedDate:', e);
              parsed.selectedDate = new Date();
            }
          } else {
            console.warn('selectedDate is not a string during deserialization:', parsed.selectedDate);
            parsed.selectedDate = new Date();
          }
          
          // Convert lastAnalysisDate from ISO string to Date object if it exists
          if (parsed.lastAnalysisDate && typeof parsed.lastAnalysisDate === 'string') {
            try {
              parsed.lastAnalysisDate = new Date(parsed.lastAnalysisDate);
            } catch (e) {
              console.error('Error parsing lastAnalysisDate:', e);
              parsed.lastAnalysisDate = null;
            }
          }
          
          return parsed;
        } catch (e) {
          console.error('Error deserializing state:', e);
          return {
            selectedDate: new Date(),
            lastAnalysisDate: null
          };
        }
      },
      // Add onRehydrateStorage to handle date conversion after rehydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('Rehydrating store state...');
          
          // Ensure selectedDate is a valid Date object
          if (!(state.selectedDate instanceof Date) || isNaN(state.selectedDate.getTime())) {
            console.log('Converting selectedDate to Date object during rehydration');
            state.selectedDate = new Date();
          }
          
          // Also ensure lastAnalysisDate is a valid Date if it exists
          if (state.lastAnalysisDate && 
              (!(state.lastAnalysisDate instanceof Date) || isNaN(state.lastAnalysisDate.getTime()))) {
            state.lastAnalysisDate = new Date();
          }
          
          console.log('Store rehydrated with selectedDate:', state.selectedDate);
        }
      }
    }
  )
);