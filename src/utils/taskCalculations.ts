import { Task, TaskCategory } from '../types';
import { differenceInMinutes, parse, isValid, format } from 'date-fns';

function convertTo24Hour(timeStr: string): string {
  try {
    // If it's already in 24-hour format, return as is
    if (timeStr.match(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
      return timeStr;
    }

    // Parse 12-hour format
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
    if (!match) {
      console.warn('Invalid time format:', timeStr);
      return timeStr;
    }

    let [_, hours, minutes, period] = match;
    let hour = parseInt(hours, 10);

    // Convert to 24-hour format
    if (period.toUpperCase() === 'PM' && hour !== 12) {
      hour += 12;
    } else if (period.toUpperCase() === 'AM' && hour === 12) {
      hour = 0;
    }

    // Pad with zeros
    return `${hour.toString().padStart(2, '0')}:${minutes}`;
  } catch (error) {
    console.error('Error converting time format:', error);
    return timeStr;
  }
}

export function safeCalculateDuration(task: Task): number {
  try {
    if (!task.startTime || !task.endTime) {
      console.warn('Task missing start or end time:', task);
      return 0;
    }

    // Convert times to 24-hour format
    const start24 = convertTo24Hour(task.startTime);
    const end24 = convertTo24Hour(task.endTime);

    // Parse the time strings into Date objects
    const startTime = parse(start24, 'HH:mm', new Date());
    const endTime = parse(end24, 'HH:mm', new Date());

    if (!isValid(startTime) || !isValid(endTime)) {
      console.warn('Invalid time format:', { 
        original: { startTime: task.startTime, endTime: task.endTime },
        converted: { startTime: start24, endTime: end24 }
      });
      return 0;
    }

    // Calculate duration in minutes
    const duration = Math.max(0, (endTime.getTime() - startTime.getTime()) / (1000 * 60));
    return duration;
  } catch (error) {
    console.error('Error calculating task duration:', error);
    return 0;
  }
}

export function isValidTask(task: Task): boolean {
  try {
    if (!task || typeof task !== 'object') return false;
    if (typeof task.id !== 'string' || !task.id) return false;
    if (typeof task.title !== 'string' || !task.title) return false;
    if (!task.startTime || !task.endTime) return false;

    // Convert and validate the time strings
    const start24 = convertTo24Hour(task.startTime);
    const end24 = convertTo24Hour(task.endTime);

    const startTime = parse(start24, 'HH:mm', new Date());
    const endTime = parse(end24, 'HH:mm', new Date());

    if (!isValid(startTime) || !isValid(endTime)) return false;
    if (endTime <= startTime) return false;

    return safeCalculateDuration(task) > 0;
  } catch (error) {
    console.error('Error validating task:', error);
    return false;
  }
}

export function calculateEnergyBalance(tasks: Task[]): number {
  return tasks.reduce((balance, task) => {
    if (!isValidTask(task)) return balance;
    
    const duration = safeCalculateDuration(task);
    switch (task.energy) {
      case 'gives':
        return balance + duration;
      case 'takes':
        return balance - duration;
      default:
        return balance;
    }
  }, 0);
}

export function calculateCategoryDistribution(tasks: Task[]): Record<TaskCategory, number> {
  const distribution: Partial<Record<TaskCategory, number>> = {};
  
  tasks.forEach(task => {
    if (!isValidTask(task) || !task.category) return;
    
    const duration = safeCalculateDuration(task);
    distribution[task.category] = (distribution[task.category] || 0) + duration;
  });
  
  return distribution as Record<TaskCategory, number>;
}

export function calculateEnergyDistribution(tasks: Task[]): { gives: number; takes: number; neutral: number } {
  return tasks.reduce((acc, task) => {
    if (!isValidTask(task)) return acc;
    
    const duration = safeCalculateDuration(task);
    switch (task.energy) {
      case 'gives':
        acc.gives += duration;
        break;
      case 'takes':
        acc.takes += duration;
        break;
      default:
        acc.neutral += duration;
    }
    return acc;
  }, { gives: 0, takes: 0, neutral: 0 });
}

export function calculateTaskSummary(tasks: Task[]) {
  const validTasks = tasks.filter(isValidTask);
  const totalTasks = validTasks.length;
  const completedTasks = validTasks.filter(t => t.isCompleted).length;
  const totalDuration = validTasks.reduce((sum, task) => sum + safeCalculateDuration(task), 0);
  
  return {
    totalTasks,
    completedTasks,
    completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    averageDuration: totalTasks > 0 ? Math.round(totalDuration / totalTasks) : 0,
    totalDuration,
    categoryDistribution: calculateCategoryDistribution(validTasks),
    energyDistribution: calculateEnergyDistribution(validTasks)
  };
} 