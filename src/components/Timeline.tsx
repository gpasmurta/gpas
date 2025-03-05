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
    setTaskModalOpen
  } = useTimeAuditStore();
  
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<Task | undefined>();
  const [isHovering, setIsHovering] = useState<string | null>(null);

  // Filter tasks for the selected date
  const tasksForSelectedDate = tasks.filter((task) => 
    isSameDay(parseISO(task.date), selectedDate)
  );

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
              (t) => t.startTime === time || (t.startTime < time && t.endTime > time)
            );

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