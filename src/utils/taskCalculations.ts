import { Task, TaskCategory } from '../types';
import { differenceInMinutes } from 'date-fns';

export function safeCalculateDuration(task: Task): number {
  try {
    if (!task.startTime || !task.endTime) {
      console.warn('Task missing start or end time:', task);
      return 0;
    }
    return Math.max(0, differenceInMinutes(task.endTime, task.startTime));
  } catch (error) {
    console.error('Error calculating task duration:', error);
    return 0;
  }
}

export function isValidTask(task: Task): boolean {
  return (
    task &&
    typeof task === 'object' &&
    typeof task.id === 'string' &&
    typeof task.title === 'string' &&
    task.startTime instanceof Date &&
    task.endTime instanceof Date &&
    task.endTime >= task.startTime &&
    safeCalculateDuration(task) > 0
  );
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