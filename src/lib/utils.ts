import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { addMinutes, format, parse, setHours, setMinutes, isValid } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateTimeBlocks(startTime: string = '06:00', endTime: string = '22:00'): string[] {
  const times: string[] = [];
  try {
    const start = parse(startTime, 'HH:mm', new Date());
    const end = parse(endTime, 'HH:mm', new Date());
    
    if (!isValid(start) || !isValid(end)) {
      throw new Error('Invalid time format');
    }
    
    let current = start;
    while (current <= end) {
      times.push(format(current, 'HH:mm'));
      current = addMinutes(current, 15);
    }
  } catch (error) {
    console.error('Error generating time blocks:', error);
    // Return some default time blocks if parsing fails
    return ['08:00', '08:15', '08:30', '08:45', '09:00'];
  }
  
  return times;
}

export function formatTime(time: string): string {
  try {
    const parsedTime = parse(time, 'HH:mm', new Date());
    
    if (!isValid(parsedTime)) {
      throw new Error('Invalid time format');
    }
    
    return format(parsedTime, 'h:mm a');
  } catch (error) {
    console.error('Error formatting time:', error);
    return time;
  }
}

/**
 * Format elapsed time in seconds to HH:MM:SS format
 */
export function formatElapsedTime(seconds: number): string {
  try {
    if (seconds < 0 || !Number.isFinite(seconds) || Number.isNaN(seconds)) {
      throw new Error('Invalid seconds value');
    }
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      remainingSeconds.toString().padStart(2, '0')
    ].join(':');
  } catch (error) {
    console.error('Error formatting elapsed time:', error);
    return '00:00:00';
  }
}

/**
 * Calculate duration between two time strings in minutes
 */
export function calculateDurationInMinutes(startTime: string, endTime: string): number {
  try {
    const start = parse(startTime, 'HH:mm', new Date());
    const end = parse(endTime, 'HH:mm', new Date());
    
    if (!isValid(start) || !isValid(end)) {
      throw new Error('Invalid time format');
    }
    
    const diffMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    return Math.max(1, diffMinutes); // Minimum 1 minute
  } catch (error) {
    console.error('Error calculating duration:', error);
    return 15; // Default to 15 minutes if calculation fails
  }
}

/**
 * Calculate end time based on start time and duration in minutes
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  try {
    if (!startTime) {
      return '08:15'; // Default end time if no start time
    }
    
    const start = parse(startTime, 'HH:mm', new Date());
    
    if (!isValid(start)) {
      throw new Error('Invalid start time');
    }
    
    const end = addMinutes(start, durationMinutes);
    
    if (!isValid(end)) {
      throw new Error('Invalid end time calculation');
    }
    
    return format(end, 'HH:mm');
  } catch (error) {
    console.error('Error calculating end time:', error);
    return startTime ? startTime : '08:15';
  }
}

/**
 * Format time with validation
 */
export function formatTimeWithValidation(timeStr: string, formatStr: string): string {
  try {
    if (!timeStr) {
      return 'Select time';
    }
    
    const parsedTime = parse(timeStr, 'HH:mm', new Date());
    if (isValid(parsedTime)) {
      return format(parsedTime, formatStr);
    }
    return 'Invalid time';
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'Invalid time';
  }
}