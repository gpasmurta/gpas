import React, { useState, useEffect, useRef } from 'react';
import { useTimeAuditStore } from '../store/timeAuditStore';
import { ParkingLotTask, ScheduledTask } from '../types';
import { Plus, Calendar, Clock, Zap, Battery, GripHorizontal } from 'lucide-react';
import { cn, formatTime, generateTimeBlocks, formatElapsedTime } from '../lib/utils';
import { format, isSameDay, parseISO } from 'date-fns';
import { TaskModal } from './TaskModal';
import { TaskCard } from './TaskCard';
import { TimeSlot } from './TimeSlot';
import { useTaskTimer } from '../hooks/useTaskTimer';

export function TimeBlocking() {
  const { 
    selectedDate, 
    parkingLotTasks, 
    scheduledTasks,
    addParkingLotTask,
    moveTaskToTimeSlot,
    moveTaskToParkingLot,
    getTasksForDate,
    isTaskModalOpen,
    setTaskModalOpen,
    updateScheduledTask,
    deleteScheduledTask
  } = useTimeAuditStore();
  
  const {
    activeTimerTask,
    timerRunning,
    showExceedingAlert,
    handleStartTimer,
    handlePauseTimer,
    handleStopTimer,
    getFormattedElapsedTime,
    getFormattedRemainingTime,
    getTaskCompletionPercentage
  } = useTaskTimer();
  
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | undefined>();
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverTimeSlot, setDragOverTimeSlot] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  // Get tasks for the selected date
  const tasksForDate = getTasksForDate(selectedDate);
  const filteredParkingLotTasks = tasksForDate.parkingLotTasks;
  const filteredScheduledTasks = tasksForDate.scheduledTasks;
  
  // Generate time blocks from 8 AM to 8 PM
  const timeBlocks = generateTimeBlocks('08:00', '20:00');
  
  // Handle adding a new task to the parking lot
  const handleAddParkingLotTask = () => {
    // Create a new task with default values
    const newTask: Omit<ParkingLotTask, 'id' | 'order'> = {
      title: 'New Task',
      category: 'work',
      energy: 'gives',
      value: 'medium',
      startTime: '08:00',
      endTime: '08:15',
      date: format(selectedDate, 'yyyy-MM-dd'),
      parkingLot: true,
      scheduled: false
    };
    
    addParkingLotTask(newTask);
  };
  
  // Handle time slot click
  const handleTimeSlotClick = (time: string) => {
    // Find if there's a task already scheduled for this time slot
    const existingTask = filteredScheduledTasks.find(task => task.timeSlot === time);
    
    setSelectedTimeSlot(time);
    setSelectedTask(existingTask);
    setTaskModalOpen(true);
  };
  
  // Handle task completion toggle
  const handleTaskCompletion = (taskId: string, isCompleted: boolean) => {
    updateScheduledTask(taskId, { isCompleted });
  };
  
  // Handle task edit
  const handleEditTask = (task: ScheduledTask) => {
    setSelectedTask(task);
    setSelectedTimeSlot(task.timeSlot);
    setTaskModalOpen(true);
  };
  
  // Handle task delete
  const handleDeleteTask = (taskId: string, isScheduled: boolean) => {
    if (isScheduled) {
      deleteScheduledTask(taskId);
    }
  };
  
  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    setDraggedTask(taskId);
  };
  
  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverTimeSlot(null);
  };
  
  const handleDragOver = (e: React.DragEvent, timeSlot: string) => {
    e.preventDefault();
    setDragOverTimeSlot(timeSlot);
  };
  
  const handleDrop = (e: React.DragEvent, timeSlot: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    
    // Check if the task is from the parking lot or another time slot
    const isParkingLotTask = filteredParkingLotTasks.some(task => task.id === taskId);
    
    // Move the task to the time slot
    moveTaskToTimeSlot(taskId, timeSlot, isParkingLotTask);
    
    setDraggedTask(null);
    setDragOverTimeSlot(null);
  };
  
  const handleParkingLotDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    
    // Check if the task is from a time slot
    const isScheduledTask = filteredScheduledTasks.some(task => task.id === taskId);
    
    if (isScheduledTask) {
      // Move the task to the parking lot
      moveTaskToParkingLot(taskId);
    }
    
    setDraggedTask(null);
  };
  
  return (
    <div className="flex flex-col gap-6">
      {/* Parking Lot */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Parking Lot</h2>
          <button
            onClick={handleAddParkingLotTask}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
        
        <div 
          className="flex flex-wrap gap-4 min-h-[100px] p-4 border-2 border-dashed border-gray-200 rounded-lg"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleParkingLotDrop}
        >
          {filteredParkingLotTasks.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No tasks in parking lot
            </div>
          ) : (
            filteredParkingLotTasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "min-w-[240px] border-2 border-dashed rounded-lg p-3 cursor-move",
                  task.energy === 'gives' 
                    ? "bg-green-50 border-green-200" 
                    : "bg-red-50 border-red-200",
                  draggedTask === task.id && "opacity-50"
                )}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                onDragEnd={handleDragEnd}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{task.title}</h3>
                  <GripHorizontal className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={cn(
                    "px-2 py-1 rounded-full",
                    task.energy === 'gives' 
                      ? "bg-green-100 text-green-800" 
                      : "bg-red-100 text-red-800"
                  )}>
                    {task.energy === 'gives' ? 'Energizing' : 'Draining'}
                  </span>
                  <span className="text-gray-500 capitalize">{task.category}</span>
                  <span className="text-gray-500 capitalize">{task.value} Value</span>
                </div>
                <p className="text-xs text-gray-500 mt-2 italic">Drag to schedule</p>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Time Slots */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {timeBlocks.map((time, index) => {
          // Check if there are tasks scheduled for this time slot
          const tasksForTimeSlot = filteredScheduledTasks.filter(task => task.timeSlot === time);
          const isSlotOccupied = tasksForTimeSlot.length > 0;
          const isDragOver = dragOverTimeSlot === time;
          
          // Show hour label only at the beginning of each hour
          const showHourLabel = time.endsWith(':00');
          
          return (
            <TimeSlot
              key={time}
              time={time}
              showHourLabel={showHourLabel}
              isSlotOccupied={isSlotOccupied}
              isDragOver={isDragOver}
              tasks={tasksForTimeSlot}
              draggedTask={draggedTask}
              isHovering={isHovering}
              activeDropdown={activeDropdown}
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
              setActiveDropdown={setActiveDropdown}
              setIsHovering={setIsHovering}
              showExceedingAlert={showExceedingAlert}
              activeTimerTask={activeTimerTask}
              timerRunning={timerRunning}
              getFormattedElapsedTime={getFormattedElapsedTime}
              getFormattedRemainingTime={getFormattedRemainingTime}
              getTaskCompletionPercentage={getTaskCompletionPercentage}
            />
          );
        })}
      </div>
      
      {/* Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setTaskModalOpen(false);
          setSelectedTask(undefined);
        }}
        startTime={selectedTimeSlot}
        onSave={(taskData) => {
          // Handle saving task - this will be implemented in the TaskModal component
          console.log('Save task:', taskData);
        }}
        initialTask={selectedTask}
      />
    </div>
  );
}