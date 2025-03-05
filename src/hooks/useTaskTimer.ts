import { useState, useEffect, useRef, useCallback } from 'react';
import { useTimeAuditStore } from '../store/timeAuditStore';
import { Task, ScheduledTask } from '../types';
import { formatElapsedTime } from '../lib/utils';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'stopped';

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
  
  const [taskTimers, setTaskTimers] = useState<Record<string, number>>({});
  const [timeRemaining, setTimeRemaining] = useState<Record<string, number>>({});
  const [showExceedingAlert, setShowExceedingAlert] = useState<string | null>(null);
  const [timerStatus, setTimerStatus] = useState<Record<string, TimerStatus>>({});
  const [finalElapsedTime, setFinalElapsedTime] = useState<Record<string, number>>({});
  const timerIntervalRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  
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
      setTaskTimers(prev => ({
        ...prev,
        [activeTimerTask]: elapsedSeconds
      }));
      
      setTimeRemaining(prev => ({
        ...prev,
        [activeTimerTask]: remainingSeconds
      }));
    }

    // Initialize timer state for all tasks from persisted data
    [...scheduledTasks, ...parkingLotTasks].forEach(task => {
      if (task.timerElapsed && typeof task.timerElapsed === 'number') {
        setTaskTimers(prev => ({
          ...prev,
          [task.id]: task.timerElapsed as number
        }));

        const taskDurationSeconds = getTaskDurationInSeconds(task.id);
        const remainingSeconds = Math.max(0, taskDurationSeconds - task.timerElapsed);
        setTimeRemaining(prev => ({
          ...prev,
          [task.id]: remainingSeconds
        }));

        // Set final elapsed time for completed tasks
        if (!activeTimerTask || activeTimerTask !== task.id) {
          setFinalElapsedTime(prev => {
            const newState = { ...prev };
            if (typeof task.timerElapsed === 'number') {
              newState[task.id] = task.timerElapsed;
            }
            return newState;
          });
        }
      }
    });
  }, [activeTimerTask, timerRunning, timerStartTime, timerElapsedTime, getTaskDurationInSeconds, scheduledTasks, parkingLotTasks]);
  
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
      
      setTaskTimers(prev => {
        const current = prev[activeTimerTask];
        if (current === elapsedSeconds) return prev;
        return { ...prev, [activeTimerTask]: elapsedSeconds };
      });
      
      setTimeRemaining(prev => {
        const current = prev[activeTimerTask];
        if (current === remainingSeconds) return prev;
        return { ...prev, [activeTimerTask]: remainingSeconds };
      });
      
      if (remainingSeconds === 0 && !showExceedingAlert) {
        setShowExceedingAlert(activeTimerTask);
        
        try {
          const audio = new Audio('/sounds/timer-end.mp3');
          audio.play().catch(err => console.error('Failed to play sound:', err));
          
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

    // Store the final elapsed time both in local state and task state
    setFinalElapsedTime(prev => ({
      ...prev,
      [taskId]: totalElapsedSeconds
    }));

    // Update timer status to stopped
    setTimerStatus(prev => ({
      ...prev,
      [taskId]: 'stopped'
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
    stopTimer();

    // Clear the task timers for this task
    setTaskTimers(prev => {
      const newTimers = { ...prev };
      delete newTimers[taskId];
      return newTimers;
    });
  }, [getTaskDurationInSeconds, timerStartTime, timerElapsedTime, handleAddTimerStep, stopTimer]);
  
  const handleStartTimer = useCallback((taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    console.log('Starting timer for task:', taskId);
    
    // If there's already an active timer for a different task, stop it first
    if (activeTimerTask && activeTimerTask !== taskId) {
      handleStopTimer(activeTimerTask);
      return; // Exit early to let the stop timer complete before starting new timer
    }
    
    // If this task is already running, don't start it again
    if (activeTimerTask === taskId && timerRunning) {
      console.log('Task is already running:', taskId);
      return;
    }
    
    setShowExceedingAlert(null);
    
    // Initialize remaining time for this task
    const taskDurationSeconds = getTaskDurationInSeconds(taskId);
    console.log('Setting initial remaining time:', taskDurationSeconds);
    setTimeRemaining(prev => ({
      ...prev,
      [taskId]: taskDurationSeconds
    }));
    
    // Start the timer in the store
    startTimer(taskId);
  }, [activeTimerTask, timerRunning, getTaskDurationInSeconds, startTimer, handleStopTimer]);
  
  const handlePauseTimer = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    console.log('Pausing timer');
    
    if (activeTimerTask) {
      setTimerStatus(prev => ({
        ...prev,
        [activeTimerTask]: 'paused'
      }));
    }
    
    pauseTimer();
  }, [pauseTimer, activeTimerTask]);
  
  const handleDismissExceedingAlert = useCallback(() => {
    setShowExceedingAlert(null);
  }, []);
  
  // Get timer status for a task
  const getTimerStatus = useCallback((taskId: string): TimerStatus => {
    // Only return 'running' if this is the active timer and it's actually running
    if (timerRunning && activeTimerTask === taskId) {
      return 'running';
    }
    return timerStatus[taskId] || 'idle';
  }, [timerStatus, activeTimerTask, timerRunning]);
  
  // Get formatted elapsed time for a task
  const getFormattedElapsedTime = useCallback((taskId: string, defaultElapsed: number = 0) => {
    const status = getTimerStatus(taskId);
    
    // For stopped tasks, get the elapsed time from the task itself
    if (status === 'stopped') {
      const task = scheduledTasks.find(t => t.id === taskId) || 
                  parkingLotTasks.find(t => t.id === taskId);
      if (task && task.timerElapsed) {
        return formatElapsedTime(task.timerElapsed);
      }
    }
    
    // For running or paused tasks, use the current timer state
    const elapsed = taskTimers[taskId] || defaultElapsed;
    return formatElapsedTime(elapsed);
  }, [taskTimers, finalElapsedTime, getTimerStatus, scheduledTasks, parkingLotTasks]);
  
  // Get formatted remaining time for a task
  const getFormattedRemainingTime = useCallback((taskId: string) => {
    const remaining = timeRemaining[taskId] || getTaskDurationInSeconds(taskId);
    return formatElapsedTime(remaining);
  }, [timeRemaining, getTaskDurationInSeconds]);
  
  // Get task completion percentage
  const getTaskCompletionPercentage = useCallback((taskId: string) => {
    const taskDurationSeconds = getTaskDurationInSeconds(taskId);
    if (taskDurationSeconds === 0) return 0;
    
    const elapsed = taskTimers[taskId] || 0;
    return Math.min(100, Math.round((elapsed / taskDurationSeconds) * 100));
  }, [taskTimers, getTaskDurationInSeconds]);
  
  return {
    activeTimerTask,
    timerRunning,
    taskTimers,
    timeRemaining,
    showExceedingAlert,
    handleStartTimer,
    handlePauseTimer,
    handleStopTimer,
    handleAddTimerStep,
    handleDismissExceedingAlert,
    checkExceedingDuration,
    getFormattedElapsedTime,
    getFormattedRemainingTime,
    getTaskCompletionPercentage,
    getTimerStatus
  };
}