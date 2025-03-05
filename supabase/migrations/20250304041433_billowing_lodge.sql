/*
  # Add completed field to tasks table

  1. Changes
    - Add completed field to tasks table if it doesn't exist
  
  2. Purpose
    - Allow tracking of task completion status
    - Support task completion UI features
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