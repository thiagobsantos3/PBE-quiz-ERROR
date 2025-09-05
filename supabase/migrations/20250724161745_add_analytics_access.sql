-- Add new column to plan_settings table
ALTER TABLE public.plan_settings
ADD COLUMN allow_analytics_access BOOLEAN NOT NULL DEFAULT FALSE;

-- Update default values for existing plans based on requirements
-- Assuming 'free' plan should not have analytics access by default
UPDATE public.plan_settings
SET allow_analytics_access = FALSE
WHERE plan_id = 'free';

-- Assuming 'pro' and 'enterprise' plans should have analytics access by default
UPDATE public.plan_settings
SET allow_analytics_access = TRUE
WHERE plan_id IN ('pro', 'enterprise');

-- Update the update_plan_settings function
CREATE OR REPLACE FUNCTION public.update_plan_settings(
    p_plan_id text,
    p_max_questions_custom_quiz integer,
    p_max_team_members integer,
    p_question_tier_access text[],
    p_allow_quick_start_quiz boolean,
    p_allow_create_own_quiz boolean,
    p_allow_study_schedule_quiz boolean,
    p_allow_analytics_access boolean -- New parameter
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.plan_settings
    SET
        max_questions_custom_quiz = p_max_questions_custom_quiz,
        max_team_members = p_max_team_members,
        question_tier_access = p_question_tier_access,
        allow_quick_start_quiz = p_allow_quick_start_quiz,
        allow_create_own_quiz = p_allow_create_own_quiz,
        allow_study_schedule_quiz = p_allow_study_schedule_quiz,
        allow_analytics_access = p_allow_analytics_access, -- New assignment
        updated_at = now()
    WHERE plan_id = p_plan_id;
END;
$$;

-- Update the create_plan_and_settings function
CREATE OR REPLACE FUNCTION public.create_plan_and_settings(
    p_id text,
    p_name text,
    p_price numeric,
    p_is_enabled boolean,
    p_description text,
    p_max_questions_custom_quiz integer,
    p_max_team_members integer,
    p_question_tier_access text[],
    p_allow_quick_start_quiz boolean,
    p_allow_create_own_quiz boolean,
    p_allow_study_schedule_quiz boolean,
    p_allow_analytics_access boolean -- New parameter
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert into plans table
    INSERT INTO public.plans (id, name, price, is_enabled, description)
    VALUES (p_id, p_name, p_price, p_is_enabled, p_description);

    -- Insert into plan_settings table
    INSERT INTO public.plan_settings (
        plan_id,
        max_questions_custom_quiz,
        max_team_members,
        question_tier_access,
        allow_quick_start_quiz,
        allow_create_own_quiz,
        allow_study_schedule_quiz,
        allow_analytics_access -- New column
    )
    VALUES (
        p_id,
        p_max_questions_custom_quiz,
        p_max_team_members,
        p_question_tier_access,
        p_allow_quick_start_quiz,
        p_allow_create_own_quiz,
        p_allow_study_schedule_quiz,
        p_allow_analytics_access -- New value
    );
END;
$$;

-- Grant execute permissions to authenticated users for the updated functions
GRANT EXECUTE ON FUNCTION public.update_plan_settings(text, integer, integer, text[], boolean, boolean, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_plan_and_settings(text, text, numeric, boolean, text, integer, integer, text[], boolean, boolean, boolean, boolean) TO authenticated;

-- Set search_path for security definer functions
ALTER FUNCTION public.update_plan_settings(text, integer, integer, text[], boolean, boolean, boolean, boolean) SET search_path = public;
ALTER FUNCTION public.create_plan_and_settings(text, text, numeric, boolean, text, integer, integer, text[], boolean, boolean, boolean, boolean) SET search_path = public;