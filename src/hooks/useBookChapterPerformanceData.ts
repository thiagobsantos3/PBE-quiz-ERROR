import { useState, useEffect, useCallback } from 'react';
import { 
  fetchCompletedSessions, 
  fetchQuestionLogs, 
  calculateAverageScore, 
  handleAnalyticsError, 
  logAnalyticsOperation,
  type AnalyticsFilters 
} from '../utils/analyticsUtils';

interface BookChapterPerformanceData {
  book_of_bible: string;
  chapter: number;
  total_attempts: number;
  correct_attempts: number;
  incorrect_attempts: number;
  accuracy_rate: number;
  average_time_spent: number;
  total_points_earned: number;
  total_points_possible: number;
  points_efficiency: number;
}

interface UseBookChapterPerformanceDataProps {
  teamId: string | undefined;
  userId?: string; // Optional, for individual analysis
  startDate?: Date;
  endDate?: Date;
}

export function useBookChapterPerformanceData({ 
  teamId, 
  userId, 
  startDate, 
  endDate 
}: UseBookChapterPerformanceDataProps) {
  const [data, setData] = useState<BookChapterPerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookChapterPerformanceData = useCallback(async () => {
    if (!teamId) {
      console.log('🔍 useBookChapterPerformanceData: No teamId provided, skipping data fetch');
      setLoading(false);
      setData([]);
      return;
    }

    console.log('🔍 useBookChapterPerformanceData: Starting book/chapter performance analysis with params:', { 
      teamId, 
      userId, 
      startDate, 
      endDate 
    });

    setLoading(true);
    setError(null);

    try {
      const filters: AnalyticsFilters = { teamId, userId, startDate, endDate };

      // Step 1: Fetch completed quiz sessions
      const { data: sessions, error: sessionsError } = await fetchCompletedSessions(filters);
      if (sessionsError) throw sessionsError;

      logAnalyticsOperation('useBookChapterPerformanceData: Sessions fetched', { 
        sessionsCount: sessions?.length || 0 
      });

      const completedSessionIds = sessions?.map(s => s.id) || [];

      if (completedSessionIds.length === 0) {
        console.log('🔍 useBookChapterPerformanceData: No completed sessions found, returning empty data');
        setData([]);
        setLoading(false);
        return;
      }

      // Step 2: Fetch question logs with question details
      const { data: questionLogs, error: logsError } = await fetchQuestionLogs(
        completedSessionIds, 
        filters,
        true // Include question details
      );
      if (logsError) throw logsError;

      logAnalyticsOperation('useBookChapterPerformanceData: Question logs fetched', { 
        logsCount: questionLogs?.length || 0 
      });

      if (!questionLogs || questionLogs.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      // Step 3: Group data by book and chapter
      const performanceMap = new Map<string, {
        book_of_bible: string;
        chapter: number;
        total_attempts: number;
        correct_attempts: number;
        total_time_spent: number;
        total_points_earned: number;
        total_points_possible: number;
      }>();

      questionLogs.forEach(log => {
        const question = log.questions;
        if (!question) return;

        const key = `${question.book_of_bible}:${question.chapter}`;
        
        if (!performanceMap.has(key)) {
          performanceMap.set(key, {
            book_of_bible: question.book_of_bible,
            chapter: question.chapter,
            total_attempts: 0,
            correct_attempts: 0,
            total_time_spent: 0,
            total_points_earned: 0,
            total_points_possible: 0,
          });
        }

        const stats = performanceMap.get(key)!;
        stats.total_attempts++;
        stats.total_time_spent += log.time_spent;
        stats.total_points_earned += log.points_earned;
        stats.total_points_possible += log.total_points_possible;
        
        if (log.is_correct) {
          stats.correct_attempts++;
        }
      });

      // Step 4: Convert to BookChapterPerformanceData objects
      const bookChapterPerformanceData: BookChapterPerformanceData[] = [];

      performanceMap.forEach((stats) => {
        const accuracy_rate = stats.total_attempts > 0 
          ? Math.round((stats.correct_attempts / stats.total_attempts) * 100)
          : 0;
        
        const average_time_spent = stats.total_attempts > 0 
          ? Math.round(stats.total_time_spent / stats.total_attempts)
          : 0;

        const points_efficiency = stats.total_points_possible > 0 
          ? Math.round((stats.total_points_earned / stats.total_points_possible) * 100)
          : 0;

        bookChapterPerformanceData.push({
          book_of_bible: stats.book_of_bible,
          chapter: stats.chapter,
          total_attempts: stats.total_attempts,
          correct_attempts: stats.correct_attempts,
          incorrect_attempts: stats.total_attempts - stats.correct_attempts,
          accuracy_rate,
          average_time_spent,
          total_points_earned: stats.total_points_earned,
          total_points_possible: stats.total_points_possible,
          points_efficiency,
        });
      });

      // Sort by lowest accuracy rate first (most problematic areas)
      bookChapterPerformanceData.sort((a, b) => a.accuracy_rate - b.accuracy_rate);

      logAnalyticsOperation('useBookChapterPerformanceData: Analysis complete', { 
        dataPointsCount: bookChapterPerformanceData.length 
      });
      setData(bookChapterPerformanceData);

    } catch (err: any) {
      setError(handleAnalyticsError(err, 'useBookChapterPerformanceData'));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [teamId, userId, startDate, endDate]);

  useEffect(() => {
    fetchBookChapterPerformanceData();
  }, [fetchBookChapterPerformanceData]);

  return { data, loading, error, refreshData: fetchBookChapterPerformanceData };
}