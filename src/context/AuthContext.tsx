import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, signIn, signUp, signOut, getCurrentUser, getSession, onAuthStateChange } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signUp: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadUserSession() {
      try {
        setLoading(true);
        
        // Get the current session
        const currentSession = await getSession();
        setSession(currentSession);
        
        // Get the current user
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        
        // Set up auth state change listener
        const { data: authListener } = onAuthStateChange((event, session) => {
          setSession(session);
          setUser(session?.user ?? null);
        });
        
        return () => {
          authListener?.subscription.unsubscribe();
        };
      } catch (error) {
        setError(error as Error);
        console.error('Error loading user session:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadUserSession();
  }, []);

  const value = {
    session,
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}