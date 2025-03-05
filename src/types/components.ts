import { Task, ScheduledTask, ParkingLotTask } from '../types';

// Common interfaces
export interface BaseTaskProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string, isScheduled: boolean) => void;
}

export interface DropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  position?: 'right' | 'left';
  className?: string;
}

// TimeSlot specific interfaces
export interface TimeSlotState {
  isHovering: boolean;
  isDragging: boolean;
  isDropdownOpen: boolean;
}

export interface TimeSlotProps {
  time: string;
  showHourLabel: boolean;
  isSlotOccupied: boolean;
  isDragOver: boolean;
  tasks: ScheduledTask[];
  draggedTask: string | null;
  isHovering: string | null;
  activeDropdown: string | null;
  onTimeSlotClick: (time: string) => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, time: string) => void;
  onDrop: (e: React.DragEvent, time: string) => void;
  onTaskCompletion: (taskId: string, isCompleted: boolean) => void;
  onEditTask: (task: ScheduledTask) => void;
  onDeleteTask: (taskId: string, isScheduled: boolean) => void;
  onStartTimer: (taskId: string, e: React.MouseEvent) => void;
  onPauseTimer: (e: React.MouseEvent) => void;
  onStopTimer: (taskId: string, e: React.MouseEvent) => void;
  setActiveDropdown: (taskId: string | null) => void;
  setIsHovering: (taskId: string | null) => void;
  showExceedingAlert: string | null;
  activeTimerTask: string | null;
  timerRunning: boolean;
}

// ParkingLot specific interfaces
export interface ParkingLotState {
  isDragging: boolean;
  activeDropdown: string | null;
}

export interface ParkingLotProps {
  tasks: ParkingLotTask[];
  draggedTask: string | null;
  isHovering: string | null;
  activeDropdown: string | null;
  onAddTask: () => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent) => void;
  onEditTask: (task: ParkingLotTask) => void;
  onDeleteTask: (taskId: string, isScheduled: boolean) => void;
  setActiveDropdown: (taskId: string | null) => void;
  setIsHovering: (taskId: string | null) => void;
}

// DailyPlanner specific interfaces
export interface DailyPlannerState {
  selectedTimeSlot: string;
  selectedTask: Task | undefined;
  isHovering: string | null;
  activeDropdown: string | null;
  isLoading: boolean;
  error: Error | null;
  isParkingLotTask: boolean;
}

export interface MultiSlotTaskInfo {
  isPartOf: boolean;
  task?: ScheduledTask;
  position: 'first' | 'middle' | 'last' | 'single';
} 