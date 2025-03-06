import { Task, TaskCategory } from '../../types';
import { TaskMetrics, ActivityPeriod } from '../../types/recap';

export const analyzeTaskMetrics = (tasks: Task[]): TaskMetrics => {
  const taskTypes: Record<TaskCategory, number> = {
    admin: 0,
    creative: 0,
    strategic: 0,
    personal: 0,
    meetings: 0,
    work: 0,
    health: 0,
    finance: 0,
    education: 0,
    social: 0,
    errands: 0,
    home: 0,
  };

  let timeTracked = 0;
  let tasksCompleted = 0;

  tasks.forEach((task) => {
    // Count task types
    taskTypes[task.category]++;

    // Sum up tracked time
    if (task.timerElapsed) {
      timeTracked += task.timerElapsed;
    }

    // Count completed tasks
    if (task.isCompleted) {
      tasksCompleted++;
    }
  });

  return {
    tasksCreated: tasks.length,
    tasksCompleted,
    timeTracked,
    taskTypes,
  };
};

export const analyzeActivityPeriods = (tasks: Task[]): ActivityPeriod[] => {
  const periods: ActivityPeriod[] = [];
  
  // Sort tasks by start time
  const sortedTasks = [...tasks].sort((a, b) => 
    a.startTime.localeCompare(b.startTime)
  );

  // Group consecutive tasks of the same category
  let currentPeriod: ActivityPeriod | null = null;

  sortedTasks.forEach((task) => {
    if (!currentPeriod) {
      currentPeriod = {
        startTime: task.startTime,
        endTime: task.endTime,
        activityType: task.category,
      };
    } else if (
      currentPeriod.activityType === task.category &&
      task.startTime <= currentPeriod.endTime
    ) {
      // Extend current period
      currentPeriod.endTime = task.endTime;
    } else {
      // Start new period
      periods.push(currentPeriod);
      currentPeriod = {
        startTime: task.startTime,
        endTime: task.endTime,
        activityType: task.category,
      };
    }
  });

  // Add the last period
  if (currentPeriod) {
    periods.push(currentPeriod);
  }

  return periods;
}; 