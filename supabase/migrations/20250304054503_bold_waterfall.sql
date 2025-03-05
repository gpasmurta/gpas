/*
  # Add completed status to tasks table

  1. Changes
    - Add `completed` boolean column to tasks table with default value of false
    - Add `completed_at` timestamp column to tasks table to track when tasks were completed
  
  2. Purpose
    - Enable tracking of task completion status
    - Allow for reporting on completed vs. incomplete tasks
    - Store timestamp of when tasks were completed for analytics
*/

DO $$
BEGIN
  -- Add completed column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'completed'
  ) THEN
    ALTER TABLE tasks ADD COLUMN completed BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Add completed_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;
END $$;