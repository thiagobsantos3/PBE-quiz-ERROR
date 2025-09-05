import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface EngagementDataPoint {
  date: string;
  dateObj: Date;
  quizzesCompleted: number;
  questionsAnswered: number;
  timeSpentMinutes: number;
  averageSessionTime: number;
  studyStreak: number;
}

interface UseEngagementDataProps {
  teamId: string | undefined;
  userId?: string; // Optional, for individual analysis
  startDate?: Date;
  endDate?: Date;
}

export function useEngagementData({ teamId, userId, startDate, endDate }: UseEngagementDataProps) {
  const [data, setData] = useState<EngagementDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEngagementData = useCallback(async () => {
    if (!teamId) {
      console.log('🔍 useEngagementData: No teamId provided, skipping data fetch');
      setLoading(false);
      setData([]);
      return;
    }

    console.log('🔍 useEngagementData: Starting engagement analysis with params:', { teamId, userId, startDate, endDate });

    setLoading(true);
    setError(null);

    try {
      // Calculate date range - default to last 30 days if not provided
      const now = endDate || new Date();
      const thirtyDaysAgo = startDate || (() => {
        const date = new Date(now);
        date.setDate(date.getDate() - 30);
        return date;
      })();

      // Step 1: Fetch completed quiz sessions for the date range
      let sessionsQuery = supabase
        .from('quiz_sessions')
        .select('id, completed_at, total_actual_time_spent_seconds')
        .eq('team_id', teamId)
        .eq('status', 'completed')
        .gte('completed_at', thirtyDaysAgo.toISOString())
        .lte('completed_at', now.toISOString());

      if (userId) {
        console.log('🔍 useEngagementData: Filtering by userId:', userId);
        sessionsQuery = sessionsQuery.eq('user_id', userId);
      }

      const { data: sessions, error: sessionsError } = await sessionsQuery;
      if (sessionsError) throw sessionsError;

      console.log('🔍 useEngagementData: Found completed sessions:', sessions?.length || 0);

      const completedSessionIds = sessions?.map(s => s.id) || [];

      // Step 2: Fetch question logs for these sessions
      let questionLogs: any[] = [];
      
      if (completedSessionIds.length > 0) {
        let questionLogsQuery = supabase
          .from('quiz_question_logs')
          .select('answered_at, time_spent')
          .in('quiz_session_id', completedSessionIds)
          .gte('answered_at', thirtyDaysAgo.toISOString())
          .lte('answered_at', now.toISOString());

        if (userId) {
          questionLogsQuery = questionLogsQuery.eq('user_id', userId);
        }

        const { data: logs, error: logsError } = await questionLogsQuery;
        if (logsError) throw logsError;
        
        questionLogs = logs || [];
      }

      console.log('🔍 useEngagementData: Question logs fetched:', questionLogs.length);

      // Step 3: Group data by date
      const dailyData = new Map<string, {
        date: string;
        dateObj: Date;
        quizzesCompleted: number;
        questionsAnswered: number;
        timeSpentMinutes: number;
        sessionTimes: number[];
      }>();

      // Process quiz sessions
      sessions?.forEach(session => {
        const date = new Date(session.completed_at);
        const dateKey = date.toISOString().split('T')[0];
        
        if (!dailyData.has(dateKey)) {
          dailyData.set(dateKey, {
            date: dateKey,
            dateObj: date,
            quizzesCompleted: 0,
            questionsAnswered: 0,
            timeSpentMinutes: 0,
            sessionTimes: []
          });
        }
        
        const dayData = dailyData.get(dateKey)!;
        dayData.quizzesCompleted++;
        const actualTimeMinutes = session.total_actual_time_spent_seconds 
          ? Math.round(session.total_actual_time_spent_seconds / 60)
          : 0;
        dayData.timeSpentMinutes += actualTimeMinutes;
        dayData.sessionTimes.push(actualTimeMinutes);
      });

      // Process question logs
      questionLogs.forEach(log => {
        const date = new Date(log.answered_at);
        const dateKey = date.toISOString().split('T')[0];
        
        if (dailyData.has(dateKey)) {
          const dayData = dailyData.get(dateKey)!;
          dayData.questionsAnswered++;
        }
      });

      // Step 4: Convert to array and calculate additional metrics
      const engagementData: EngagementDataPoint[] = [];
      const sortedDates = Array.from(dailyData.keys()).sort();

      let currentStreak = 0;
      let streakDate = new Date(now);
      streakDate.setDate(streakDate.getDate() + 1); // Start from tomorrow to work backwards

      sortedDates.forEach((dateKey, index) => {
        const dayData = dailyData.get(dateKey)!;
        const averageSessionTime = dayData.sessionTimes.length > 0 
          ? Math.round(dayData.sessionTimes.reduce((sum, time) => sum + time, 0) / dayData.sessionTimes.length)
          : 0;

        // Calculate study streak (consecutive days with activity)
        const currentDate = new Date(dateKey);
        const expectedDate = new Date(streakDate);
        expectedDate.setDate(expectedDate.getDate() - 1);

        if (dayData.quizzesCompleted > 0) {
          if (currentDate.toDateString() === expectedDate.toDateString()) {
            currentStreak++;
          } else {
            currentStreak = 1; // Reset streak
          }
          streakDate = currentDate;
        } else {
          currentStreak = 0;
        }

        engagementData.push({
          date: dateKey,
          dateObj: dayData.dateObj,
          quizzesCompleted: dayData.quizzesCompleted,
          questionsAnswered: dayData.questionsAnswered,
          timeSpentMinutes: dayData.timeSpentMinutes,
          averageSessionTime,
          studyStreak: currentStreak
        });
      });

      // Sort by date (most recent first)
      engagementData.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

      console.log('✅ useEngagementData: Engagement analysis complete:', engagementData.length, 'data points');
      setData(engagementData);

    } catch (err: any) {
      console.error('❌ Error fetching engagement data:', err);
      setError(err.message || 'Failed to load engagement data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [teamId, userId, startDate, endDate]);

  useEffect(() => {
    fetchEngagementData();
  }, [fetchEngagementData]);

  return { data, loading, error, refreshData: fetchEngagementData };
}