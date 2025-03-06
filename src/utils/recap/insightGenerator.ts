import { Task, TaskCategory } from '../../types';
import { TaskMetrics, ActivityPeriod, RecapInsights } from '../../types/recap';

const QUOTES = [
  "The only way to do great work is to love what you do.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  "The future depends on what you do today.",
  "Don't watch the clock; do what it does. Keep going.",
  "Your time is limited, don't waste it living someone else's life.",
];

export const generateInsights = (
  tasks: Task[],
  metrics: TaskMetrics,
  activityPeriods: ActivityPeriod[]
): RecapInsights => {
  // Get a random quote
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

  // Generate day summary
  const daySummary = generateDaySummary(metrics);

  // Analyze energy patterns
  const energyPatterns = analyzeEnergyPatterns(tasks, activityPeriods);

  // Analyze task impact
  const taskImpact = analyzeTaskImpact(tasks, metrics);

  // Generate coach insights
  const coachInsights = generateCoachInsights(tasks, metrics, activityPeriods);

  // Generate power questions
  const powerQuestions = generatePowerQuestions(metrics);

  // Generate tomorrow's focus
  const tomorrowFocus = generateTomorrowFocus(tasks, metrics);

  return {
    quote,
    daySummary,
    energyPatterns,
    taskImpact,
    coachInsights,
    powerQuestions,
    tomorrowFocus,
  };
};

const generateDaySummary = (metrics: TaskMetrics): string => {
  const { tasksCreated, tasksCompleted, timeTracked } = metrics;
  const completionRate = tasksCreated > 0 ? (tasksCompleted / tasksCreated) * 100 : 0;
  const hours = Math.floor(timeTracked / 3600);
  const minutes = Math.floor((timeTracked % 3600) / 60);

  return `You created ${tasksCreated} tasks and completed ${tasksCompleted} (${completionRate.toFixed(0)}% completion rate). You tracked ${hours}h ${minutes}m of focused work time.`;
};

const analyzeEnergyPatterns = (tasks: Task[], periods: ActivityPeriod[]): string[] => {
  const patterns: string[] = [];

  // Find peak energy periods
  const energyGivingTasks = tasks.filter(task => task.energy === 'gives');
  if (energyGivingTasks.length > 0) {
    patterns.push('Your energy peaks during: ' + 
      energyGivingTasks.map(t => t.startTime.slice(0, 5)).join(', '));
  }

  // Identify longest focus periods
  const sortedPeriods = [...periods].sort((a, b) => {
    const aDuration = getMinutesBetween(a.startTime, a.endTime);
    const bDuration = getMinutesBetween(b.startTime, b.endTime);
    return bDuration - aDuration;
  });

  if (sortedPeriods.length > 0) {
    const longest = sortedPeriods[0];
    patterns.push(`Longest focus period: ${longest.activityType} (${longest.startTime.slice(0, 5)} - ${longest.endTime.slice(0, 5)})`);
  }

  return patterns;
};

const analyzeTaskImpact = (tasks: Task[], metrics: TaskMetrics): string[] => {
  const impact: string[] = [];

  // Analyze task distribution
  const { taskTypes } = metrics;
  const totalTasks = tasks.length;
  
  if (totalTasks > 0) {
    // Find most common task type
    const mostCommonType = Object.entries(taskTypes)
      .sort(([, a], [, b]) => b - a)[0];
    
    impact.push(`Focus area: ${mostCommonType[0]} tasks (${Math.round((mostCommonType[1] / totalTasks) * 100)}% of total)`);
  }

  // Analyze completion success
  const completedHighValue = tasks.filter(t => t.value === 'high' && t.isCompleted).length;
  const totalHighValue = tasks.filter(t => t.value === 'high').length;
  
  if (totalHighValue > 0) {
    impact.push(`High-value task completion: ${completedHighValue}/${totalHighValue}`);
  }

  return impact;
};

const generateCoachInsights = (
  tasks: Task[],
  metrics: TaskMetrics,
  periods: ActivityPeriod[]
): string[] => {
  const insights: string[] = [];

  // Analyze work patterns
  if (periods.length > 0) {
    const avgPeriodLength = periods.reduce((acc, p) => 
      acc + getMinutesBetween(p.startTime, p.endTime), 0) / periods.length;
    
    if (avgPeriodLength < 30) {
      insights.push("Consider longer focused work periods to increase productivity");
    } else {
      insights.push("Good job maintaining focused work periods!");
    }
  }

  // Analyze task completion
  const completionRate = metrics.tasksCreated > 0 
    ? (metrics.tasksCompleted / metrics.tasksCreated) * 100 
    : 0;

  if (completionRate < 50) {
    insights.push("Try breaking down tasks into smaller, more manageable pieces");
  } else if (completionRate > 80) {
    insights.push("Excellent task completion rate! Consider taking on more challenging tasks");
  }

  return insights;
};

const generatePowerQuestions = (metrics: TaskMetrics): string[] => {
  const questions = [
    "What's the ONE task that would make tomorrow a success?",
    "How can you create more energy-giving moments in your day?",
    "What tasks could you delegate or eliminate?",
  ];

  if (metrics.tasksCompleted === 0) {
    questions.push("What's blocking you from completing tasks?");
  }

  return questions;
};

const generateTomorrowFocus = (tasks: Task[], metrics: TaskMetrics): string[] => {
  const focus: string[] = [];

  // Identify incomplete high-value tasks
  const incompleteHighValue = tasks
    .filter(t => t.value === 'high' && !t.isCompleted)
    .map(t => t.title);

  if (incompleteHighValue.length > 0) {
    focus.push("Complete high-value tasks: " + incompleteHighValue.join(", "));
  }

  // Suggest focus areas based on task distribution
  const { taskTypes } = metrics;
  const neglectedAreas = Object.entries(taskTypes)
    .filter(([, count]) => count === 0)
    .map(([type]) => type);

  if (neglectedAreas.length > 0) {
    focus.push(`Consider allocating time for: ${neglectedAreas.join(", ")}`);
  }

  return focus;
};

const getMinutesBetween = (start: string, end: string): number => {
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  return (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
}; 