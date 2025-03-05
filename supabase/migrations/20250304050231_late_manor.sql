/*
  # Add completed field to tasks table

  1. Changes
    - Add `completed` boolean field to tasks table with default value of false
  
  2. Purpose
    - Allow tracking of task completion status
    - Support completed task styling and filtering
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'completed'
  ) THEN
    ALTER TABLE tasks ADD COLUMN completed BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;