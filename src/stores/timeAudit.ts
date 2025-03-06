import { create } from 'zustand';
import { Task } from '../types/task';

interface TimeAuditStore {
  scheduledTasks: { [date: string]: Task[] };
  parkingLotTasks: { [date: string]: Task[] };
  getTasksForDate: (date: string) => {
    scheduledTasks: Task[];
    parkingLotTasks: Task[];
  };
}

export const useTimeAuditStore = create<TimeAuditStore>((set, get) => ({
  scheduledTasks: {},
  parkingLotTasks: {},
  
  getTasksForDate: (date: string) => ({
    scheduledTasks: get().scheduledTasks[date] || [],
    parkingLotTasks: get().parkingLotTasks[date] || []
  })
})); 