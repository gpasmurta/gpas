import { supabase } from '../lib/supabase';
import { Task, TimerStep } from '../types';
import { format, parseISO, startOfDay } from 'date-fns';

// Convert frontend task model to database model
function toDbTask(task: Omit<Task, 'id'>, userId: string) {
  // Parse the date and ensure UTC midnight
  const taskDate = task.date ? new Date(task.date) : new Date();
  const utcDate = new Date(Date.UTC(
    taskDate.getUTCFullYear(),
    taskDate.getUTCMonth(),
    taskDate.getUTCDate(),
    0, 0, 0, 0
  ));
  
  // Format date without timezone conversion
  const formattedDate = utcDate.toISOString().split('T')[0];
  
  console.log('Converting task to DB format:', {
    originalDate: task.date,
    utcDate: utcDate.toISOString(),
    formattedDate,
    task
  });
  
  return {
    title: task.title,
    category: task.category,
    energy: task.energy,
    value: task.value,
    notes: task.notes || null,
    start_time: task.startTime,
    end_time: task.endTime,
    date: formattedDate,
    process_description: task.processDescription || null,
    process_summary: task.processSummary || null,
    timer_elapsed: task.timerElapsed || null,
    scheduled: task.scheduled || false,
    parking_lot: task.parkingLot || false,
    completed: task.isCompleted || false,
    user_id: userId
  };
}

// Convert database task model to frontend model
function toFrontendTask(dbTask: any): Task {
  return {
    id: dbTask.id,
    title: dbTask.title,
    category: dbTask.category,
    energy: dbTask.energy,
    value: dbTask.value,
    notes: dbTask.notes,
    startTime: dbTask.start_time,
    endTime: dbTask.end_time,
    date: dbTask.date, // Date is already in YYYY-MM-DD format
    processDescription: dbTask.process_description,
    processSummary: dbTask.process_summary,
    timerElapsed: dbTask.timer_elapsed,
    scheduled: dbTask.scheduled,
    parkingLot: dbTask.parking_lot,
    isCompleted: dbTask.completed || false
  };
}

// Function to check Supabase timezone settings
async function checkSupabaseTimezone() {
  const { data, error } = await supabase
    .from('tasks')
    .select('created_at')
    .limit(1);
  
  if (error) {
    console.error('Error checking timezone:', error);
    return null;
  }
  
  // Get the server's timestamp
  const serverTime = data?.[0]?.created_at;
  return {
    serverTime,
    localTime: new Date().toISOString(),
    browserTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    browserOffset: new Date().getTimezoneOffset()
  };
}

// Get all tasks for the current user and date
export async function getTasksForDate(userId: string, date: string) {
  // Use the date string directly without UTC conversion
  const formattedDate = date;
  
  console.log('Date handling in getTasksForDate:', { 
    inputDate: date,
    formattedDate,
    browserTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    browserOffset: new Date().getTimezoneOffset(),
    timestamp: new Date().toISOString()
  });
  
  // Check timezone configuration first
  try {
    const timezoneInfo = await checkSupabaseTimezone();
    console.log('Timezone comparison:', {
      ...timezoneInfo,
      inputDate: date,
      offset: timezoneInfo ? 
        new Date(timezoneInfo.serverTime).getTime() - new Date(timezoneInfo.localTime).getTime() 
        : null
    });
  } catch (error) {
    console.warn('Could not check timezone:', error);
  }
  
  // First verify the user exists
  const { data: { user } } = await supabase.auth.getUser();
  console.log('Current auth state:', {
    requestedUserId: userId,
    currentUserId: user?.id,
    isAuthenticated: !!user,
    queryDate: formattedDate
  });
  
  // Log the query we're about to make
  console.log('Executing Supabase query:', {
    table: 'tasks',
    conditions: {
      user_id: userId,
      date: formattedDate
    },
    timestamp: new Date().toISOString()
  });

  // First, let's check if the table exists and we can access it
  const { data: tableInfo, error: tableError } = await supabase
    .from('tasks')
    .select('count')
    .limit(1);

  if (tableError) {
    console.error('Error accessing tasks table:', tableError);
    throw tableError;
  }

  console.log('Tasks table access check:', {
    success: true,
    tableInfo
  });

  // Now fetch the actual tasks
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('date', formattedDate)
    .order('start_time', { ascending: true });
  
  if (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
  
  console.log('Raw tasks from Supabase:', {
    count: data?.length || 0,
    date: formattedDate,
    tasks: data?.map(t => ({
      id: t.id,
      title: t.title,
      date: t.date,
      user_id: t.user_id,
      start_time: t.start_time,
      end_time: t.end_time,
      scheduled: t.scheduled,
      parking_lot: t.parking_lot
    }))
  });
  
  // Get timer steps for each task
  const tasksWithSteps = await Promise.all(
    (data || []).map(async (task) => {
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
  
  console.log('Tasks with steps:', {
    count: tasksWithSteps.length,
    date: formattedDate,
    tasks: tasksWithSteps.map(t => ({
      id: t.id,
      title: t.title,
      date: t.date,
      startTime: t.startTime,
      endTime: t.endTime,
      scheduled: t.scheduled,
      parkingLot: t.parkingLot
    }))
  });
  
  return tasksWithSteps;
}

// Create a new task
export async function createTask(task: Omit<Task, 'id'>, userId: string) {
  console.log('Creating task with:', { 
    task,
    userId,
    timestamp: new Date().toISOString()
  });

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  console.log('Auth check for task creation:', {
    requestedUserId: userId,
    currentUserId: user?.id,
    isAuthenticated: !!user
  });

  const dbTask = toDbTask(task, userId);
  console.log('Converted to DB task:', {
    original: task,
    converted: dbTask,
    timestamp: new Date().toISOString()
  });
  
  // First verify we can access the tasks table
  const { error: tableError } = await supabase
    .from('tasks')
    .select('count')
    .limit(1);

  if (tableError) {
    console.error('Error accessing tasks table:', tableError);
    throw tableError;
  }

  // Now create the task
  const { data, error } = await supabase
    .from('tasks')
    .insert(dbTask)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating task:', {
      error,
      task: dbTask,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
  
  console.log('Task created in Supabase:', {
    taskId: data.id,
    task: data,
    timestamp: new Date().toISOString()
  });
  
  // If the task has timer steps, create them
  if (task.timerSteps && task.timerSteps.length > 0) {
    const timerSteps = task.timerSteps.map((step) => ({
      task_id: data.id,
      description: step.description,
      elapsed_time: step.elapsedTime,
      user_id: userId
    }));
    
    console.log('Creating timer steps:', {
      taskId: data.id,
      steps: timerSteps,
      timestamp: new Date().toISOString()
    });

    const { error: stepsError } = await supabase
      .from('timer_steps')
      .insert(timerSteps);
    
    if (stepsError) {
      console.error('Error creating timer steps:', {
        error: stepsError,
        steps: timerSteps,
        timestamp: new Date().toISOString()
      });
      throw stepsError;
    }
  }
  
  const frontendTask = toFrontendTask(data);
  console.log('Returning frontend task:', {
    task: frontendTask,
    timestamp: new Date().toISOString()
  });
  return frontendTask;
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
  if (task.isCompleted !== undefined) updates.completed = task.isCompleted;
  
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