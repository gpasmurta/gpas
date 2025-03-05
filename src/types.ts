export type TaskValue = 'high' | 'medium' | 'low';
export type EnergyLevel = 'gives' | 'takes';
export type TaskCategory = 'admin' | 'creative' | 'strategic' | 'personal' | 'meetings' | 'work' | 'health' | 'finance' | 'education' | 'social' | 'errands' | 'home';

export interface Task {
  id: string;
  title: string;
  value: TaskValue;
  energy: EnergyLevel;
  category: TaskCategory;
  notes?: string;
  startTime: string;
  endTime: string;
  date: string; // ISO date string (YYYY-MM-DD)
  processDescription?: string; // Raw transcript from voice input
  processSummary?: string; // Cleaned and summarized process description
  timerElapsed?: number; // Elapsed time in seconds
  timerSteps?: TimerStep[]; // Steps recorded during the timer
  scheduled?: boolean; // Whether the task is scheduled in a time block
  parkingLot?: boolean; // Whether the task is in the parking lot
  isCompleted?: boolean; // Whether the task is completed
}

export interface TimerStep {
  description: string;
  elapsedTime: number; // Time in seconds when this step was recorded
}

export interface TimeBlock {
  time: string;
  task?: Task;
}

export interface ScheduledTask extends Task {
  timeSlot: string; // The time slot this task is scheduled for (e.g., "08:00")
}

export interface ParkingLotTask extends Task {
  order: number; // Order in the parking lot
}