import React, { useEffect, useState } from 'react';
import { cn } from '../lib/utils';
import { formatTime, formatElapsedTime } from '../lib/utils';
import { ScheduledTask } from '../types';
import { MoreVertical, Pencil, Trash2, Play, Pause, Square, AlertCircle, Clock } from 'lucide-react';
import { useTimeAuditStore } from '../store/timeAuditStore';
import { TimerStatus } from '../hooks/useTaskTimer';

interface TimeSlotProps {
  time: string;
  showHourLabel: boolean;
  isSlotOccupied: boolean;
  isDragOver: boolean;
  tasks: ScheduledTask[];
  draggedTask: string | null;
  isHovering: string | null;
  activeDropdown: string | null;
  onTimeSlotClick: (time: string) => void;
  onDragStart: (e: React.DragEvent, taskId: string, source: 'scheduledTasks' | 'parkingLot') => void;
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
  getFormattedElapsedTime?: (taskId: string, defaultElapsed?: number) => string;
  getFormattedRemainingTime?: (taskId: string) => string;
  getTaskCompletionPercentage?: (taskId: string) => number;
  getTimerStatus?: (taskId: string) => TimerStatus;
}

export function TimeSlot({
  time,
  showHourLabel,
  isSlotOccupied,
  isDragOver,
  tasks,
  draggedTask,
  isHovering,
  activeDropdown,
  onTimeSlotClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onTaskCompletion,
  onEditTask,
  onDeleteTask,
  onStartTimer,
  onPauseTimer,
  onStopTimer,
  setActiveDropdown,
  setIsHovering,
  showExceedingAlert,
  activeTimerTask,
  timerRunning,
  getFormattedElapsedTime,
  getFormattedRemainingTime,
  getTaskCompletionPercentage,
  getTimerStatus
}: TimeSlotProps) {
  const formattedTime = formatTime(time);
  const { getTaskDurationInMinutes } = useTimeAuditStore();
  const [elapsedTimes, setElapsedTimes] = useState<Record<string, string>>({});
  const [remainingTimes, setRemainingTimes] = useState<Record<string, string>>({});
  const [completionPercentages, setCompletionPercentages] = useState<Record<string, number>>({});
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audio] = useState(() => typeof Audio !== 'undefined' ? new Audio('/sounds/timer-end.mp3') : null);
  
  // Load audio
  useEffect(() => {
    if (audio) {
      audio.addEventListener('canplaythrough', () => setAudioLoaded(true));
      return () => {
        audio.removeEventListener('canplaythrough', () => setAudioLoaded(true));
      };
    }
  }, [audio]);
  
  // Update timer display using the provided timer functions
  useEffect(() => {
    if (!activeTimerTask || !timerRunning) return;
    
    const interval = setInterval(() => {
      tasks.forEach(task => {
        if (task.id === activeTimerTask) {
          // Use the provided functions from TimeBlocking component
          if (getFormattedElapsedTime) {
            const elapsed = getFormattedElapsedTime(task.id);
            setElapsedTimes(prev => ({
              ...prev,
              [task.id]: elapsed
            }));
          }
          
          if (getFormattedRemainingTime) {
            const remaining = getFormattedRemainingTime(task.id);
            setRemainingTimes(prev => ({
              ...prev,
              [task.id]: remaining
            }));
            
            // Play sound when timer reaches 00:00:00
            if (audioLoaded && audio && remaining === '00:00:00') {
              audio.play().catch(err => console.error('Failed to play sound:', err));
            }
          }
          
          if (getTaskCompletionPercentage) {
            const percentage = getTaskCompletionPercentage(task.id);
            setCompletionPercentages(prev => ({
              ...prev,
              [task.id]: percentage
            }));
          }
        }
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [
    activeTimerTask, 
    timerRunning, 
    tasks, 
    getFormattedElapsedTime, 
    getFormattedRemainingTime, 
    getTaskCompletionPercentage,
    audio,
    audioLoaded
  ]);

  return (
    <div className="flex border-b border-gray-100">
      {/* Hour label */}
      {showHourLabel && (
        <div className="w-12 sm:w-16 flex items-center justify-center">
          <span className="text-xs sm:text-sm font-medium text-gray-500">
            {formattedTime.split(':')[0]} {formattedTime.includes('PM') ? 'PM' : 'AM'}
          </span>
        </div>
      )}
      
      {/* Time slot */}
      <div 
        className={cn(
          "flex-1 h-[70px] max-h-[70px] p-2 transition-colors relative",
          !showHourLabel && "ml-12 sm:ml-16",
          isDragOver && !isSlotOccupied && "bg-blue-50",
          isSlotOccupied && "bg-gray-50"
        )}
        onClick={() => onTimeSlotClick(time)}
        onDragOver={(e) => onDragOver(e, time)}
        onDrop={(e) => onDrop(e, time)}
      >
        {/* Task content */}
        {tasks.map(task => {
          if (task.timeSlot === time) {
            const isActive = activeTimerTask === task.id;
            
            return (
              <div
                key={task.id}
                className={cn(
                  "absolute inset-1 rounded-lg border-2 p-2 cursor-move overflow-hidden flex flex-col justify-between",
                  draggedTask === task.id && "opacity-50",
                  task.energy === 'gives' ? "bg-green-50" : "bg-red-50",
                  task.isCompleted ? "border-solid" : "border-dashed",
                  task.isCompleted ? (task.energy === 'gives' ? "border-green-200" : "border-red-200") : "",
                  isActive && "border-blue-300"
                )}
                draggable
                onDragStart={(e) => onDragStart(e, task.id, 'scheduledTasks')}
                onDragEnd={onDragEnd}
                onMouseEnter={() => setIsHovering(task.id)}
                onMouseLeave={() => setIsHovering(null)}
                onClick={(e) => {
                  if (e.currentTarget === e.target) {
                    onTimeSlotClick(time);
                  }
                }}
              >
                {/* Task header with title and actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={task.isCompleted}
                      onChange={(e) => {
                        e.stopPropagation();
                        onTaskCompletion(task.id, e.target.checked);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <h3 className={cn(
                      "text-xs font-medium truncate",
                      task.isCompleted && "line-through text-gray-500"
                    )}>
                      {task.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {isHovering === task.id && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditTask(task);
                          }}
                          className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                          title="Edit task"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTask(task.id, true);
                          }}
                          className="p-1 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-50"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Footer with category, timer status and controls */}
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-500 capitalize truncate">{task.category}</span>
                    
                    {/* Timer status indicator with timer display */}
                    {(isActive || (getTimerStatus && getTimerStatus(task.id) === 'stopped') || (task.timerElapsed ?? 0) > 0) && (
                      <div className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium",
                        getTimerStatus && getTimerStatus(task.id) === 'running' ? "bg-blue-100 text-blue-700" : 
                        getTimerStatus && getTimerStatus(task.id) === 'stopped' ? "bg-gray-100 text-gray-700" :
                        (task.timerElapsed ?? 0) > 0 ? "bg-gray-100 text-gray-700" :
                        "bg-yellow-100 text-yellow-700"
                      )}>
                        <Clock className="w-3 h-3" />
                        <span>
                          {getTimerStatus && getTimerStatus(task.id) === 'running' ? "Running" : 
                           getTimerStatus && getTimerStatus(task.id) === 'stopped' ? "Stopped" :
                           (task.timerElapsed ?? 0) > 0 ? "Recorded" :
                           "Paused"}
                        </span>
                        {getFormattedElapsedTime && (
                          <span className="ml-1 font-mono">
                            {getFormattedElapsedTime(task.id)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Timer controls */}
                  <div className="flex items-center gap-1">
                    {!isActive && (
                      <button
                        onClick={(e) => onStartTimer(task.id, e)}
                        className="p-1 text-gray-500 hover:text-blue-600 rounded-full hover:bg-blue-50"
                        title="Start timer"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isActive && timerRunning && (
                      <>
                        <button
                          onClick={onPauseTimer}
                          className="p-1 text-gray-500 hover:text-yellow-600 rounded-full hover:bg-yellow-50"
                          title="Pause timer"
                        >
                          <Pause className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => onStopTimer(task.id, e)}
                          className="p-1 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-50"
                          title="Stop timer"
                        >
                          <Square className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    {isActive && !timerRunning && (
                      <>
                        <button
                          onClick={(e) => onStartTimer(task.id, e)}
                          className="p-1 text-gray-500 hover:text-blue-600 rounded-full hover:bg-blue-50"
                          title="Resume timer"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => onStopTimer(task.id, e)}
                          className="p-1 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-50"
                          title="Stop timer"
                        >
                          <Square className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
} 