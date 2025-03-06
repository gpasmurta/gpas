import { useState, useCallback, useMemo } from 'react';
import { ScheduledTask, ParkingLotTask } from '../types';
import { useTimeCalculations } from './useTimeCalculations';

interface DragState {
  draggedTask: string | null;
  dragOverTimeSlot: string | null;
  dragSource: 'scheduledTasks' | 'parkingLot' | null;
}

export function useDragAndDrop(
  scheduledTasks: ScheduledTask[],
  parkingLotTasks: ParkingLotTask[],
  onTaskMove: (taskId: string, timeSlot: string, isFromParkingLot: boolean) => Promise<void>
) {
  const [dragState, setDragState] = useState<DragState>({
    draggedTask: null,
    dragOverTimeSlot: null,
    dragSource: null
  });

  const { getTaskTimeSlots } = useTimeCalculations();

  // Memoize occupied slots for better performance
  const occupiedTimeSlots = useMemo(() => {
    const slots = new Set<string>();
    
    scheduledTasks.forEach(task => {
      const taskSlots = getTaskTimeSlots(task);
      taskSlots.forEach(slot => slots.add(slot));
    });
    
    return slots;
  }, [scheduledTasks, getTaskTimeSlots]);

  const isSlotOccupied = useCallback((timeSlot: string): boolean => {
    // If we're dragging a scheduled task, we need to check if the slot is occupied by another task
    if (dragState.draggedTask && dragState.dragSource === 'scheduledTasks') {
      const draggedTask = scheduledTasks.find(task => task.id === dragState.draggedTask);
      if (draggedTask) {
        const draggedTaskSlots = getTaskTimeSlots(draggedTask);
        // If the slot is occupied by the dragged task, it's not considered occupied
        if (draggedTaskSlots.includes(timeSlot)) {
          return false;
        }
      }
    }
    
    return occupiedTimeSlots.has(timeSlot);
  }, [dragState.draggedTask, dragState.dragSource, scheduledTasks, occupiedTimeSlots, getTaskTimeSlots]);

  const handleDragStart = useCallback((e: React.DragEvent, taskId: string, source: 'scheduledTasks' | 'parkingLot') => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.setData('source', source);
    setDragState(prev => ({ 
      ...prev, 
      draggedTask: taskId,
      dragSource: source
    }));
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragState({ 
      draggedTask: null, 
      dragOverTimeSlot: null,
      dragSource: null
    });
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
    const source = e.dataTransfer.getData('source') as 'scheduledTasks' | 'parkingLot';
    
    if (isSlotOccupied(timeSlot)) {
      return;
    }
    
    const isParkingLotTask = source === 'parkingLot';
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