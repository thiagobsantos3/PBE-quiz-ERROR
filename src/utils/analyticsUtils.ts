import { supabase } from '../lib/supabase';

/**
 * Shared utilities for analytics data fetching and calculations
 */

export interface DatePeriod {
  start: Date;
  end: Date;
  label: string;
}

export interface AnalyticsFilters {
  teamId: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Calculate date periods for analytics (weekly or monthly)
 */
export function calculateDatePeriods(
  timeframe: 'weekly' | 'monthly',
  startDate?: Date,
  endDate?: Date,
  defaultPeriods: number = 12
): DatePeriod[] {
  const now = endDate || new Date();
  const earliestDate = startDate || (() => {
    const date = new Date(now);
    if (timeframe === 'weekly') {
      date.setDate(date.getDate() - (defaultPeriods * 7));
    } else {
      date.setMonth(date.getMonth() - defaultPeriods);
    }
    return date;
  })();
  
  const periods: DatePeriod[] = [];
  
  // Calculate how many periods we need based on the date range
  let periodsCount = defaultPeriods;
  if (startDate && endDate) {
    const diffMs = endDate.getTime() - startDate.getTime();
    if (timeframe === 'weekly') {
      periodsCount = Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000));
    } else {
      periodsCount = Math.ceil(diffMs / (30 * 24 * 60 * 60 * 1000));
    }
    periodsCount = Math.min(Math.max(periodsCount, 1), 24);
  }
  
  for (let i = periodsCount - 1; i >= 0; i--) {
    let start: Date, end: Date, label: string;
    
    if (timeframe === 'weekly') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (now.getDay() + (i * 7)));
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      start = weekStart;
      end = weekEnd;
      label = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      
      start = monthStart;
      end = monthEnd;
      label = monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    
    // Only include periods that overlap with our date range
    if (startDate && end < startDate) continue;
    if (endDate && start > endDate) continue;
    
    periods.push({ start, end, label });
  }

  return periods;
}

/**
 * Fetch completed quiz sessions with filters
 */
export async function fetchCompletedSessions(filters: AnalyticsFilters) {
  let query = supabase
    .from('quiz_sessions')
    .select('id, total_points, max_points, completed_at, estimated_minutes, user_id')
    .eq('team_id', filters.teamId)
    .eq('status', 'completed');

  if (filters.userId) {
    query = query.eq('user_id', filters.userId);
  }

  if (filters.startDate) {
    query = query.gte('completed_at', filters.startDate.toISOString());
  }

  if (filters.endDate) {
    const endDatePlusOne = new Date(filters.endDate);
    endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
    query = query.lt('completed_at', endDatePlusOne.toISOString());
  }

  return await query;
}

/**
 * Fetch question logs for given session IDs
 */
export async function fetchQuestionLogs(
  sessionIds: string[],
  filters: AnalyticsFilters,
  includeQuestionDetails: boolean = false
) {
  if (sessionIds.length === 0) {
    return { data: [], error: null };
  }

  const selectFields = includeQuestionDetails 
    ? `points_earned, total_points_possible, time_spent, answered_at, is_correct, user_id,
       questions!inner (book_of_bible, chapter, tier, question, answer, points)`
    : 'points_earned, total_points_possible, time_spent, answered_at, is_correct, user_id';

  let query = supabase
    .from('quiz_question_logs')
    .select(selectFields)
    .in('quiz_session_id', sessionIds);

  if (filters.userId) {
    query = query.eq('user_id', filters.userId);
  }

  if (filters.startDate) {
    query = query.gte('answered_at', filters.startDate.toISOString());
  }

  if (filters.endDate) {
    const endDatePlusOne = new Date(filters.endDate);
    endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
    query = query.lt('answered_at', endDatePlusOne.toISOString());
  }

  return await query;
}

/**
 * Calculate average score from points
 */
export function calculateAverageScore(totalPointsEarned: number, totalPointsPossible: number): number {
  return totalPointsPossible > 0 ? (totalPointsEarned / totalPointsPossible) * 100 : 0;
}

/**
 * Calculate total time with fallback logic
 */
export function calculateTotalTime(
  timeSpentSeconds: number,
  sessions: Array<{ total_actual_time_spent_seconds?: number }> = []
): number {
  let totalTimeMinutes = Math.round(timeSpentSeconds / 60);
  
  // If time_spent is unrealistically low, use actual time from sessions fallback
  if (timeSpentSeconds < 30 && sessions.length > 0) {
    const actualTimeSecondsTotal = sessions.reduce((sum, session) => sum + (session.total_actual_time_spent_seconds || 0), 0);
    totalTimeMinutes = Math.round(actualTimeSecondsTotal / 60);
  }
  
  return totalTimeMinutes;
}

/**
 * Count unique values in an array
 */
export function countUnique<T>(array: T[]): number {
  return new Set(array).size;
}

/**
 * Group array items by a key function
 */
export function groupBy<T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<K, T[]>);
}

/**
 * Calculate trend between two values
 */
export function calculateTrend(current: number, previous: number): {
  direction: 'up' | 'down' | 'stable';
  value: number;
  color: string;
} {
  if (previous === 0) {
    return { direction: 'stable', value: 0, color: 'text-gray-600' };
  }

  const percentChange = ((current - previous) / previous) * 100;
  
  if (Math.abs(percentChange) < 5) {
    return { direction: 'stable', value: percentChange, color: 'text-gray-600' };
  } else if (percentChange > 0) {
    return { direction: 'up', value: percentChange, color: 'text-green-600' };
  } else {
    return { direction: 'down', value: percentChange, color: 'text-red-600' };
  }
}

/**
 * Standard error handling for analytics hooks
 */
export function handleAnalyticsError(error: any, context: string): string {
  console.error(`❌ ${context}:`, error);
  return error.message || `Failed to load ${context.toLowerCase()}`;
}

/**
 * Standard logging for analytics operations
 */
export function logAnalyticsOperation(operation: string, params: any, result?: any) {
  console.log(`🔍 ${operation}:`, params);
  if (result !== undefined) {
    console.log(`✅ ${operation} complete:`, result);
  }
}