export type TaskCategory = 'work' | 'personal' | 'health' | 'learning';

export interface BaseTask {
  id: string;
  title: string;
  description?: string;
  date: string;
  isCompleted: boolean;
  energy?: 'gives' | 'takes';
  duration?: number;
  scheduled?: boolean;
  parkingLot?: boolean;
  value?: number;
  category: TaskCategory;
  startTime?: string;
  endTime?: string;
  timerElapsed?: number;
}

export interface ScheduledTask extends BaseTask {
  timeSlot: string;
  scheduled: true;
  parkingLot: false;
}

export interface ParkingLotTask extends BaseTask {
  order: number;
  scheduled: false;
  parkingLot: true;
}

export type Task = ScheduledTask | ParkingLotTask; 