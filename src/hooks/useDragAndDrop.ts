import { useState, useCallback } from 'react';
import { ScheduledTask, ParkingLotTask } from '../types';
import { useTimeCalculations } from './useTimeCalculations';

interface DragState {
  draggedTask: string | null;
  dragOverTimeSlot: string | null;
}

export function useDragAndDrop(
  scheduledTasks: ScheduledTask[],
  parkingLotTasks: ParkingLotTask[],
  onTaskMove: (taskId: string, timeSlot: string, isFromParkingLot: boolean) => Promise<void>
) {
  const [dragState, setDragState] = useState<DragState>({
    draggedTask: null,
    dragOverTimeSlot: null
  });

  const { getTaskTimeSlots, calculateEndTime, getDurationFromTask } = useTimeCalculations();

  const isSlotOccupied = useCallback((timeSlot: string): boolean => {
    return scheduledTasks.some(task => {
      const taskSlots = getTaskTimeSlots(task);
      return taskSlots.includes(timeSlot);
    });
  }, [scheduledTasks, getTaskTimeSlots]);

  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    setDragState(prev => ({ ...prev, draggedTask: taskId }));
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragState({ draggedTask: null, dragOverTimeSlot: null });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, timeSlot: string) => {
    e.preventDefault();
    
    if (!isSlotOccupied(timeSlot)) {
      setDragState(prev => ({ ...prev, dragOverTimeSlot: timeSlot }));
      e.dataTransfer.dropEffect = 'move';
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  }, [isSlotOccupied]);

  const handleDrop = useCallback(async (e: React.DragEvent, timeSlot: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    
    if (isSlotOccupied(timeSlot)) {
      return;
    }
    
    const isParkingLotTask = parkingLotTasks.some(task => task.id === taskId);
    const task = isParkingLotTask 
      ? parkingLotTasks.find(task => task.id === taskId)
      : scheduledTasks.find(task => task.id === taskId);
    
    if (!task) {
      console.error('Task not found:', taskId);
      return;
    }

    try {
      await onTaskMove(taskId, timeSlot, isParkingLotTask);
    } catch (error) {
      console.error('Error moving task:', error);
    } finally {
      handleDragEnd();
    }
  }, [isSlotOccupied, parkingLotTasks, scheduledTasks, onTaskMove, handleDragEnd]);

  return {
    ...dragState,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
    isSlotOccupied
  };
} 