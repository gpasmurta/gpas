export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string
          title: string
          category: string
          energy: string
          value: string
          notes: string | null
          start_time: string
          end_time: string
          date: string
          process_description: string | null
          process_summary: string | null
          timer_elapsed: number | null
          scheduled: boolean
          parking_lot: boolean
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          category: string
          energy: string
          value: string
          notes?: string | null
          start_time: string
          end_time: string
          date: string
          process_description?: string | null
          process_summary?: string | null
          timer_elapsed?: number | null
          scheduled: boolean
          parking_lot: boolean
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          category?: string
          energy?: string
          value?: string
          notes?: string | null
          start_time?: string
          end_time?: string
          date?: string
          process_description?: string | null
          process_summary?: string | null
          timer_elapsed?: number | null
          scheduled?: boolean
          parking_lot?: boolean
          user_id?: string
          created_at?: string
        }
      }
      timer_steps: {
        Row: {
          id: string
          task_id: string
          description: string
          elapsed_time: number
          created_at: string
          user_id: string
        }
        Insert: {
          id?: string
          task_id: string
          description: string
          elapsed_time: number
          created_at?: string
          user_id: string
        }
        Update: {
          id?: string
          task_id?: string
          description?: string
          elapsed_time?: number
          created_at?: string
          user_id?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}