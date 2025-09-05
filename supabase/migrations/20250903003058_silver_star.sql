/*
  # Add actual time spent column to quiz sessions

  1. Schema Changes
    - Add `total_actual_time_spent_seconds` column to `quiz_sessions` table
    - Column stores the sum of timeSpent from the results JSONB array
    - Provides more accurate time tracking than estimated_minutes

  2. Data Migration
    - Backfill existing completed quiz sessions with calculated actual time
    - Use JSONB array aggregation to sum timeSpent values from results

  3. Notes
    - New column will be populated automatically for future quiz completions
    - Existing data will be migrated to use actual time values
    - Fallback to estimated_minutes if results array is empty or invalid
*/

-- Add the new column to quiz_sessions table
ALTER TABLE quiz_sessions 
ADD COLUMN IF NOT EXISTS total_actual_time_spent_seconds integer DEFAULT 0;

-- Create a function to calculate actual time spent from results array
CREATE OR REPLACE FUNCTION calculate_actual_time_spent(results_json jsonb)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    total_time integer := 0;
    result_item jsonb;
BEGIN
    -- Check if results_json is a valid array
    IF results_json IS NULL OR jsonb_typeof(results_json) != 'array' THEN
        RETURN 0;
    END IF;
    
    -- Sum up timeSpent from each result item
    FOR result_item IN SELECT jsonb_array_elements(results_json)
    LOOP
        -- Extract timeSpent, default to 0 if not present or not a number
        total_time := total_time + COALESCE((result_item->>'timeSpent')::integer, 0);
    END LOOP;
    
    RETURN total_time;
END;
$$;

-- Backfill existing completed quiz sessions with calculated actual time
UPDATE quiz_sessions 
SET total_actual_time_spent_seconds = calculate_actual_time_spent(results)
WHERE status = 'completed' 
  AND total_actual_time_spent_seconds = 0
  AND results IS NOT NULL;

-- Create an index on the new column for better query performance
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_actual_time 
ON quiz_sessions (total_actual_time_spent_seconds);

-- Add a comment to document the column
COMMENT ON COLUMN quiz_sessions.total_actual_time_spent_seconds IS 
'Actual time spent on quiz calculated from sum of timeSpent values in results array. More accurate than estimated_minutes.';