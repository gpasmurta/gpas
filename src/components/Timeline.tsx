import React, { useState, useEffect, useRef } from 'react';
import { generateTimeBlocks, formatTime, cn } from '../lib/utils';
import { Clock, Pencil, Trash2, Plus, FileText } from 'lucide-react';
import { useTimeAuditStore } from '../store/timeAuditStore';
import { TaskModal } from './TaskModal';
import { Task, ScheduledTask } from '../types';
import { format, isSameDay, parseISO } from 'date-fns';
import { TaskCard } from './TaskCard';

export function Timeline() {
  const timeBlocks = generateTimeBlocks();
  const { 
    tasks, 
    addTask, 
    updateTask, 
    deleteTask, 
    selectedDate, 
    isTaskModalOpen, 
    setTaskModalOpen,
    scheduledTasks,
  } = useTimeAuditStore();
  
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<Task | undefined>();
  const [isHovering, setIsHovering] = useState<string | null>(null);

  // Debug logs
  console.log('Timeline rendering with:', {
    tasksCount: tasks.length,
    scheduledTasksCount: scheduledTasks.length,
    selectedDate: selectedDate.toISOString(),
    selectedDateFormatted: format(selectedDate, 'yyyy-MM-dd')
  });

  // Log all scheduled tasks to see their properties
  console.log('All scheduled tasks:', scheduledTasks.map(task => ({
    id: task.id,
    title: task.title,
    date: task.date,
    startTime: task.startTime,
    endTime: task.endTime,
    timeSlot: task.timeSlot
  })));

  // Filter tasks for the selected date
  const tasksForSelectedDate = scheduledTasks.filter((task) => {
    try {
      const taskDate = parseISO(task.date);
      const isSame = isSameDay(taskDate, selectedDate);
      console.log(`Task ${task.id} date check:`, {
        taskDate: task.date,
        parsedTaskDate: taskDate.toISOString(),
        selectedDate: selectedDate.toISOString(),
        isSameDay: isSame,
        scheduled: task.scheduled
      });
      return isSame;
    } catch (error) {
      console.error(`Error parsing date for task ${task.id}:`, error);
      return false;
    }
  });

  console.log('Filtered tasks for selected date:', {
    count: tasksForSelectedDate.length,
    tasks: tasksForSelectedDate.map(t => ({
      id: t.id,
      title: t.title,
      startTime: t.startTime,
      endTime: t.endTime,
      scheduled: t.scheduled
    }))
  });

  // Debug logs for time blocks
  console.log('Time blocks:', timeBlocks);

  // Check how tasks are matched to time blocks
  timeBlocks.forEach(time => {
    const matchingTask = scheduledTasks.find(
      (t) => t.startTime === time || (t.startTime < time && t.endTime > time)
    );
    if (matchingTask) {
      console.log(`Time block ${time} has matching task:`, {
        taskId: matchingTask.id,
        taskTitle: matchingTask.title,
        taskStartTime: matchingTask.startTime,
        taskEndTime: matchingTask.endTime,
        timeSlot: matchingTask.timeSlot
      });
    }
  });

  const handleBlockClick = (time: string) => {
    const existingTask = tasksForSelectedDate.find(
      (t) => t.startTime === time || (t.startTime < time && t.endTime > time)
    );
    setSelectedTime(time);
    setSelectedTask(existingTask);
    setTaskModalOpen(true);
  };

  const handleSave = (taskData: Omit<Task, 'id' | 'date'>) => {
    const taskWithDate = {
      ...taskData,
      date: format(selectedDate, 'yyyy-MM-dd'),
    };

    console.log('Saving task with data:', {
      taskData,
      taskWithDate,
      selectedDate: selectedDate.toISOString(),
      formattedDate: format(selectedDate, 'yyyy-MM-dd'),
      isUpdate: !!selectedTask,
      selectedTaskId: selectedTask?.id
    });

    if (selectedTask) {
      updateTask(selectedTask.id, taskWithDate);
    } else {
      addTask(taskWithDate as Omit<Task, 'id'>);
    }
    setTaskModalOpen(false);
    setSelectedTask(undefined);
  };

  const handleDelete = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTask(taskId);
    }
  };

  return (
    <>
      <div className="w-full max-w-4xl mx-auto">
        {/* Timeline */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {timeBlocks.map((time) => {
            const task = tasksForSelectedDate.find(
              (t) => {
                const isMatch = t.startTime === time || (t.startTime < time && t.endTime > time);
                if (isMatch) {
                  console.log(`Found task for time block ${time}:`, {
                    taskId: t.id,
                    taskTitle: t.title,
                    taskStartTime: t.startTime,
                    taskEndTime: t.endTime,
                    timeBlockTime: time,
                    startTimeMatch: t.startTime === time,
                    inRangeMatch: t.startTime < time && t.endTime > time
                  });
                }
                return isMatch;
              }
            );

            console.log(`Time block ${time} task:`, task ? task.id : 'none');

            return (
              <div
                key={time}
                className={cn(
                  'group flex items-center gap-4 p-3 border-b border-gray-100 transition-colors',
                  task ? '' : 'hover:bg-gray-50 cursor-pointer'
                )}
                onClick={task ? undefined : () => handleBlockClick(time)}
                onMouseEnter={() => task && setIsHovering(task.id)}
                onMouseLeave={() => setIsHovering(null)}
              >
                <div className="flex items-center gap-2 min-w-[100px]">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">{formatTime(time)}</span>
                </div>
                {task ? (
                  <div className="flex-1">
                    <TaskCard 
                      task={{...task, timeSlot: time} as ScheduledTask} 
                      onClick={() => handleBlockClick(time)}
                    />
                    
                    {/* Task actions */}
                    {isHovering === task.id && (
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTask(task);
                            setTaskModalOpen(true);
                          }}
                          className="p-1 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-100"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(task.id, e)}
                          className="p-1 text-red-600 hover:text-red-800 rounded-full hover:bg-red-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1">
                    <button
                      onClick={() => handleBlockClick(time)}
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Task
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setTaskModalOpen(false);
          setSelectedTask(undefined);
        }}
        startTime={selectedTime}
        onSave={handleSave}
        initialTask={selectedTask as ScheduledTask}
      />
    </>
  );
}