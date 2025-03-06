import { TaskCategory } from '../types';

export type CoachingStyle = 'motivational' | 'analytical' | 'supportive' | 'directive';

export interface TaskMetrics {
  tasksCreated: number;
  tasksCompleted: number;
  timeTracked: number; // in seconds
  taskTypes: Record<TaskCategory, number>;
}

export interface ActivityPeriod {
  startTime: string; // 24-hour format "HH:mm"
  endTime: string; // 24-hour format "HH:mm"
  activityType: TaskCategory;
}

export interface RecapInsights {
  quote: string;
  daySummary: string;
  energyPatterns: string[];
  taskImpact: string[];
  coachInsights: string[];
  powerQuestions: string[];
  tomorrowFocus: string[];
}

export interface RecapPreferences {
  coachingStyle: CoachingStyle;
  autoGenerate: boolean;
  visibleSections: {
    quote: boolean;
    daySummary: boolean;
    energyPatterns: boolean;
    taskImpact: boolean;
    coachInsights: boolean;
    powerQuestions: boolean;
    tomorrowFocus: boolean;
  };
}

export interface DailyRecap {
  id: string;
  date: string;
  insights: {
    quote: string;
    daySummary: string;
    energyPatterns: string[];
    taskImpact: string[];
    coachInsights: string[];
    powerQuestions: string[];
    tomorrowFocus: string[];
  };
  stats: {
    productivityScore: number;
    completedTasks: number;
    totalTasks: number;
    timeDistribution: {
      work: number;
      personal: number;
      health: number;
      learning: number;
    };
  };
  userPreferences: {
    coachingStyle: CoachingStyle;
    autoGenerate: boolean;
    visibleSections: {
      quote: boolean;
      daySummary: boolean;
      energyPatterns: boolean;
      taskImpact: boolean;
      coachInsights: boolean;
      powerQuestions: boolean;
      tomorrowFocus: boolean;
    };
  };
} 