import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// Initialize the Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

console.log('Initializing Supabase client with:', {
  hasUrl: !!supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
  url: supabaseUrl ? `${supabaseUrl.substring(0, 10)}...` : 'missing',
  timestamp: new Date().toISOString()
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials. Make sure to set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Log connection status
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Supabase auth state changed:', { 
    event, 
    userId: session?.user?.id,
    email: session?.user?.email,
    isAuthenticated: !!session?.user,
    timestamp: new Date().toISOString()
  });
});

// Test database connection and check tasks table
(async () => {
  try {
    console.log('Testing Supabase connection...');
    
    // First test basic connection
    const { data: connectionData, error: connectionError } = await supabase
      .from('tasks')
      .select('count')
      .limit(1);
      
    if (connectionError) {
      console.error('Supabase connection test failed:', connectionError);
      if (connectionError.code === 'PGRST301') {
        console.error('Authentication error - please check if you are logged in');
      } else if (connectionError.code === '42P01') {
        console.error('Table "tasks" does not exist - please check your database schema');
      } else {
        console.error('Connection error details:', {
          code: connectionError.code,
          message: connectionError.message,
          details: connectionError.details
        });
      }
    } else {
      console.log('Supabase connection test successful');
    }
    
    // Then check if we can get the current user
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current user:', {
      userId: user?.id,
      email: user?.email,
      isAuthenticated: !!user,
      timestamp: new Date().toISOString()
    });
    
    // If we have a user, try to fetch their tasks
    if (user) {
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .limit(5);
        
      if (tasksError) {
        console.error('Error fetching user tasks:', {
          error: tasksError,
          code: tasksError.code,
          message: tasksError.message,
          details: tasksError.details
        });
      } else {
        console.log('Found tasks for user:', {
          count: tasks?.length || 0,
          tasks: tasks?.map(t => ({
            id: t.id,
            title: t.title,
            date: t.date
          }))
        });
      }
    }
  } catch (error) {
    console.error('Error testing Supabase connection:', error);
  }
})();

// Auth helper functions
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  
  return { data, error };
}

export async function updatePassword(password: string) {
  const { data, error } = await supabase.auth.updateUser({
    password,
  });
  
  return { data, error };
}

// Get the current user
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Get the current session
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Set up auth state change listener
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
}