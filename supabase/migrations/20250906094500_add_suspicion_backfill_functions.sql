-- Backfill functions for recomputing suspicion metrics using enhanced logic
-- Includes word-count from session questions JSON, expected-time ratio, high-point ultra-fast,
-- speed accuracy among ultra-fast answers, and streak/window density checks.

set check_function_bodies = off;

-- Helper: count words in a text (space-delimited)
create or replace function public.word_count(p_text text)
returns integer
language sql
stable
as $$
  select coalesce(array_length(regexp_split_to_array(trim(coalesce(p_text,'')), '\s+'), 1), 0);
$$;

-- Compute suspicion for a single session
create or replace function public.compute_suspicion_for_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_questions jsonb;
  v_total int := 0;

  -- counters
  c_fast_correct int := 0;
  c_ultra_fast int := 0;
  c_zero_one int := 0;
  c_show_answer_fast int := 0;
  c_highpoint_ultrafast int := 0;
  c_wordy_ultrafast int := 0;
  c_time_ratio_low int := 0;

  c_fast2_total int := 0;
  c_fast2_correct int := 0;

  max_consec_fast2 int := 0;
  streak_fast2 int := 0;

  window_size int := 10;
  flag_window_fast3 boolean := false;
  flag_window_highvalue_fast boolean := false;

  -- sliding window arrays
  arr_times int[] := '{}';
  arr_points int[] := '{}';

  -- loop vars
  r record;
  v_pts int;
  v_time numeric;
  v_correct boolean;
  v_show boolean;
  v_q jsonb;
  v_q_words int;
  v_a_words int;
  v_tmin numeric;
  v_expected numeric;

  rate_fast_correct numeric := 0;
  rate_ultra_fast numeric := 0;
  rate_zero_one numeric := 0;
  rate_show_answer_fast numeric := 0;
  rate_highpoint_ultrafast numeric := 0;
  rate_wordy_ultrafast numeric := 0;
  rate_time_ratio_low numeric := 0;

  fast2_share numeric := 0;
  fast2_accuracy numeric := 0;

  speed_accuracy_flag int := 0;
  streak_or_block_flag int := 0;

  v_score numeric := 0;
  v_status text := 'green';
begin
  -- fetch session questions snapshot
  select questions into v_questions from public.quiz_sessions where id = p_session_id;

  -- iterate logs in answered order
  for r in
    select question_id, total_points_possible, time_spent, is_correct, show_answer_used, answered_at
    from public.quiz_question_logs
    where quiz_session_id = p_session_id
    order by answered_at nulls last, created_at nulls last, id
  loop
    v_total := v_total + 1;
    v_pts := coalesce(r.total_points_possible, 1);
    v_time := coalesce(r.time_spent, 0);
    v_correct := coalesce(r.is_correct, false);
    v_show := coalesce(r.show_answer_used, false);

    -- extract question/answer text for word counts
    v_q := (
      select q
      from jsonb_array_elements(coalesce(v_questions, '[]'::jsonb)) as q
      where q->>'id' = r.question_id
      limit 1
    );
    v_q_words := word_count((v_q->>'question'));
    v_a_words := word_count((v_q->>'answer'));

    v_tmin := greatest(2, 2 * v_pts);
    v_expected := v_tmin + 0.2 * (v_q_words + v_a_words);

    if v_correct and v_time > 0 and v_time < v_tmin then c_fast_correct := c_fast_correct + 1; end if;
    if v_correct and v_time <= 2 then c_ultra_fast := c_ultra_fast + 1; end if;
    if v_correct and v_time <= 1 then c_zero_one := c_zero_one + 1; end if;
    if v_show and v_correct and v_time <= 2 then c_show_answer_fast := c_show_answer_fast + 1; end if;
    if v_correct and v_pts >= 4 and v_time <= 3 then c_highpoint_ultrafast := c_highpoint_ultrafast + 1; end if;
    if v_correct and (v_q_words + v_a_words) >= 14 and v_time <= 2 then c_wordy_ultrafast := c_wordy_ultrafast + 1; end if;
    if v_correct and v_expected > 0 and (v_time / v_expected) <= 0.3 then c_time_ratio_low := c_time_ratio_low + 1; end if;

    if v_time <= 2 then
      c_fast2_total := c_fast2_total + 1;
      if v_correct then c_fast2_correct := c_fast2_correct + 1; end if;
      streak_fast2 := streak_fast2 + 1;
    else
      streak_fast2 := 0;
    end if;
    if streak_fast2 > max_consec_fast2 then max_consec_fast2 := streak_fast2; end if;

    -- push into sliding window
    arr_times := arr_times || v_time::int;
    arr_points := arr_points || v_pts;
    if array_length(arr_times,1) > window_size then
      arr_times := arr_times[2:array_length(arr_times,1)];
      arr_points := arr_points[2:array_length(arr_points,1)];
    end if;

    -- evaluate window flags
    if array_length(arr_times,1) is not null then
      -- fast (<=3s) density
      if (select count(*) from unnest(arr_times) t(val) where val <= 3) >= 8 then
        flag_window_fast3 := true;
      end if;
      -- high-value (>=6pts) fast (<=3s) density
      if (select count(*) from unnest(arr_points) p(val) join unnest(arr_times) t(val) on true where p.val >= 6 and t.val <= 3) >= 3 then
        flag_window_highvalue_fast := true;
      end if;
    end if;
  end loop;

  if v_total > 0 then
    rate_fast_correct := c_fast_correct::numeric / v_total;
    rate_ultra_fast := c_ultra_fast::numeric / v_total;
    rate_zero_one := c_zero_one::numeric / v_total;
    rate_show_answer_fast := c_show_answer_fast::numeric / v_total;
    rate_highpoint_ultrafast := c_highpoint_ultrafast::numeric / v_total;
    rate_wordy_ultrafast := c_wordy_ultrafast::numeric / v_total;
    rate_time_ratio_low := c_time_ratio_low::numeric / v_total;

    fast2_share := c_fast2_total::numeric / v_total;
    fast2_accuracy := case when c_fast2_total > 0 then c_fast2_correct::numeric / c_fast2_total else 0 end;

    speed_accuracy_flag := case when fast2_share >= 0.3 and fast2_accuracy >= 0.9 then 1 else 0 end;
    streak_or_block_flag := case when max_consec_fast2 >= 5 or flag_window_fast3 or flag_window_highvalue_fast then 1 else 0 end;

    v_score := 0.30 * rate_wordy_ultrafast
            + 0.25 * rate_highpoint_ultrafast
            + 0.20 * rate_time_ratio_low
            + 0.15 * speed_accuracy_flag
            + 0.10 * streak_or_block_flag;
  else
    v_score := 0;
  end if;

  if v_score > 1 then v_score := 1; end if;
  v_status := case when v_score >= 0.25 then 'red' when v_score >= 0.15 then 'amber' else 'green' end;

  update public.quiz_sessions qs
  set
    suspicion_score = v_score,
    suspicion_status = v_status,
    suspicious_summary = jsonb_build_object(
      'fastCorrectRate', round(coalesce(rate_fast_correct,0)::numeric, 3),
      'ultraFastRate', round(coalesce(rate_ultra_fast,0)::numeric, 3),
      'zeroOneRate', round(coalesce(rate_zero_one,0)::numeric, 3),
      'showAnswerFastRate', round(coalesce(rate_show_answer_fast,0)::numeric, 3),
      'highPointUltraFastRate', round(coalesce(rate_highpoint_ultrafast,0)::numeric, 3),
      'wordyUltraFastRate', round(coalesce(rate_wordy_ultrafast,0)::numeric, 3),
      'timeRatioLowRate', round(coalesce(rate_time_ratio_low,0)::numeric, 3),
      'fast2Share', round(coalesce(fast2_share,0)::numeric, 3),
      'fast2Accuracy', round(coalesce(fast2_accuracy,0)::numeric, 3),
      'maxConsecutiveFast2OrLess', max_consec_fast2,
      'windowFast3OrLessDense', flag_window_fast3,
      'windowHighValueFastDense', flag_window_highvalue_fast,
      'totalQuestions', v_total
    )
  where qs.id = p_session_id;
end;
$$;

-- Recompute for all completed sessions
create or replace function public.recompute_suspicion_for_all_completed()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  n int := 0;
begin
  for r in select id from public.quiz_sessions where status = 'completed'
  loop
    perform public.compute_suspicion_for_session(r.id);
    n := n + 1;
  end loop;
  return n;
end;
$$;

grant execute on function public.compute_suspicion_for_session(uuid) to authenticated, anon;
grant execute on function public.recompute_suspicion_for_all_completed() to authenticated, anon;

