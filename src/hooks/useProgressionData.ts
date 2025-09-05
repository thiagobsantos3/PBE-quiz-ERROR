import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface ProgressionDataPoint {
  period: string;
  periodStart: Date;
  periodEnd: Date;
  totalQuizzesCompleted: number;
  totalQuestionsAnswered: number;
  totalPointsEarned: number;
  totalPossiblePoints: number;
  averageScore: number;
  totalTimeSpentMinutes: number;
  correctAnswers: number;
  incorrectAnswers: number;
}

interface UseProgressionDataProps {
  teamId: string | undefined;
  userId?: string; // Optional, for individual analysis
  timeframe?: 'weekly' | 'monthly'; // Default to weekly
  startDate?: Date;
  endDate?: Date;
}

export function useProgressionData({ teamId, userId, timeframe = 'weekly', startDate, endDate }: UseProgressionDataProps) {
  const [data, setData] = useState<ProgressionDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgressionData = useCallback(async () => {
    if (!teamId) {
      console.log('🔍 useProgressionData: No teamId provided, skipping data fetch');
      setLoading(false);
      setData([]);
      return;
    }

    console.log('🔍 useProgressionData: Starting progression analysis with params:', { teamId, userId, timeframe, startDate, endDate });

    setLoading(true);
    setError(null);

    try {
      // Calculate date ranges based on provided dates or default to last 12 periods
      const now = endDate || new Date();
      const earliestDate = startDate || (() => {
        const date = new Date(now);
        if (timeframe === 'weekly') {
          date.setDate(date.getDate() - (12 * 7)); // 12 weeks ago
        } else {
          date.setMonth(date.getMonth() - 12); // 12 months ago
        }
        return date;
      })();
      
      const periods: { start: Date; end: Date; label: string }[] = [];
      
      // Calculate how many periods we need based on the date range
      let periodsCount = 12; // Default
      if (startDate && endDate) {
        const diffMs = endDate.getTime() - startDate.getTime();
        if (timeframe === 'weekly') {
          periodsCount = Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000));
        } else {
          periodsCount = Math.ceil(diffMs / (30 * 24 * 60 * 60 * 1000)); // Approximate months
        }
        periodsCount = Math.min(Math.max(periodsCount, 1), 24); // Limit between 1 and 24 periods
      }
      
      for (let i = periodsCount - 1; i >= 0; i--) {
        let start: Date, end: Date, label: string;
        
        if (timeframe === 'weekly') {
          // Calculate week boundaries (Sunday to Saturday)
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
          // Calculate month boundaries
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

      console.log('📅 useProgressionData: Analyzing', periods.length, 'periods within date range');

      const progressionData: ProgressionDataPoint[] = [];

      for (const period of periods) {
        console.log(`🔍 useProgressionData: Processing period: ${period.label}`);

        // Step 1: Fetch completed quiz sessions for this period
        let sessionsQuery = supabase
          .from('quiz_sessions')
          .select('id, total_points, max_points, completed_at, total_actual_time_spent_seconds')
          .eq('team_id', teamId)
          .eq('status', 'completed')
          .gte('completed_at', period.start.toISOString())
          .lte('completed_at', period.end.toISOString());

        if (userId) {
          sessionsQuery = sessionsQuery.eq('user_id', userId);
        }

        const { data: sessions, error: sessionsError } = await sessionsQuery;
        if (sessionsError) throw sessionsError;

        const completedSessionIds = sessions?.map(s => s.id) || [];

        // Step 2: Fetch question logs for these sessions
        let questionLogs: any[] = [];
        
        if (completedSessionIds.length > 0) {
          // Only query question logs if we have completed sessions
          let questionLogsQuery = supabase
            .from('quiz_question_logs')
            .select('points_earned, total_points_possible, time_spent, is_correct')
            .gte('answered_at', period.start.toISOString())
            .lte('answered_at', period.end.toISOString())
            .in('quiz_session_id', completedSessionIds);

          if (userId) {
            questionLogsQuery = questionLogsQuery.eq('user_id', userId);
          }

          const { data: logs, error: logsError } = await questionLogsQuery;
          if (logsError) throw logsError;
          
          questionLogs = logs || [];
        }
        // If no completed sessions, questionLogs remains empty array

        // Step 3: Calculate metrics for this period
        const totalQuizzesCompleted = sessions?.length || 0;
        const totalQuestionsAnswered = questionLogs?.length || 0;

        let totalPointsEarned = 0;
        let totalPossiblePoints = 0;
        let correctAnswers = 0;
        let incorrectAnswers = 0;

        questionLogs?.forEach(log => {
          totalPointsEarned += log.points_earned;
          totalPossiblePoints += log.total_points_possible;
          if (log.is_correct) {
            correctAnswers++;
          } else {
            incorrectAnswers++;
          }
        });

        const averageScore = totalPossiblePoints > 0 ? (totalPointsEarned / totalPossiblePoints) * 100 : 0;

        // Use actual time spent from quiz sessions for accurate study time calculation
        const totalTimeSpentMinutes = sessions?.reduce((sum, session) => {
          const actualTimeMinutes = session.total_actual_time_spent_seconds 
            ? Math.round(session.total_actual_time_spent_seconds / 60)
            : 0;
          return sum + actualTimeMinutes;
        }, 0) || 0;

        const dataPoint: ProgressionDataPoint = {
          period: period.label,
          periodStart: period.start,
          periodEnd: period.end,
          totalQuizzesCompleted,
          totalQuestionsAnswered,
          totalPointsEarned,
          totalPossiblePoints,
          averageScore,
          totalTimeSpentMinutes,
          correctAnswers,
          incorrectAnswers,
        };

        progressionData.push(dataPoint);
        console.log(`✅ useProgressionData: Period ${period.label} processed:`, dataPoint);
      }

      console.log('✅ useProgressionData: Progression analysis complete:', progressionData.length, 'data points');
      setData(progressionData);

    } catch (err: any) {
      console.error('❌ Error fetching progression data:', err);
      setError(err.message || 'Failed to load progression data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [teamId, userId, timeframe, startDate, endDate]);

  useEffect(() => {
    fetchProgressionData();
  }, [fetchProgressionData]);

  return { data, loading, error, refreshData: fetchProgressionData };
}