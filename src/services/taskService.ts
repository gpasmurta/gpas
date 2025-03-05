import { supabase } from '../lib/supabase';
import { Task, TimerStep } from '../types';

// Convert frontend task model to database model
function toDbTask(task: Omit<Task, 'id'>, userId: string) {
  return {
    title: task.title,
    category: task.category,
    energy: task.energy,
    value: task.value,
    notes: task.notes || null,
    start_time: task.startTime,
    end_time: task.endTime,
    date: task.date,
    process_description: task.processDescription || null,
    process_summary: task.processSummary || null,
    timer_elapsed: task.timerElapsed || null,
    scheduled: task.scheduled || false,
    parking_lot: task.parkingLot || false,
    user_id: userId
  };
}

// Convert database task model to frontend model
function toFrontendTask(dbTask: any): Task {
  return {
    id: dbTask.id,
    title: dbTask.title,
    category: dbTask.category as any,
    energy: dbTask.energy as any,
    value: dbTask.value as any,
    notes: dbTask.notes,
    startTime: dbTask.start_time,
    endTime: dbTask.end_time,
    date: dbTask.date,
    processDescription: dbTask.process_description,
    processSummary: dbTask.process_summary,
    timerElapsed: dbTask.timer_elapsed,
    scheduled: dbTask.scheduled,
    parkingLot: dbTask.parking_lot
  };
}

// Get all tasks for the current user
export async function getTasks(userId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  
  if (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
  
  // Get timer steps for each task
  const tasksWithSteps = await Promise.all(
    data.map(async (task) => {
      const { data: steps, error: stepsError } = await supabase
        .from('timer_steps')
        .select('*')
        .eq('task_id', task.id)
        .eq('user_id', userId)
        .order('elapsed_time', { ascending: true });
      
      if (stepsError) {
        console.error('Error fetching timer steps:', stepsError);
        return toFrontendTask(task);
      }
      
      const frontendTask = toFrontendTask(task);
      
      if (steps && steps.length > 0) {
        frontendTask.timerSteps = steps.map((step) => ({
          description: step.description,
          elapsedTime: step.elapsed_time
        }));
      }
      
      return frontendTask;
    })
  );
  
  return tasksWithSteps;
}

// Create a new task
export async function createTask(task: Omit<Task, 'id'>, userId: string) {
  const dbTask = toDbTask(task, userId);
  
  const { data, error } = await supabase
    .from('tasks')
    .insert(dbTask)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating task:', error);
    throw error;
  }
  
  // If the task has timer steps, create them
  if (task.timerSteps && task.timerSteps.length > 0) {
    const timerSteps = task.timerSteps.map((step) => ({
      task_id: data.id,
      description: step.description,
      elapsed_time: step.elapsedTime,
      user_id: userId
    }));
    
    const { error: stepsError } = await supabase
      .from('timer_steps')
      .insert(timerSteps);
    
    if (stepsError) {
      console.error('Error creating timer steps:', stepsError);
      throw stepsError;
    }
  }
  
  return toFrontendTask(data);
}

// Update an existing task
export async function updateTask(id: string, task: Partial<Task>, userId: string) {
  // Convert task to database format
  const updates: any = {};
  
  if (task.title !== undefined) updates.title = task.title;
  if (task.category !== undefined) updates.category = task.category;
  if (task.energy !== undefined) updates.energy = task.energy;
  if (task.value !== undefined) updates.value = task.value;
  if (task.notes !== undefined) updates.notes = task.notes || null;
  if (task.startTime !== undefined) updates.start_time = task.startTime;
  if (task.endTime !== undefined) updates.end_time = task.endTime;
  if (task.date !== undefined) updates.date = task.date;
  if (task.processDescription !== undefined) updates.process_description = task.processDescription || null;
  if (task.processSummary !== undefined) updates.process_summary = task.processSummary || null;
  if (task.timerElapsed !== undefined) updates.timer_elapsed = task.timerElapsed || null;
  if (task.scheduled !== undefined) updates.scheduled = task.scheduled;
  if (task.parkingLot !== undefined) updates.parking_lot = task.parkingLot;
  
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId) // Ensure the user owns this task
    .select()
    .single();
  
  if (error) {
    console.error('Error updating task:', error);
    throw error;
  }
  
  // If the task has timer steps, update them
  if (task.timerSteps) {
    // First, delete existing steps
    const { error: deleteError } = await supabase
      .from('timer_steps')
      .delete()
      .eq('task_id', id)
      .eq('user_id', userId);
    
    if (deleteError) {
      console.error('Error deleting timer steps:', deleteError);
      throw deleteError;
    }
    
    // Then, insert new steps
    if (task.timerSteps.length > 0) {
      const timerSteps = task.timerSteps.map((step) => ({
        task_id: id,
        description: step.description,
        elapsed_time: step.elapsedTime,
        user_id: userId
      }));
      
      const { error: insertError } = await supabase
        .from('timer_steps')
        .insert(timerSteps);
      
      if (insertError) {
        console.error('Error creating timer steps:', insertError);
        throw insertError;
      }
    }
  }
  
  return toFrontendTask(data);
}

// Delete a task
export async function deleteTask(id: string, userId: string) {
  // First, delete any timer steps
  const { error: stepsError } = await supabase
    .from('timer_steps')
    .delete()
    .eq('task_id', id)
    .eq('user_id', userId);
  
  if (stepsError) {
    console.error('Error deleting timer steps:', stepsError);
    throw stepsError;
  }
  
  // Then, delete the task
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', userId); // Ensure the user owns this task
  
  if (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
  
  return { success: true };
}

// Add a timer step
export async function addTimerStep(taskId: string, step: Omit<TimerStep, 'id'>, userId: string) {
  const { error } = await supabase
    .from('timer_steps')
    .insert({
      task_id: taskId,
      description: step.description,
      elapsed_time: step.elapsedTime,
      user_id: userId
    });
  
  if (error) {
    console.error('Error adding timer step:', error);
    throw error;
  }
  
  return { success: true };
}