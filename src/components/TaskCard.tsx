import React, { useEffect } from 'react';
import { Clock, Play, Pause, Square, AlertCircle } from 'lucide-react';
import { useTaskTimer } from '../hooks/useTaskTimer';
import { ScheduledTask } from '../types';
import { cn } from '../lib/utils';

interface TaskCardProps {
  task: ScheduledTask;
  className?: string;
  onClick?: () => void;
}

export function TaskCard({ task, className, onClick }: TaskCardProps) {
  const {
    activeTimerTask,
    timerRunning,
    showExceedingAlert,
    handleStartTimer,
    handlePauseTimer,
    handleStopTimer,
    handleDismissExceedingAlert,
    getFormattedElapsedTime,
    getFormattedRemainingTime,
    getTaskCompletionPercentage,
    getTimerStatus
  } = useTaskTimer();

  const isActiveTask = activeTimerTask === task.id;
  const isExceeding = showExceedingAlert === task.id;
  const completionPercentage = getTaskCompletionPercentage(task.id);
  const timerStatus = getTimerStatus(task.id);
  const isRunning = timerStatus === 'running';
  
  // Debug logging
  useEffect(() => {
    console.log('TaskCard rendered for task:', task.id, {
      isActiveTask,
      timerRunning,
      timerStatus,
      isExceeding,
      completionPercentage
    });
  }, [task.id, isActiveTask, timerRunning, timerStatus, isExceeding, completionPercentage]);
  
  // Initialize timer state when component mounts
  useEffect(() => {
    console.log('Initializing timer state for task:', task.id);
    // If this task is the active timer task but the timer isn't running,
    // we might need to update the UI state
    if (isActiveTask && !timerRunning) {
      console.log('Task is active but timer not running - might need UI update');
    }
  }, [task.id, isActiveTask, timerRunning]);
  
  const onStartTimer = (e: React.MouseEvent) => {
    console.log('Start timer button clicked for task:', task.id);
    handleStartTimer(task.id, e);
  };
  
  const onPauseTimer = (e: React.MouseEvent) => {
    console.log('Pause timer button clicked');
    handlePauseTimer(e);
  };
  
  const onStopTimer = (e: React.MouseEvent) => {
    console.log('Stop timer button clicked for task:', task.id);
    handleStopTimer(task.id, e);
  };
  
  return (
    <div 
      className={cn(
        "border rounded-lg p-4 shadow-sm transition-all",
        isActiveTask && !isExceeding && "border-blue-300 bg-blue-50",
        isExceeding && "border-red-300 bg-red-50",
        className
      )} 
      onClick={onClick}
    >
      <div className="flex justify-between">
        <h3 className="font-medium">{task.title}</h3>
        <span className="text-sm text-gray-500">
          {task.startTime} - {task.endTime}
        </span>
      </div>
      
      <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-500">
        <span className="capitalize">{task.category}</span>
        <span>•</span>
        <span className={task.energy === 'gives' ? 'text-green-600' : 'text-red-600'}>
          {task.energy === 'gives' ? 'Energizing' : 'Draining'}
        </span>
        <span>•</span>
        <span className="capitalize">{task.value} Value</span>
      </div>
      
      {task.notes && (
        <p className="mt-2 text-sm text-gray-600">{task.notes}</p>
      )}
      
      {/* Timer Section */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className={cn(
              "w-4 h-4", 
              isActiveTask ? (isExceeding ? "text-red-500" : "text-blue-500") : "text-gray-400"
            )} />
            <span className={cn(
              "text-sm",
              isActiveTask ? (isExceeding ? "text-red-500 font-medium" : "text-blue-500") : "text-gray-500"
            )}>
              {isActiveTask ? (isExceeding ? "Time Exceeded" : "Timer Running") : "Timer"}
            </span>
          </div>
          
          {isExceeding && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleDismissExceedingAlert();
              }}
              className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
            >
              Dismiss
            </button>
          )}
        </div>
        
        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all",
              isExceeding ? "bg-red-500" : "bg-blue-500"
            )}
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            {/* Timer display */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                {isRunning 
                  ? getFormattedRemainingTime(task.id)
                  : getFormattedElapsedTime(task.id, task.timerElapsed || 0)}
              </span>
              <span className="text-xs text-gray-500">
                {isRunning ? "remaining" : "elapsed"}
              </span>
            </div>
            
            {/* Timer Controls */}
            <div className="flex items-center gap-1 ml-2">
              {isActiveTask ? (
                <>
                  {isRunning ? (
                    <button
                      onClick={onPauseTimer}
                      className="p-1.5 text-yellow-600 hover:text-yellow-700 rounded-full hover:bg-yellow-100"
                      title="Pause timer"
                    >
                      <Pause className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={onStartTimer}
                      className="p-1.5 text-green-600 hover:text-green-700 rounded-full hover:bg-green-100"
                      title="Resume timer"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={onStopTimer}
                    className="p-1.5 text-red-600 hover:text-red-700 rounded-full hover:bg-red-100"
                    title="Stop timer"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={onStartTimer}
                  className="p-1.5 text-green-600 hover:text-green-700 rounded-full hover:bg-green-100"
                  title="Start timer"
                >
                  <Play className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          
          {/* Total elapsed time */}
          {task.timerElapsed && task.timerElapsed > 0 && (
            <div className="text-xs text-gray-500">
              Total: {getFormattedElapsedTime(task.id, task.timerElapsed)}
            </div>
          )}
        </div>
        
        {/* Alert for exceeding time */}
        {isExceeding && (
          <div className="mt-2 text-xs text-red-600 flex items-center gap-1 bg-red-50 p-2 rounded">
            <AlertCircle className="w-3 h-3" />
            This task has exceeded its scheduled time.
          </div>
        )}
      </div>
    </div>
  );
} 