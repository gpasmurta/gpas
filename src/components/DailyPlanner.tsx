import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTimeAuditStore } from '../store/timeAuditStore';
import { Task, ParkingLotTask, ScheduledTask } from '../types';
import { Plus, AlertCircle } from 'lucide-react';
import { cn, generateTimeBlocks, formatTime } from '../lib/utils';
import { format, parse, isValid } from 'date-fns';
import { TaskModal } from './TaskModal';
import { useTaskTimer } from '../hooks/useTaskTimer';
import { useTimeCalculations } from '../hooks/useTimeCalculations';
import { useTaskState } from '../hooks/useTaskState';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { TimeSlot } from './TimeSlot';
import { ParkingLot } from './ParkingLot';
import { ErrorBoundary } from './ErrorBoundary';
import { DailyPlannerState, MultiSlotTaskInfo } from '../types/components';

// Add error display component
const ErrorDisplay: React.FC<{ error: Error | null; onDismiss: () => void }> = ({ error, onDismiss }) => {
  if (!error) return null;
  
  return (
    <div className="fixed top-4 right-4 z-50 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg animate-slideInFromRight">
      <div className="flex items-start">
        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-2" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800">Error</h3>
          <p className="text-sm text-red-700 mt-1">{error.message}</p>
        </div>
        <button
          onClick={onDismiss}
          className="ml-4 text-red-500 hover:text-red-700"
        >
          <span className="sr-only">Dismiss</span>
          ×
        </button>
      </div>
    </div>
  );
};

export function DailyPlanner() {
  const [state, setState] = useState<DailyPlannerState>({
    selectedTimeSlot: '',
    selectedTask: undefined,
    isHovering: null,
    activeDropdown: null,
    isLoading: false,
    error: null,
    isParkingLotTask: false
  });

  const { 
    selectedDate,
    addParkingLotTask,
    updateParkingLotTask: storeUpdateParkingLotTask,
    deleteParkingLotTask,
    addScheduledTask,
    updateScheduledTask: storeUpdateScheduledTask,
    deleteScheduledTask,
    moveTaskToTimeSlot,
    moveTaskToParkingLot,
    getTasksForDate,
    isTaskModalOpen,
    setTaskModalOpen
  } = useTimeAuditStore();
  
  // Memoize tasks for the selected date
  const { parkingLotTasks, scheduledTasks } = useMemo(() => 
    getTasksForDate(selectedDate),
    [selectedDate, getTasksForDate]
  );
  
  const {
    activeTimerTask,
    timerRunning,
    showExceedingAlert,
    handleStartTimer,
    handlePauseTimer,
    handleStopTimer,
    getFormattedElapsedTime,
    getFormattedRemainingTime,
    getTaskCompletionPercentage,
    getTimerStatus
  } = useTaskTimer();
  
  const { calculateTaskSpan, calculateEndTime, getDurationFromTask } = useTimeCalculations();
  
  // Initialize task state with custom hook
  const {
    parkingLotTasks: localParkingLotTasks,
    scheduledTasks: localScheduledTasks,
    isLoading,
    updateScheduledTask,
    updateParkingLotTask,
    deleteTask: deleteTaskWithState,
    updateState
  } = useTaskState({
    parkingLotTasks,
    scheduledTasks
  });

  // Initialize drag and drop with custom hook
  const {
    draggedTask,
    dragOverTimeSlot,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
    isSlotOccupied
  } = useDragAndDrop(
    localScheduledTasks,
    localParkingLotTasks,
    async (taskId, timeSlot, isFromParkingLot) => {
      try {
        if (isFromParkingLot) {
          await moveTaskToTimeSlot(taskId, timeSlot, true);
        } else {
          await moveTaskToTimeSlot(taskId, timeSlot, false);
        }
        
        // Update local state to reflect the change immediately
        if (isFromParkingLot) {
          const task = localParkingLotTasks.find(t => t.id === taskId);
          if (task) {
            // Remove from parking lot
            const updatedParkingLotTasks = localParkingLotTasks.filter(t => t.id !== taskId);
            
            // Add to scheduled tasks
            const scheduledTask: ScheduledTask = {
              ...task,
              timeSlot,
              scheduled: true,
              parkingLot: false,
              date: format(selectedDate, 'yyyy-MM-dd'),
              isCompleted: task.isCompleted || false,
              value: task.value,
              energy: task.energy,
              category: task.category
            };
            
            // Update local state
            const updatedScheduledTasks = [...localScheduledTasks, scheduledTask];
            
            // Update state
            setState(prev => ({
              ...prev,
              activeDropdown: null,
              isHovering: null
            }));
            
            // Update task state
            updateState({
              parkingLotTasks: updatedParkingLotTasks,
              scheduledTasks: updatedScheduledTasks
            });
          }
        } else {
          // Moving a scheduled task to a new time slot
          const updatedScheduledTasks = localScheduledTasks.map(task => {
            if (task.id === taskId) {
              return {
                ...task,
                timeSlot,
                date: format(selectedDate, 'yyyy-MM-dd')
              };
            }
            return task;
          });
          
          // Update state
          setState(prev => ({
            ...prev,
            activeDropdown: null,
            isHovering: null
          }));
          
          // Update task state
          updateState({
            scheduledTasks: updatedScheduledTasks
          });
        }
      } catch (error) {
        handleError(error as Error);
      }
    }
  );
  
  // Generate time blocks from 6 AM to 10 PM - memoize to prevent unnecessary recalculations
  const timeBlocks = useRef(generateTimeBlocks('06:00', '22:00')).current;

  // Sync local state with store when selected date changes
  useEffect(() => {
    console.log('Syncing tasks for date:', format(selectedDate, 'yyyy-MM-dd'));
    updateState({
      parkingLotTasks,
      scheduledTasks
    });
  }, [selectedDate]); // Only depend on date changes

  // Add click handler to close dropdowns when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => {
      setState(prev => ({ ...prev, activeDropdown: null }));
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle adding a new task to the parking lot
  const handleAddParkingLotTask = () => {
    // Explicitly reset the selected task and time slot before opening the modal
    // and set isParkingLotTask to true
    setState(prev => ({ 
      ...prev, 
      selectedTimeSlot: '', 
      selectedTask: undefined,
      isParkingLotTask: true
    }));
    setTaskModalOpen(true);
  };
  
  // Handle time slot click
  const handleTimeSlotClick = (time: string) => {
    const existingTask = localScheduledTasks.find(task => task.timeSlot === time);
    
    // If clicking on an empty time slot, make sure to reset the selected task
    if (!existingTask) {
      setState(prev => ({ 
        ...prev, 
        selectedTimeSlot: time, 
        selectedTask: undefined,
        isParkingLotTask: false // This is a timeline task
      }));
    } else {
      setState(prev => ({ 
        ...prev, 
        selectedTimeSlot: time, 
        selectedTask: existingTask as Task | undefined,
        isParkingLotTask: false // This is a timeline task
      }));
    }
    
    setTaskModalOpen(true);
  };

  // Handle task edit
  const handleEditTask = (task: Task) => {
    setState(prev => ({ 
      ...prev, 
      selectedTask: task as Task | undefined,
      selectedTimeSlot: 'timeSlot' in task ? (task as ScheduledTask).timeSlot : '',
      isParkingLotTask: Boolean(task.parkingLot) // Ensure boolean type
    }));
    setTaskModalOpen(true);
  };

  // Handle task type change
  const handleTaskTypeChange = (isParkingLotTask: boolean) => {
    setState(prev => ({
      ...prev,
      isParkingLotTask,
      // If switching to timeline and no time slot is selected, use current time
      selectedTimeSlot: !isParkingLotTask && !prev.selectedTimeSlot 
        ? format(new Date(), 'HH:mm')
        : isParkingLotTask ? '' : prev.selectedTimeSlot
    }));
  };

  // Add error handling
  const handleError = (error: Error) => {
    setState(prev => ({ ...prev, error }));
    console.error('Error in DailyPlanner:', error);
  };

  const handleDismissError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  // Handle task delete
  const handleDeleteTask = async (taskId: string, isScheduled: boolean) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTaskWithState(
          taskId,
          isScheduled,
          () => isScheduled ? deleteScheduledTask(taskId) : deleteParkingLotTask(taskId)
        );
        setState(prev => ({ ...prev, activeDropdown: null }));
      } catch (error) {
        handleError(error as Error);
      }
    }
  };
  
  // Handle task completion
  const handleTaskCompletion = async (taskId: string, isCompleted: boolean) => {
    try {
      const task = localScheduledTasks.find(t => t.id === taskId) || 
                   localParkingLotTasks.find(t => t.id === taskId);
      
      if (!task) {
        throw new Error('Task not found');
      }
      
      if ('timeSlot' in task) {
        await updateScheduledTask(
          taskId,
          { isCompleted },
          () => storeUpdateScheduledTask(taskId, { ...task, isCompleted })
        );
      } else {
        await updateParkingLotTask(
          taskId,
          { isCompleted },
          () => storeUpdateParkingLotTask(taskId, { ...task, isCompleted })
        );
      }
    } catch (error) {
      handleError(error as Error);
    }
  };
  
  // Add time slot change handler
  const handleTimeSlotChange = async (taskId: string, newTimeSlot: string) => {
    try {
      const task = localScheduledTasks.find(t => t.id === taskId) as ScheduledTask;
      if (!task) {
        throw new Error('Task not found');
      }

      // Calculate new start and end times based on the time slot
      const startTime = newTimeSlot;
      const durationMinutes = getDurationFromTask(task);
      const endTime = calculateEndTime(startTime, durationMinutes);

      // Update the task in the store
      const updatedTask = {
        ...task,
        timeSlot: newTimeSlot,
        startTime,
        endTime
      };

      await storeUpdateScheduledTask(taskId, updatedTask);

      // Update local state
      const updatedTasks = localScheduledTasks.map(t => 
        t.id === taskId ? updatedTask : t
      );
      updateState({ scheduledTasks: updatedTasks });
    } catch (error) {
      handleError(error as Error);
    }
  };

  // Update handleSaveTask to handle task type changes
  const handleSaveTask = async (taskData: Omit<Task, 'id'>) => {
    try {
      console.log('Task save initiated with data:', taskData);
      
      // Ensure we use the selected date from the calendar
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const taskWithDate = { 
        ...taskData, 
        date: formattedDate 
      };
      
      if (state.selectedTask) {
        // Update existing task
        if (!taskData.parkingLot) {
          const updatedTask = {
            ...state.selectedTask,
            ...taskWithDate,
            timeSlot: state.selectedTimeSlot,
            scheduled: true,
            parkingLot: false
          } as ScheduledTask;
          
          // First update the store
          await storeUpdateScheduledTask(state.selectedTask.id, updatedTask);
          
          // Then update local state directly
          const updatedTasks = localScheduledTasks.map(task => 
            task.id === state.selectedTask!.id ? updatedTask : task
          );
          updateState({ scheduledTasks: updatedTasks });
        } else {
          console.log('Updating parking lot task');
          const updatedTask = {
            ...state.selectedTask,
            ...taskWithDate,
            scheduled: false,
            parkingLot: true,
            order: localParkingLotTasks.length
          } as ParkingLotTask;
          
          console.log('Updated parking lot task data:', updatedTask);
          
          // First update the store
          await storeUpdateParkingLotTask(state.selectedTask.id, updatedTask);
          
          // Then update local state directly
          const updatedTasks = localParkingLotTasks.map(task => 
            task.id === state.selectedTask!.id ? updatedTask : task
          );
          updateState({ parkingLotTasks: updatedTasks });
          console.log('Local parking lot tasks updated');
        }
      } else {
        // Create new task
        if (!taskData.parkingLot) {
          const newTaskData = {
            ...taskWithDate,
            timeSlot: state.selectedTimeSlot,
            scheduled: true,
            parkingLot: false,
            isCompleted: false
          } as Omit<ScheduledTask, 'id'>;
          
          // Add to store first
          const result = await addScheduledTask(newTaskData);
          
          if (result && 'id' in result) {
            // Then update local state directly
            updateState({ 
              scheduledTasks: [...localScheduledTasks, result] 
            });
            console.log('Local scheduled tasks updated with new task');
          }
        } else {
          console.log('Creating parking lot task');
          const newTaskData = {
            ...taskWithDate,
            scheduled: false,
            parkingLot: true,
            isCompleted: false
          } as Omit<ParkingLotTask, 'id' | 'order'>;
          
          console.log('New parking lot task data:', newTaskData);
          
          // Add to store first
          const result = await addParkingLotTask(newTaskData);
          console.log('Result from addParkingLotTask:', result);
          
          if (result && 'id' in result) {
            console.log('Adding new parking lot task to local state:', result.id);
            
            // Then update local state directly
            updateState({ 
              parkingLotTasks: [...localParkingLotTasks, result] 
            });
            console.log('Local parking lot tasks updated with new task');
          }
        }
      }
      
      // Reset selected task and time slot after saving
      setState(prev => ({ 
        ...prev, 
        selectedTask: undefined, 
        selectedTimeSlot: '',
        isParkingLotTask: false
      }));
      console.log('Task save completed successfully');
    } catch (error) {
      console.error('Error saving task:', error);
      handleError(error as Error);
    }
  };

  // Handle parking lot drop
  const handleParkingLotDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    
    const isScheduledTask = localScheduledTasks.some(task => task.id === taskId);
    
    if (isScheduledTask) {
      const task = localScheduledTasks.find(t => t.id === taskId);
      if (!task) {
        throw new Error('Task not found');
      }
      
      try {
        await moveTaskToParkingLot(taskId);
        
        // Update local state to reflect the change immediately
        const updatedScheduledTasks = localScheduledTasks.filter(t => t.id !== taskId);
        
        // Create parking lot task
        const parkingLotTask: ParkingLotTask = {
          ...task,
          order: localParkingLotTasks.length,
          scheduled: false,
          parkingLot: true,
          date: format(selectedDate, 'yyyy-MM-dd'),
          isCompleted: task.isCompleted || false,
          value: task.value,
          energy: task.energy,
          category: task.category
        };
        
        // Update state
        setState(prev => ({
          ...prev,
          activeDropdown: null,
          isHovering: null
        }));
        
        // Update task state
        updateState({
          scheduledTasks: updatedScheduledTasks,
          parkingLotTasks: [...localParkingLotTasks, parkingLotTask]
        });
      } catch (error) {
        handleError(error as Error);
      }
    }
    
    handleDragEnd();
  };

  // Check if a time slot is part of a multi-slot task
  const isPartOfMultiSlotTask = (timeSlot: string): MultiSlotTaskInfo => {
    for (const task of localScheduledTasks) {
      const taskSpan = calculateTaskSpan(task);
      
      if (taskSpan <= 1) {
        if (task.timeSlot === timeSlot) {
          return { 
            isPartOf: true, 
            task: {
              ...task,
              scheduled: true,
              parkingLot: false
            } as ScheduledTask, 
            position: 'single' 
          };
        }
      } else {
        try {
          const taskStartTime = parse(task.timeSlot, 'HH:mm', new Date());
          const currentSlotTime = parse(timeSlot, 'HH:mm', new Date());
          
          if (!isValid(taskStartTime) || !isValid(currentSlotTime)) {
            continue;
          }
          
          const diffMinutes = (currentSlotTime.getTime() - taskStartTime.getTime()) / (1000 * 60);
          
          if (diffMinutes === 0) {
            return { 
              isPartOf: true, 
              task: {
                ...task,
                scheduled: true,
                parkingLot: false
              } as ScheduledTask, 
              position: 'first' 
            };
          }
          
          if (diffMinutes > 0 && diffMinutes < taskSpan * 15) {
            const isLastSlot = diffMinutes >= (taskSpan - 1) * 15;
            return { 
              isPartOf: true, 
              task: {
                ...task,
                scheduled: true,
                parkingLot: false
              } as ScheduledTask, 
              position: isLastSlot ? 'last' : 'middle' 
            };
          }
        } catch (error) {
          console.error('Error checking multi-slot task:', error);
          continue;
        }
      }
    }
    
    return { isPartOf: false, position: 'single' };
  };
  
  return (
    <ErrorBoundary>
      <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6">
        <style>
          {`
            @keyframes slideInFromRight {
              from {
                transform: translateX(100%);
                opacity: 0;
              }
              to {
                transform: translateX(0);
                opacity: 1;
              }
            }
          `}
        </style>
        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded-lg shadow-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Updating...</p>
            </div>
          </div>
        )}
        
        {/* Floating Action Button for Mobile */}
        <div className="fixed bottom-4 right-4 md:hidden z-20">
          <button
            onClick={handleAddParkingLotTask}
            className="w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center"
            aria-label="Add new task"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {/* Error Display */}
        <ErrorDisplay error={state.error} onDismiss={handleDismissError} />

        {/* Parking Lot */}
        <ParkingLot
          tasks={localParkingLotTasks}
          draggedTask={draggedTask}
          isHovering={state.isHovering}
          activeDropdown={state.activeDropdown}
          onAddTask={handleAddParkingLotTask}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDrop={handleParkingLotDrop}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          setActiveDropdown={(taskId) => setState(prev => ({ ...prev, activeDropdown: taskId }))}
          setIsHovering={(taskId) => setState(prev => ({ ...prev, isHovering: taskId }))}
          onTaskCompletion={handleTaskCompletion}
        />
        
        {/* Time Slots */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {timeBlocks.map((time) => {
            // Check if this time slot is part of a multi-slot task
            const multiSlotInfo = isPartOfMultiSlotTask(time);
            const { isPartOf, task: multiSlotTask, position } = multiSlotInfo;
            
            // Show hour label only at the beginning of each hour
            const showHourLabel = time.endsWith(':00');
            
            // Skip rendering if this is a middle or last part of a multi-slot task
            if (isPartOf && (position === 'middle' || position === 'last')) {
              return (
                <div 
                  key={time}
                  className="flex border-b border-gray-100"
                >
                  {/* Hour label */}
                  {showHourLabel && (
                    <div className="w-12 sm:w-16 flex items-center justify-center">
                      <span className="text-xs sm:text-sm font-medium text-gray-500">
                        {formatTime(time).split(':')[0]} {formatTime(time).includes('PM') ? 'PM' : 'AM'}
                      </span>
                    </div>
                  )}
                  
                  {/* Continuation indicator */}
                  <div 
                    className={cn(
                      "flex-1 h-[60px] max-h-[60px] p-2 transition-colors",
                      !showHourLabel && "ml-12 sm:ml-16",
                      multiSlotTask?.energy === 'gives' ? "bg-green-50" : "bg-red-50"
                    )}
                  >
                    <div className="flex items-center justify-center h-full text-gray-500 text-[10px]">
                      <span className="truncate">Part of {multiSlotTask?.title}</span>
                    </div>
                  </div>
                </div>
              );
            }
            
            return (
              <TimeSlot
                key={time}
                time={time}
                showHourLabel={showHourLabel}
                isSlotOccupied={isSlotOccupied(time)}
                isDragOver={dragOverTimeSlot === time}
                tasks={localScheduledTasks}
                draggedTask={draggedTask}
                isHovering={state.isHovering}
                activeDropdown={state.activeDropdown}
                onTimeSlotClick={handleTimeSlotClick}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onTaskCompletion={handleTaskCompletion}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onStartTimer={handleStartTimer}
                onPauseTimer={handlePauseTimer}
                onStopTimer={handleStopTimer}
                setActiveDropdown={(taskId) => setState(prev => ({ ...prev, activeDropdown: taskId }))}
                setIsHovering={(taskId) => setState(prev => ({ ...prev, isHovering: taskId }))}
                showExceedingAlert={showExceedingAlert}
                activeTimerTask={activeTimerTask}
                timerRunning={timerRunning}
                getFormattedElapsedTime={getFormattedElapsedTime}
                getFormattedRemainingTime={getFormattedRemainingTime}
                getTaskCompletionPercentage={getTaskCompletionPercentage}
                getTimerStatus={getTimerStatus}
              />
            );
          })}
        </div>
        
        {/* Task Modal */}
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => {
            setTaskModalOpen(false);
            // Explicitly reset the selected task and time slot when closing the modal
            setState(prev => ({ 
              ...prev, 
              selectedTask: undefined,
              selectedTimeSlot: '',
              isParkingLotTask: false
            }));
          }}
          startTime={state.selectedTimeSlot}
          onSave={handleSaveTask}
          initialTask={state.selectedTask as ScheduledTask}
          timeSlot={state.selectedTimeSlot}
          onTimeChange={handleTimeSlotChange}
          onTaskTypeChange={handleTaskTypeChange}
        />
      </div>
    </ErrorBoundary>
  );
}