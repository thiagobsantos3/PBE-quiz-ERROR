import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { calculateStudyStreak } from '../utils/quizHelpers';
import { useAuth } from '../contexts/AuthContext';

interface AnalyticsData {
  totalQuizzesCompleted: number;
  totalQuestionsAnswered: number;
  averageScore: number; // Percentage
  totalTimeSpentMinutes: number;
  studyStreak: number;
  totalPointsEarned: number;
  totalPossiblePoints: number;
}

interface UseAnalyticsDataProps {
  teamId: string | undefined;
  userId?: string; // Optional, for individual performance
  startDate?: Date;
  endDate?: Date;
}

export function useAnalyticsData({ teamId, userId, startDate, endDate }: UseAnalyticsDataProps) {
  const { developerLog } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!teamId) {
      developerLog('🔍 useAnalyticsData: No teamId provided, skipping data fetch');
      setLoading(false);
      setData(null);
      return;
    }

    developerLog('🔍 useAnalyticsData: Starting data fetch with params:', { teamId, userId, startDate, endDate });

    setLoading(true);
    setError(null);

    try {
      // Step 1: Fetch completed quiz sessions for the team (and optionally user)
      let sessionsQuery = supabase
        .from('quiz_sessions')
        .select('id, total_points, max_points, completed_at, total_actual_time_spent_seconds')
        .eq('team_id', teamId)
        .eq('status', 'completed');

      if (userId) {
        developerLog('🔍 useAnalyticsData: Filtering by userId:', userId);
        sessionsQuery = sessionsQuery.eq('user_id', userId);
      } else {
        developerLog('🔍 useAnalyticsData: Fetching data for all team members');
      }

      // Apply date range filters if provided
      if (startDate) {
        sessionsQuery = sessionsQuery.gte('completed_at', startDate.toISOString());
      }
      if (endDate) {
        // Add one day to endDate to include the entire end date
        const endDatePlusOne = new Date(endDate);
        endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
        sessionsQuery = sessionsQuery.lt('completed_at', endDatePlusOne.toISOString());
      }

      const { data: sessions, error: sessionsError } = await sessionsQuery;
      if (sessionsError) throw sessionsError;

      developerLog('🔍 useAnalyticsData: Fetched sessions for analytics:', sessions);
      developerLog('🔍 useAnalyticsData: Sessions fetched:', sessions?.length || 0, 'sessions');
      developerLog('🔍 useAnalyticsData: Sessions data:', sessions);

      const completedSessionIds = sessions?.map(s => s.id) || [];
      developerLog('🔍 useAnalyticsData: Completed session IDs for analytics:', completedSessionIds);
      developerLog('🔍 useAnalyticsData: Completed session IDs:', completedSessionIds);

      // Step 2: Fetch question logs associated with these completed sessions
      let questionLogsQuery = supabase
        .from('quiz_question_logs')
        .select('points_earned, total_points_possible, time_spent, answered_at');

      if (completedSessionIds.length > 0) {
        questionLogsQuery = questionLogsQuery.in('quiz_session_id', completedSessionIds);
      } else {
        // If no completed sessions, no logs to fetch
        developerLog('🔍 useAnalyticsData: No completed sessions found, returning empty data');
        setData({
          totalQuizzesCompleted: 0,
          totalQuestionsAnswered: 0,
          averageScore: 0,
          totalTimeSpentMinutes: 0,
          studyStreak: 0,
          totalPointsEarned: 0,
          totalPossiblePoints: 0,
        });
        setLoading(false);
        return;
      }

      if (userId) {
        questionLogsQuery = questionLogsQuery.eq('user_id', userId);
      }

      // Apply date range filters to question logs if provided
      if (startDate) {
        questionLogsQuery = questionLogsQuery.gte('answered_at', startDate.toISOString());
      }
      if (endDate) {
        const endDatePlusOne = new Date(endDate);
        endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
        questionLogsQuery = questionLogsQuery.lt('answered_at', endDatePlusOne.toISOString());
      }

      const { data: questionLogs, error: logsError } = await questionLogsQuery;
      if (logsError) throw logsError;

      developerLog('🔍 useAnalyticsData: Fetched question logs for analytics:', questionLogs);
      developerLog('🔍 useAnalyticsData: Question logs fetched:', questionLogs?.length || 0, 'logs');
      developerLog('🔍 useAnalyticsData: Question logs data:', questionLogs);

      // Calculate metrics
      const totalQuizzesCompleted = sessions?.length || 0;
      const totalQuestionsAnswered = questionLogs?.length || 0;

      let totalPointsEarned = 0;
      let totalPointsPossible = 0;

      questionLogs?.forEach(log => {
        totalPointsEarned += log.points_earned;
        totalPointsPossible += log.total_points_possible;
      });

      const averageScore = totalPointsPossible > 0 ? (totalPointsEarned / totalPointsPossible) * 100 : 0;
      
      // Use estimated_minutes from quiz sessions for consistent study time calculation
      const totalTimeSpentMinutes = sessions?.reduce((sum, session) => {
        // Convert seconds to minutes, fallback to 0 if not available
        const actualTimeMinutes = session.total_actual_time_spent_seconds 
          ? Math.round(session.total_actual_time_spent_seconds / 60)
          : 0;
        return sum + actualTimeMinutes;
      }, 0) || 0;
      developerLog('🔍 useAnalyticsData: Study time from estimated_minutes:', totalTimeSpentMinutes);

      // For study streak, use completed_at from sessions
      const completedActivities = sessions?.map(s => ({ completed_at: s.completed_at })) || [];
      const studyStreak = calculateStudyStreak(completedActivities);

      const calculatedData = {
        totalQuizzesCompleted,
        totalQuestionsAnswered,
        averageScore,
        totalTimeSpentMinutes,
        studyStreak,
        totalPointsEarned,
        totalPossiblePoints: totalPointsPossible,
      };

      developerLog('🔍 useAnalyticsData: Calculated analytics data:', calculatedData);
      setData(calculatedData);

    } catch (err: any) {
      console.error('Error fetching analytics data:', err);
      setError(err.message || 'Failed to load analytics data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [teamId, userId, startDate, endDate, developerLog]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refreshData: fetchData };
}