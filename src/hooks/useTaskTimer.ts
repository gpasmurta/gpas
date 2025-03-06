import { useState, useEffect, useRef, useCallback } from 'react';
import { useTimeAuditStore } from '../store/timeAuditStore';
import { Task, ScheduledTask } from '../types';
import { formatElapsedTime } from '../lib/utils';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'stopped';

interface TimerState {
  taskTimers: Record<string, number>;
  timeRemaining: Record<string, number>;
  timerStatus: Record<string, TimerStatus>;
  finalElapsedTime: Record<string, number>;
}

/**
 * Custom hook for managing task timers
 * This centralizes timer logic that was previously duplicated across components
 */
export function useTaskTimer() {
  const {
    activeTimerTask,
    timerRunning,
    timerStartTime,
    timerElapsedTime,
    startTimer,
    pauseTimer,
    stopTimer,
    resetTimer,
    addTimerStep,
    getTaskDurationInMinutes,
    tasks,
    scheduledTasks,
    parkingLotTasks
  } = useTimeAuditStore();
  
  const [timerState, setTimerState] = useState<TimerState>({
    taskTimers: {},
    timeRemaining: {},
    timerStatus: {},
    finalElapsedTime: {}
  });
  
  const [showExceedingAlert, setShowExceedingAlert] = useState<string | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Initialize audio element
  useEffect(() => {
    if (typeof Audio !== 'undefined') {
      audioRef.current = new Audio('/sounds/timer-end.mp3');
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);
  
  // Get task duration in seconds
  const getTaskDurationInSeconds = useCallback((taskId: string) => {
    const task = scheduledTasks.find(t => t.id === taskId);
    if (!task) return 0;
    return getTaskDurationInMinutes(task) * 60;
  }, [scheduledTasks, getTaskDurationInMinutes]);
  
  // Get the active task object
  const getActiveTask = useCallback(() => {
    if (!activeTimerTask) return null;
    return scheduledTasks.find(task => task.id === activeTimerTask) || null;
  }, [activeTimerTask, scheduledTasks]);
  
  // Initialize timer state when hook is first used
  useEffect(() => {
    console.log('useTaskTimer hook initialized');
    
    // Request notification permission if needed
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
    
    // Initialize timer state for active task if there is one
    if (activeTimerTask && timerRunning) {
      console.log('Active task found on initialization:', activeTimerTask);
      const taskDurationSeconds = getTaskDurationInSeconds(activeTimerTask);
      
      // Calculate current elapsed time
      const now = Date.now();
      const elapsedSinceStart = timerStartTime ? now - timerStartTime : 0;
      const totalElapsed = timerElapsedTime + elapsedSinceStart;
      const elapsedSeconds = Math.floor(totalElapsed / 1000);
      const remainingSeconds = Math.max(0, taskDurationSeconds - elapsedSeconds);
      
      // Initialize state
      setTimerState(prev => ({
        ...prev,
        taskTimers: {
          ...prev.taskTimers,
          [activeTimerTask]: elapsedSeconds
        },
        timeRemaining: {
          ...prev.timeRemaining,
          [activeTimerTask]: remainingSeconds
        },
        timerStatus: {
          ...prev.timerStatus,
          [activeTimerTask]: 'running'
        }
      }));
    }

    // Initialize timer state for all tasks from persisted data
    const allTasks = [...scheduledTasks, ...parkingLotTasks];
    const newTimerState: TimerState = {
      taskTimers: { ...timerState.taskTimers },
      timeRemaining: { ...timerState.timeRemaining },
      timerStatus: { ...timerState.timerStatus },
      finalElapsedTime: { ...timerState.finalElapsedTime }
    };
    
    allTasks.forEach(task => {
      if (task.timerElapsed && typeof task.timerElapsed === 'number') {
        newTimerState.taskTimers[task.id] = task.timerElapsed;
        
        const taskDurationSeconds = getTaskDurationInSeconds(task.id);
        const remainingSeconds = Math.max(0, taskDurationSeconds - task.timerElapsed);
        newTimerState.timeRemaining[task.id] = remainingSeconds;
        
        // Set final elapsed time for completed tasks
        if (!activeTimerTask || activeTimerTask !== task.id) {
          newTimerState.finalElapsedTime[task.id] = task.timerElapsed;
          newTimerState.timerStatus[task.id] = 'stopped';
        }
      }
    });
    
    setTimerState(newTimerState);
  }, []);
  
  // Handle timer updates
  useEffect(() => {
    if (!activeTimerTask || !timerRunning) {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    const taskDurationSeconds = getTaskDurationInSeconds(activeTimerTask);
    
    const updateTimer = () => {
      const now = Date.now();
      // Prevent multiple updates in the same tick
      if (now - lastUpdateRef.current < 500) return;
      lastUpdateRef.current = now;

      const elapsedSinceStart = timerStartTime ? now - timerStartTime : 0;
      const totalElapsed = timerElapsedTime + elapsedSinceStart;
      const elapsedSeconds = Math.floor(totalElapsed / 1000);
      const remainingSeconds = Math.max(0, taskDurationSeconds - elapsedSeconds);
      
      setTimerState(prev => {
        const currentElapsed = prev.taskTimers[activeTimerTask];
        const currentRemaining = prev.timeRemaining[activeTimerTask];
        
        if (currentElapsed === elapsedSeconds && currentRemaining === remainingSeconds) {
          return prev;
        }
        
        return {
          ...prev,
          taskTimers: {
            ...prev.taskTimers,
            [activeTimerTask]: elapsedSeconds
          },
          timeRemaining: {
            ...prev.timeRemaining,
            [activeTimerTask]: remainingSeconds
          }
        };
      });
      
      if (remainingSeconds === 0 && !showExceedingAlert) {
        setShowExceedingAlert(activeTimerTask);
        
        try {
          if (audioRef.current) {
            audioRef.current.play().catch(err => console.error('Failed to play sound:', err));
          }
          
          if ('Notification' in window && Notification.permission === 'granted') {
            const task = getActiveTask();
            new Notification('Task Time Exceeded', {
              body: task ? `Time is up for task: ${task.title}` : 'Your scheduled task time is up',
              icon: '/favicon.ico'
            });
          }
        } catch (error) {
          console.error('Error playing sound:', error);
        }
      }
    };

    // Initial update
    updateTimer();
    
    // Set up interval
    timerIntervalRef.current = window.setInterval(updateTimer, 1000);
    
    return () => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [activeTimerTask, timerRunning, timerStartTime, timerElapsedTime, getTaskDurationInSeconds, getActiveTask, showExceedingAlert]);
  
  // Check if a task is exceeding its planned duration
  const checkExceedingDuration = useCallback((task: ScheduledTask) => {
    if (!activeTimerTask || !timerRunning || !timerStartTime) return false;
    
    if (task.id === activeTimerTask) {
      const now = Date.now();
      const elapsedSinceStart = now - timerStartTime;
      const totalElapsed = timerElapsedTime + elapsedSinceStart;
      const elapsedSeconds = Math.floor(totalElapsed / 1000);
      const elapsedMinutes = elapsedSeconds / 60;
      
      const taskDurationMinutes = getTaskDurationInMinutes(task);
      
      if (elapsedMinutes > taskDurationMinutes && !showExceedingAlert) {
        setShowExceedingAlert(activeTimerTask);
        return true;
      }
    }
    
    return false;
  }, [activeTimerTask, timerRunning, timerStartTime, timerElapsedTime, getTaskDurationInMinutes, showExceedingAlert]);
  
  // Timer control handlers
  const handleAddTimerStep = useCallback(async (taskId: string, description: string) => {
    await addTimerStep(taskId, description);
  }, [addTimerStep]);

  const handleStopTimer = useCallback(async (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    console.log('Stopping timer for task:', taskId);
    setShowExceedingAlert(null);

    // Calculate total time spent
    const taskDurationSeconds = getTaskDurationInSeconds(taskId);
    const now = Date.now();
    const elapsedSinceStart = timerStartTime ? now - timerStartTime : 0;
    const totalElapsedMs = timerElapsedTime + elapsedSinceStart;
    const totalElapsedSeconds = Math.floor(totalElapsedMs / 1000);
    const plannedDurationMinutes = Math.floor(taskDurationSeconds / 60);
    const actualDurationMinutes = Math.floor(totalElapsedSeconds / 60);
    const timeDifferenceMinutes = plannedDurationMinutes - actualDurationMinutes;

    // Store the final elapsed time
    setTimerState(prev => ({
      ...prev,
      finalElapsedTime: {
        ...prev.finalElapsedTime,
        [taskId]: totalElapsedSeconds
      },
      timerStatus: {
        ...prev.timerStatus,
        [taskId]: 'stopped'
      }
    }));

    // Create description based on completion time
    const description = timeDifferenceMinutes > 0
      ? `Task completed ${timeDifferenceMinutes} minutes early`
      : `Task took ${Math.abs(timeDifferenceMinutes)} extra minutes`;

    // Log time spent details
    console.log('Task Timer Summary:', {
      taskId,
      plannedDuration: `${plannedDurationMinutes} minutes`,
      actualDuration: `${actualDurationMinutes} minutes`,
      difference: `${timeDifferenceMinutes} minutes`,
      completed: timeDifferenceMinutes > 0 ? 'Early' : 'Late',
      totalElapsedSeconds
    });

    // Add timer step with completion info
    await handleAddTimerStep(taskId, description);
    
    // Stop the timer in the store
    await stopTimer();
  }, [
    getTaskDurationInSeconds, 
    timerStartTime, 
    timerElapsedTime, 
    handleAddTimerStep, 
    stopTimer
  ]);

  const handlePauseTimer = useCallback(async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!activeTimerTask) return;
    
    console.log('Pausing timer for task:', activeTimerTask);
    
    // Update timer status
    setTimerState(prev => ({
      ...prev,
      timerStatus: {
        ...prev.timerStatus,
        [activeTimerTask]: 'paused'
      }
    }));
    
    await pauseTimer();
  }, [activeTimerTask, pauseTimer]);

  const handleStartTimer = useCallback(async (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    console.log('Starting timer for task:', taskId);
    
    // If there's an active timer for a different task, pause it first
    if (activeTimerTask && activeTimerTask !== taskId && timerRunning) {
      await handlePauseTimer();
    }
    
    // Update timer status
    setTimerState(prev => ({
      ...prev,
      timerStatus: {
        ...prev.timerStatus,
        [taskId]: 'running'
      }
    }));
    
    await startTimer(taskId);
  }, [activeTimerTask, timerRunning, handlePauseTimer, startTimer]);

  // Format elapsed time for display
  const getFormattedElapsedTime = useCallback((taskId: string, defaultElapsed: number = 0): string => {
    const elapsedSeconds = timerState.taskTimers[taskId] ?? defaultElapsed;
    return formatElapsedTime(elapsedSeconds);
  }, [timerState.taskTimers]);

  // Format remaining time for display
  const getFormattedRemainingTime = useCallback((taskId: string): string => {
    const remainingSeconds = timerState.timeRemaining[taskId] ?? 0;
    return formatElapsedTime(remainingSeconds);
  }, [timerState.timeRemaining]);

  // Calculate task completion percentage
  const getTaskCompletionPercentage = useCallback((taskId: string): number => {
    const taskDurationSeconds = getTaskDurationInSeconds(taskId);
    if (taskDurationSeconds === 0) return 0;
    
    const elapsedSeconds = timerState.taskTimers[taskId] ?? 0;
    return Math.min(100, Math.round((elapsedSeconds / taskDurationSeconds) * 100));
  }, [timerState.taskTimers, getTaskDurationInSeconds]);

  // Get timer status for a task
  const getTimerStatus = useCallback((taskId: string): TimerStatus => {
    return timerState.timerStatus[taskId] ?? 'idle';
  }, [timerState.timerStatus]);

  return {
    activeTimerTask,
    timerRunning,
    showExceedingAlert,
    handleStartTimer,
    handlePauseTimer,
    handleStopTimer,
    getFormattedElapsedTime,
    getFormattedRemainingTime,
    getTaskCompletionPercentage,
    getTimerStatus,
    checkExceedingDuration
  };
}