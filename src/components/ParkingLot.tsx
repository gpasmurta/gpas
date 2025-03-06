import React from 'react';
import { cn } from '../lib/utils';
import { ParkingLotTask } from '../types';
import { Plus, GripHorizontal, MoreVertical, Pencil, Trash2 } from 'lucide-react';

interface ParkingLotProps {
  tasks: ParkingLotTask[];
  draggedTask: string | null;
  isHovering: string | null;
  activeDropdown: string | null;
  onAddTask: () => void;
  onDragStart: (e: React.DragEvent, taskId: string, source: 'scheduledTasks' | 'parkingLot') => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent) => void;
  onEditTask: (task: ParkingLotTask) => void;
  onDeleteTask: (taskId: string, isScheduled: boolean) => void;
  setActiveDropdown: (taskId: string | null) => void;
  setIsHovering: (taskId: string | null) => void;
  onTaskCompletion?: (taskId: string, isCompleted: boolean) => void;
}

export function ParkingLot({
  tasks,
  draggedTask,
  isHovering,
  activeDropdown,
  onAddTask,
  onDragStart,
  onDragEnd,
  onDrop,
  onEditTask,
  onDeleteTask,
  setActiveDropdown,
  setIsHovering,
  onTaskCompletion
}: ParkingLotProps) {
  return (
    <div 
      className="bg-white rounded-lg shadow-sm p-3 sm:p-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-between mb-2 sm:mb-4">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">Parking Lot</h2>
        <button
          onClick={onAddTask}
          className="hidden md:flex items-center text-blue-600 hover:text-blue-800"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1" />
          Add Task
        </button>
      </div>
      
      <div className="flex flex-col sm:flex-row sm:overflow-x-auto pb-2 sm:pb-4 space-y-2 sm:space-y-0 sm:space-x-4">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center w-full h-16 sm:h-24 border-2 border-dashed border-gray-200 rounded-lg">
            <p className="text-gray-400 text-sm">No tasks in parking lot</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "min-w-full sm:min-w-[200px] border-2 border-dashed rounded-lg p-3 cursor-move relative",
                draggedTask === task.id && "opacity-50"
              )}
              draggable
              onDragStart={(e) => onDragStart(e, task.id, 'parkingLot')}
              onDragEnd={onDragEnd}
              onMouseEnter={() => setIsHovering(task.id)}
              onMouseLeave={() => setIsHovering(null)}
              onClick={(e) => {
                if (e.currentTarget === e.target) {
                  onEditTask(task);
                }
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={task.isCompleted}
                    onChange={(e) => {
                      e.stopPropagation();
                      if (typeof onTaskCompletion === 'function') {
                        onTaskCompletion(task.id, e.target.checked);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <h3 className={cn(
                    "font-medium text-sm sm:text-base truncate pr-6",
                    task.isCompleted && "line-through text-gray-500"
                  )}>
                    {task.title}
                  </h3>
                </div>
                <GripHorizontal className="w-4 h-4 text-gray-400 absolute top-2 left-1/2 transform -translate-x-1/2" />
              </div>
              <div className="text-xs text-gray-500 capitalize">
                {task.category}
              </div>
              <p className="text-xs text-gray-400 mt-1 italic">Drag to schedule</p>
              
              {/* Task actions */}
              {isHovering === task.id && (
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditTask(task);
                    }}
                    className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                    title="Edit task"
                  >
                    <Pencil className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTask(task.id, false);
                    }}
                    className="p-1 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-50"
                    title="Delete task"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
} 