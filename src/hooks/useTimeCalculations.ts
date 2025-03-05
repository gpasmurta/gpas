import { parse, isValid, addMinutes, format } from 'date-fns';
import { ScheduledTask } from '../types';

export function useTimeCalculations() {
  const calculateTaskSpan = (task: ScheduledTask): number => {
    try {
      const startTime = parse(task.startTime, 'HH:mm', new Date());
      const endTime = parse(task.endTime, 'HH:mm', new Date());
      
      if (!isValid(startTime) || !isValid(endTime)) {
        return 1;
      }
      
      const diffMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
      return Math.max(1, Math.ceil(diffMinutes / 15)); // Round up to nearest 15-min block
    } catch (error) {
      console.error('Error calculating task span:', error);
      return 1;
    }
  };

  const getTaskTimeSlots = (task: ScheduledTask): string[] => {
    const slots: string[] = [];
    try {
      const span = calculateTaskSpan(task);
      if (span <= 1) {
        return [task.timeSlot];
      }
      
      const startTime = parse(task.timeSlot, 'HH:mm', new Date());
      if (!isValid(startTime)) {
        return [task.timeSlot];
      }
      
      for (let i = 0; i < span; i++) {
        const slotTime = addMinutes(startTime, i * 15);
        slots.push(format(slotTime, 'HH:mm'));
      }
    } catch (error) {
      console.error('Error getting task time slots:', error);
      return [task.timeSlot];
    }
    return slots;
  };

  const calculateEndTime = (startTime: string, durationMinutes: number = 15): string => {
    try {
      const parsedStartTime = parse(startTime, 'HH:mm', new Date());
      
      if (!isValid(parsedStartTime)) {
        throw new Error('Invalid start time');
      }
      
      const parsedEndTime = addMinutes(parsedStartTime, durationMinutes);
      return format(parsedEndTime, 'HH:mm');
    } catch (error) {
      console.error('Error calculating end time:', error);
      // Fallback to 15 minutes later
      try {
        const parsedStartTime = parse(startTime, 'HH:mm', new Date());
        const parsedEndTime = addMinutes(parsedStartTime, 15);
        return format(parsedEndTime, 'HH:mm');
      } catch (fallbackError) {
        console.error('Fallback error calculating end time:', fallbackError);
        return startTime; // Last resort fallback
      }
    }
  };

  const getDurationFromTask = (task: ScheduledTask): number => {
    try {
      if (task.startTime && task.endTime) {
        const originalStart = parse(task.startTime, 'HH:mm', new Date());
        const originalEnd = parse(task.endTime, 'HH:mm', new Date());
        
        if (isValid(originalStart) && isValid(originalEnd)) {
          return (originalEnd.getTime() - originalStart.getTime()) / (1000 * 60);
        }
      }
      return 15; // Default to 15 minutes
    } catch (error) {
      console.error('Error getting duration from task:', error);
      return 15;
    }
  };

  return {
    calculateTaskSpan,
    getTaskTimeSlots,
    calculateEndTime,
    getDurationFromTask
  };
} 