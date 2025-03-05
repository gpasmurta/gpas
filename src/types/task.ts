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
  category?: string;
  startTime?: string;
  endTime?: string;
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