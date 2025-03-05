export type TaskCategory = 'work' | 'personal' | 'health' | 'learning' | 'other';

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  value: 'low' | 'medium' | 'high';
  energy: 'gives' | 'takes' | 'neutral';
  date: string;
  startTime: Date;
  endTime: Date;
  isCompleted: boolean;
  processSummary?: string;
  platform?: string;
  timerElapsed?: number;
} 