import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface QuestionPerformanceData {
  question_id: string;
  question_text: string;
  answer_text: string;
  book_of_bible: string;
  chapter: number;
  tier: string;
  points: number;
  total_attempts: number;
  correct_attempts: number;
  incorrect_attempts: number;
  accuracy_rate: number;
  average_time_spent: number;
  total_points_earned: number;
  total_points_possible: number;
}

interface UseQuestionPerformanceDataProps {
  teamId: string | undefined;
  userId?: string; // Optional, for individual analysis
  startDate?: Date;
  endDate?: Date;
}

export function useQuestionPerformanceData({ teamId, userId, startDate, endDate }: UseQuestionPerformanceDataProps) {
  const [data, setData] = useState<QuestionPerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestionPerformanceData = useCallback(async () => {
    if (!teamId) {
      console.log('🔍 useQuestionPerformanceData: No teamId provided, skipping data fetch');
      setLoading(false);
      setData([]);
      return;
    }

    console.log('🔍 useQuestionPerformanceData: Starting question performance analysis with params:', { teamId, userId, startDate, endDate });

    setLoading(true);
    setError(null);

    try {
      // Step 1: Fetch completed quiz sessions for the team (and optionally user)
      let sessionsQuery = supabase
        .from('quiz_sessions')
        .select('id')
        .eq('team_id', teamId)
        .eq('status', 'completed');

      if (userId) {
        console.log('🔍 useQuestionPerformanceData: Filtering by userId:', userId);
        sessionsQuery = sessionsQuery.eq('user_id', userId);
      }

      // Apply date range filters if provided
      if (startDate) {
        sessionsQuery = sessionsQuery.gte('completed_at', startDate.toISOString());
      }
      if (endDate) {
        const endDatePlusOne = new Date(endDate);
        endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
        sessionsQuery = sessionsQuery.lt('completed_at', endDatePlusOne.toISOString());
      }

      const { data: sessions, error: sessionsError } = await sessionsQuery;
      if (sessionsError) throw sessionsError;

      console.log('🔍 useQuestionPerformanceData: Found completed sessions:', sessions?.length || 0);

      const completedSessionIds = sessions?.map(s => s.id) || [];

      if (completedSessionIds.length === 0) {
        console.log('🔍 useQuestionPerformanceData: No completed sessions found, returning empty data');
        setData([]);
        setLoading(false);
        return;
      }

      // Step 2: Fetch question logs with question details
      let questionLogsQuery = supabase
        .from('quiz_question_logs')
        .select(`
          question_id,
          points_earned,
          total_points_possible,
          time_spent,
          is_correct,
          questions!inner (
            id,
            question,
            answer,
            book_of_bible,
            chapter,
            tier,
            points
          )
        `)
        .in('quiz_session_id', completedSessionIds);

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

      console.log('🔍 useQuestionPerformanceData: Question logs fetched:', questionLogs?.length || 0);

      if (!questionLogs || questionLogs.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      // Step 3: Aggregate performance data by question
      const performanceMap = new Map<string, {
        question: any;
        totalAttempts: number;
        correctAttempts: number;
        totalTimeSpent: number;
        totalPointsEarned: number;
        totalPointsPossible: number;
      }>();

      questionLogs.forEach(log => {
        const questionId = log.question_id;
        const question = log.questions;
        
        if (!question) return; // Skip if question data is missing

        if (!performanceMap.has(questionId)) {
          performanceMap.set(questionId, {
            question,
            totalAttempts: 0,
            correctAttempts: 0,
            totalTimeSpent: 0,
            totalPointsEarned: 0,
            totalPointsPossible: 0,
          });
        }

        const stats = performanceMap.get(questionId)!;
        stats.totalAttempts++;
        stats.totalTimeSpent += log.time_spent;
        stats.totalPointsEarned += log.points_earned;
        stats.totalPointsPossible += log.total_points_possible;
        
        if (log.is_correct) {
          stats.correctAttempts++;
        }
      });

      // Step 4: Convert to QuestionPerformanceData objects
      const questionPerformanceData: QuestionPerformanceData[] = [];

      performanceMap.forEach((stats, questionId) => {
        const accuracyRate = stats.totalAttempts > 0 
          ? Math.round((stats.correctAttempts / stats.totalAttempts) * 100)
          : 0;
        
        const averageTimeSpent = stats.totalAttempts > 0 
          ? Math.round(stats.totalTimeSpent / stats.totalAttempts)
          : 0;

        questionPerformanceData.push({
          question_id: questionId,
          question_text: stats.question.question,
          answer_text: stats.question.answer,
          book_of_bible: stats.question.book_of_bible,
          chapter: stats.question.chapter,
          tier: stats.question.tier,
          points: stats.question.points,
          total_attempts: stats.totalAttempts,
          correct_attempts: stats.correctAttempts,
          incorrect_attempts: stats.totalAttempts - stats.correctAttempts,
          accuracy_rate: accuracyRate,
          average_time_spent: averageTimeSpent,
          total_points_earned: stats.totalPointsEarned,
          total_points_possible: stats.totalPointsPossible,
        });
      });

      // Sort by lowest accuracy rate first (most problematic questions)
      questionPerformanceData.sort((a, b) => a.accuracy_rate - b.accuracy_rate);

      console.log('✅ useQuestionPerformanceData: Question performance analysis complete:', questionPerformanceData.length, 'questions analyzed');
      setData(questionPerformanceData);

    } catch (err: any) {
      console.error('❌ Error fetching question performance data:', err);
      setError(err.message || 'Failed to load question performance data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [teamId, userId, startDate, endDate]);

  useEffect(() => {
    fetchQuestionPerformanceData();
  }, [fetchQuestionPerformanceData]);

  return { data, loading, error, refreshData: fetchQuestionPerformanceData };
}