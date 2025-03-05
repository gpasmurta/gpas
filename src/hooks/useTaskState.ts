import { useState, useCallback, useRef, useEffect } from 'react';
import { Task, ScheduledTask, ParkingLotTask } from '../types';

interface TaskState {
  parkingLotTasks: ParkingLotTask[];
  scheduledTasks: ScheduledTask[];
  isLoading: boolean;
}

export function useTaskState(initialTasks: { parkingLotTasks: ParkingLotTask[]; scheduledTasks: ScheduledTask[] }) {
  const [state, setState] = useState<TaskState>({
    parkingLotTasks: initialTasks.parkingLotTasks,
    scheduledTasks: initialTasks.scheduledTasks,
    isLoading: false
  });

  // Keep a ref to the latest tasks for error recovery
  const latestTasksRef = useRef(initialTasks);
  
  // Update the ref when initialTasks changes
  useEffect(() => {
    latestTasksRef.current = initialTasks;
  }, [initialTasks]);

  const updateState = useCallback((updates: Partial<TaskState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleOptimisticUpdate = useCallback(async <T extends Task>(
    updateFn: () => Promise<void>,
    optimisticUpdate: (prev: T[]) => T[]
  ) => {
    updateState({ isLoading: true });
    try {
      await updateFn();
    } catch (error) {
      console.error('Error during optimistic update:', error);
      // Revert to latest tasks on error using the ref
      updateState({
        parkingLotTasks: latestTasksRef.current.parkingLotTasks,
        scheduledTasks: latestTasksRef.current.scheduledTasks,
        isLoading: false
      });
      throw error;
    } finally {
      updateState({ isLoading: false });
    }
  }, [updateState]); // Remove initialTasks dependency

  const updateScheduledTask = useCallback(async (
    taskId: string,
    updates: Partial<ScheduledTask>,
    updateFn: () => Promise<void>
  ) => {
    // Apply optimistic update to local state immediately
    setState(prev => ({
      ...prev,
      scheduledTasks: prev.scheduledTasks.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      )
    }));
    
    // Then perform the actual update
    await handleOptimisticUpdate(
      updateFn,
      (prev) => prev.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      )
    );
  }, [handleOptimisticUpdate]);

  const updateParkingLotTask = useCallback(async (
    taskId: string,
    updates: Partial<ParkingLotTask>,
    updateFn: () => Promise<void>
  ) => {
    // Apply optimistic update to local state immediately
    setState(prev => ({
      ...prev,
      parkingLotTasks: prev.parkingLotTasks.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      )
    }));
    
    // Then perform the actual update
    await handleOptimisticUpdate(
      updateFn,
      (prev) => prev.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      )
    );
  }, [handleOptimisticUpdate]);

  const deleteTask = useCallback(async (
    taskId: string,
    isScheduled: boolean,
    deleteFn: () => Promise<void>
  ) => {
    await handleOptimisticUpdate(
      deleteFn,
      (prev) => prev.filter(task => task.id !== taskId)
    );
  }, [handleOptimisticUpdate]);

  const addTask = useCallback(async <T extends Task>(
    task: T,
    isScheduled: boolean,
    addFn: () => Promise<void>
  ) => {
    await handleOptimisticUpdate(
      addFn,
      (prev) => [...prev, task]
    );
  }, [handleOptimisticUpdate]);

  return {
    ...state,
    updateScheduledTask,
    updateParkingLotTask,
    deleteTask,
    addTask,
    updateState
  };
} 