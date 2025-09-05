-- This file contains SQL functions for managing plans and their settings.
-- It has been updated to support multi-currency pricing stored in the 'plan_prices' table.

-- Function to create a new plan and its associated settings and prices
CREATE OR REPLACE FUNCTION public.create_plan_and_settings(
    p_id text,
    p_name text,
    p_is_enabled boolean,
    p_description text,
    p_max_questions_custom_quiz integer,
    p_max_team_members integer,
    p_question_tier_access text[],
    p_allow_quick_start_quiz boolean,
    p_allow_create_own_quiz boolean,
    p_allow_study_schedule_quiz boolean,
    p_allow_analytics_access boolean,
    p_prices jsonb -- NEW: Array of price objects for different currencies/intervals
)
RETURNS void AS $$
DECLARE
    new_plan_id text;
    price_obj jsonb;
BEGIN
    -- Insert into plans table
    -- Note: 'price' and 'currency' columns in 'plans' table are set to default/placeholder values
    -- as actual pricing will now be managed by the 'plan_prices' table.
    INSERT INTO public.plans (id, name, price, currency, is_enabled, description)
    VALUES (p_id, p_name, 0, 'usd', p_is_enabled, p_description)
    RETURNING id INTO new_plan_id;

    -- Insert into plan_settings table
    INSERT INTO public.plan_settings (
        plan_id,
        max_questions_custom_quiz,
        max_team_members,
        question_tier_access,
        allow_quick_start_quiz,
        allow_create_own_quiz,
        allow_study_schedule_quiz,
        allow_analytics_access
    )
    VALUES (
        new_plan_id,
        p_max_questions_custom_quiz,
        p_max_team_members,
        p_question_tier_access,
        p_allow_quick_start_quiz,
        p_allow_create_own_quiz,
        p_allow_study_schedule_quiz,
        p_allow_analytics_access
    );

    -- Insert into plan_prices table
    IF p_prices IS NOT NULL THEN
        FOR price_obj IN SELECT * FROM jsonb_array_elements(p_prices)
        LOOP
            INSERT INTO public.plan_prices (plan_id, currency, interval, amount)
            VALUES (
                new_plan_id,
                price_obj->>'currency',
                price_obj->>'interval',
                (price_obj->>'amount')::numeric
            );
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update an existing plan and its associated settings and prices
CREATE OR REPLACE FUNCTION public.update_plan(
    p_id text,
    p_name text,
    p_is_enabled boolean,
    p_description text,
    p_max_questions_custom_quiz integer,
    p_max_team_members integer,
    p_question_tier_access text[],
    p_allow_quick_start_quiz boolean,
    p_allow_create_own_quiz boolean,
    p_allow_study_schedule_quiz boolean,
    p_allow_analytics_access boolean,
    p_prices jsonb -- NEW: Array of price objects for different currencies/intervals
)
RETURNS void AS $$
DECLARE
    price_obj jsonb;
BEGIN
    -- Update plans table
    -- Note: 'price' and 'currency' columns in 'plans' table are set to default/placeholder values
    -- as actual pricing will now be managed by the 'plan_prices' table.
    UPDATE public.plans
    SET
        name = p_name,
        price = 0, -- Set to default/placeholder
        currency = 'usd', -- Set to default/placeholder
        is_enabled = p_is_enabled,
        description = p_description,
        updated_at = now()
    WHERE id = p_id;

    -- Update plan_settings table
    UPDATE public.plan_settings
    SET
        max_questions_custom_quiz = p_max_questions_custom_quiz,
        max_team_members = p_max_team_members,
        question_tier_access = p_question_tier_access,
        allow_quick_start_quiz = p_allow_quick_start_quiz,
        allow_create_own_quiz = p_allow_create_own_quiz,
        allow_study_schedule_quiz = p_allow_study_schedule_quiz,
        allow_analytics_access = p_allow_analytics_access,
        updated_at = now()
    WHERE plan_id = p_id;

    -- Delete existing prices for this plan
    DELETE FROM public.plan_prices WHERE plan_id = p_id;

    -- Insert new prices into plan_prices table
    IF p_prices IS NOT NULL THEN
        FOR price_obj IN SELECT * FROM jsonb_array_elements(p_prices)
        LOOP
            INSERT INTO public.plan_prices (plan_id, currency, interval, amount)
            VALUES (
                p_id,
                price_obj->>'currency',
                price_obj->>'interval',
                (price_obj->>'amount')::numeric
            );
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql;
