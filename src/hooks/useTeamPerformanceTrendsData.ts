import { useState, useEffect, useCallback } from 'react';
import { 
  calculateDatePeriods, 
  fetchCompletedSessions, 
  fetchQuestionLogs, 
  calculateAverageScore, 
  calculateTotalTime, 
  countUnique, 
  handleAnalyticsError, 
  logAnalyticsOperation,
  type AnalyticsFilters 
} from '../utils/analyticsUtils';

interface TeamPerformanceTrendDataPoint {
  period: string;
  periodStart: Date;
  periodEnd: Date;
  totalQuizzesCompleted: number;
  totalQuestionsAnswered: number;
  totalPointsEarned: number;
  totalPossiblePoints: number;
  averageScore: number;
  totalTimeSpentMinutes: number;
  activeDays: number;
  activeMembers: number;
}

interface UseTeamPerformanceTrendsDataProps {
  teamId: string | undefined;
  timeframe?: 'weekly' | 'monthly';
  startDate?: Date;
  endDate?: Date;
}

export function useTeamPerformanceTrendsData({ 
  teamId, 
  timeframe = 'weekly', 
  startDate, 
  endDate 
}: UseTeamPerformanceTrendsDataProps) {
  const [data, setData] = useState<TeamPerformanceTrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamPerformanceTrends = useCallback(async () => {
    if (!teamId) {
      console.log('🔍 useTeamPerformanceTrendsData: No teamId provided, skipping data fetch');
      setLoading(false);
      setData([]);
      return;
    }

    console.log('🔍 useTeamPerformanceTrendsData: Starting team performance trends analysis with params:', { 
      teamId, 
      timeframe, 
      startDate, 
      endDate 
    });

    setLoading(true);
    setError(null);

    try {
      // Calculate date periods using shared utility
      const periods = calculateDatePeriods(timeframe, startDate, endDate);

      logAnalyticsOperation('useTeamPerformanceTrendsData: Analyzing periods', { 
        periodsCount: periods.length, 
        timeframe 
      });

      const trendsData: TeamPerformanceTrendDataPoint[] = [];
      const filters: AnalyticsFilters = { teamId, startDate, endDate };

      for (const period of periods) {
        logAnalyticsOperation(`Processing period: ${period.label}`, { period });

        // Fetch sessions for this specific period
        const periodFilters = {
          ...filters,
          startDate: period.start,
          endDate: period.end
        };

        const { data: sessions, error: sessionsError } = await fetchCompletedSessions(periodFilters);
        if (sessionsError) throw sessionsError;

        const completedSessionIds = sessions?.map(s => s.id) || [];

        // Fetch question logs for these sessions
        const { data: questionLogs, error: logsError } = await fetchQuestionLogs(
          completedSessionIds, 
          periodFilters
        );
        if (logsError) throw logsError;

        // Calculate metrics for this period
        const totalQuizzesCompleted = sessions?.length || 0;
        const totalQuestionsAnswered = questionLogs?.length || 0;

        let totalPointsEarned = 0;
        let totalPossiblePoints = 0;
        let totalTimeSpentSeconds = 0;

        (questionLogs || []).forEach(log => {
          totalPointsEarned += log.points_earned;
          totalPossiblePoints += log.total_points_possible;
          totalTimeSpentSeconds += log.time_spent;
        });

        const averageScore = calculateAverageScore(totalPointsEarned, totalPossiblePoints);
        const totalTimeSpentMinutes = calculateTotalTime(totalTimeSpentSeconds, sessions || []);

        // Calculate active days (days with at least one completed quiz)
        const activeDays = countUnique(
          (sessions || []).map(session => new Date(session.completed_at).toDateString())
        );

        // Calculate active members (unique users who completed quizzes)
        const activeMembers = countUnique(
          (sessions || []).map(session => session.user_id)
        );

        const dataPoint: TeamPerformanceTrendDataPoint = {
          period: period.label,
          periodStart: period.start,
          periodEnd: period.end,
          totalQuizzesCompleted,
          totalQuestionsAnswered,
          totalPointsEarned,
          totalPossiblePoints,
          averageScore,
          totalTimeSpentMinutes,
          activeDays,
          activeMembers,
        };

        trendsData.push(dataPoint);
      }

      logAnalyticsOperation('useTeamPerformanceTrendsData: Analysis complete', { 
        dataPointsCount: trendsData.length 
      });
      setData(trendsData);

    } catch (err: any) {
      setError(handleAnalyticsError(err, 'useTeamPerformanceTrendsData'));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [teamId, timeframe, startDate, endDate]);

  useEffect(() => {
    fetchTeamPerformanceTrends();
  }, [fetchTeamPerformanceTrends]);

  return { data, loading, error, refreshData: fetchTeamPerformanceTrends };
}