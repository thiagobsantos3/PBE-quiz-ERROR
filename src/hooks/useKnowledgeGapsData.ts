import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface KnowledgeGap {
  topic: string;
  type: 'book' | 'chapter' | 'tier';
  averageScore: number;
  totalQuestions: number;
  totalAttempts: number;
  correctAnswers: number;
  incorrectAnswers: number;
  book?: string;
  chapter?: number;
  tier?: string;
}

interface UseKnowledgeGapsDataProps {
  teamId: string | undefined;
  userId?: string; // Optional, for individual analysis
  startDate?: Date;
  endDate?: Date;
}

export function useKnowledgeGapsData({ teamId, userId, startDate, endDate }: UseKnowledgeGapsDataProps) {
  const [data, setData] = useState<KnowledgeGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKnowledgeGaps = useCallback(async () => {
    if (!teamId) {
      console.log('🔍 useKnowledgeGapsData: No teamId provided, skipping data fetch');
      setLoading(false);
      setData([]);
      return;
    }

    console.log('🔍 useKnowledgeGapsData: Starting knowledge gaps analysis with params:', { teamId, userId, startDate, endDate });

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
        console.log('🔍 useKnowledgeGapsData: Filtering by userId:', userId);
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

      console.log('🔍 useKnowledgeGapsData: Found completed sessions:', sessions?.length || 0);

      const completedSessionIds = sessions?.map(s => s.id) || [];

      if (completedSessionIds.length === 0) {
        console.log('🔍 useKnowledgeGapsData: No completed sessions found, returning empty data');
        setData([]);
        setLoading(false);
        return;
      }

      // Step 2: Fetch question logs with question details
      let questionLogsQuery = supabase
        .from('quiz_question_logs')
        .select(`
          points_earned,
          total_points_possible,
          is_correct,
          questions!inner (
            book_of_bible,
            chapter,
            tier
          )
        `)
        .in('quiz_session_id', completedSessionIds);

      if (userId) {
        questionLogsQuery = questionLogsQuery.eq('user_id', userId);
      }

      const { data: questionLogs, error: logsError } = await questionLogsQuery;
      if (logsError) throw logsError;

      console.log('🔍 useKnowledgeGapsData: Question logs fetched:', questionLogs?.length || 0);

      if (!questionLogs || questionLogs.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      // Step 3: Analyze knowledge gaps by different categories
      const gapsAnalysis = new Map<string, {
        totalQuestions: number;
        totalAttempts: number;
        correctAnswers: number;
        totalPointsEarned: number;
        totalPointsPossible: number;
        type: 'book' | 'chapter' | 'tier';
        book?: string;
        chapter?: number;
        tier?: string;
      }>();

      questionLogs.forEach(log => {
        const question = log.questions;
        if (!question) return;

        // Analyze by book
        const bookKey = `book:${question.book_of_bible}`;
        if (!gapsAnalysis.has(bookKey)) {
          gapsAnalysis.set(bookKey, {
            totalQuestions: 0,
            totalAttempts: 0,
            correctAnswers: 0,
            totalPointsEarned: 0,
            totalPointsPossible: 0,
            type: 'book',
            book: question.book_of_bible
          });
        }
        const bookStats = gapsAnalysis.get(bookKey)!;
        bookStats.totalAttempts++;
        bookStats.totalPointsEarned += log.points_earned;
        bookStats.totalPointsPossible += log.total_points_possible;
        if (log.is_correct) bookStats.correctAnswers++;

        // Analyze by chapter
        const chapterKey = `chapter:${question.book_of_bible}:${question.chapter}`;
        if (!gapsAnalysis.has(chapterKey)) {
          gapsAnalysis.set(chapterKey, {
            totalQuestions: 0,
            totalAttempts: 0,
            correctAnswers: 0,
            totalPointsEarned: 0,
            totalPointsPossible: 0,
            type: 'chapter',
            book: question.book_of_bible,
            chapter: question.chapter
          });
        }
        const chapterStats = gapsAnalysis.get(chapterKey)!;
        chapterStats.totalAttempts++;
        chapterStats.totalPointsEarned += log.points_earned;
        chapterStats.totalPointsPossible += log.total_points_possible;
        if (log.is_correct) chapterStats.correctAnswers++;

        // Analyze by tier
        const tierKey = `tier:${question.tier}`;
        if (!gapsAnalysis.has(tierKey)) {
          gapsAnalysis.set(tierKey, {
            totalQuestions: 0,
            totalAttempts: 0,
            correctAnswers: 0,
            totalPointsEarned: 0,
            totalPointsPossible: 0,
            type: 'tier',
            tier: question.tier
          });
        }
        const tierStats = gapsAnalysis.get(tierKey)!;
        tierStats.totalAttempts++;
        tierStats.totalPointsEarned += log.points_earned;
        tierStats.totalPointsPossible += log.total_points_possible;
        if (log.is_correct) tierStats.correctAnswers++;
      });

      // Step 4: Convert to KnowledgeGap objects and filter for significant gaps
      const knowledgeGaps: KnowledgeGap[] = [];

      gapsAnalysis.forEach((stats, key) => {
        // Only include topics with at least 3 attempts to have meaningful data
        if (stats.totalAttempts < 3) return;

        const averageScore = stats.totalPointsPossible > 0 
          ? (stats.totalPointsEarned / stats.totalPointsPossible) * 100 
          : 0;

        // Only include topics with below 90% average score as "knowledge gaps"
        if (averageScore >= 90) return;

        let topic = '';
        if (stats.type === 'book') {
          topic = stats.book!;
        } else if (stats.type === 'chapter') {
          topic = `${stats.book} Chapter ${stats.chapter}`;
        } else if (stats.type === 'tier') {
          topic = `${stats.tier?.charAt(0).toUpperCase()}${stats.tier?.slice(1)} Questions`;
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

        knowledgeGaps.push({
          topic,
          type: stats.type,
          averageScore,
          totalQuestions: stats.totalAttempts, // Using attempts as question count for now
          totalAttempts: stats.totalAttempts,
          correctAnswers: stats.correctAnswers,
          incorrectAnswers: stats.totalAttempts - stats.correctAnswers,
          book: stats.book,
          chapter: stats.chapter,
          tier: stats.tier
        });
      });

      // Sort by lowest average score (biggest gaps first)
      knowledgeGaps.sort((a, b) => a.averageScore - b.averageScore);

      // Limit to top 10 knowledge gaps
      const topGaps = knowledgeGaps.slice(0, 10);

      console.log('✅ useKnowledgeGapsData: Knowledge gaps analysis complete:', topGaps.length, 'gaps found');
      setData(topGaps);

    } catch (err: any) {
      console.error('❌ Error fetching knowledge gaps data:', err);
      setError(err.message || 'Failed to load knowledge gaps data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [teamId, userId, startDate, endDate]);

  useEffect(() => {
    fetchKnowledgeGaps();
  }, [fetchKnowledgeGaps]);

  return { data, loading, error, refreshData: fetchKnowledgeGaps };
}