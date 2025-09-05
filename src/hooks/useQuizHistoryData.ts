import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { QuizHistoryEntry } from '../types';

interface UseQuizHistoryDataProps {
  userId: string | undefined;
  startDate?: Date;
  endDate?: Date;
}

export function useQuizHistoryData({ userId, startDate, endDate }: UseQuizHistoryDataProps) {
  const [data, setData] = useState<QuizHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuizHistory = useCallback(async () => {
    if (!userId) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 useQuizHistoryData: Fetching quiz history for user:', userId, 'with date range:', startDate, endDate);

      let query = supabase
        .from('quiz_sessions_view') // <--- CHANGE: Query the new view
        .select(`
          id,
          title,
          type,
          completed_at,
          created_at,
          total_points,
          max_points,
          total_actual_time_spent_seconds,
          questions_count,
          approval_status
        `)
        .eq('user_id', userId)
        .eq('status', 'completed');

      if (startDate) {
        query = query.gte('completed_at', startDate.toISOString());
      }
      if (endDate) {
        const endDatePlusOne = new Date(endDate);
        endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
        query = query.lt('completed_at', endDatePlusOne.toISOString());
      }

      query = query.order('completed_at', { ascending: false });

      const { data: sessions, error: sessionsError } = await query;

      if (sessionsError) {
        console.error('❌ useQuizHistoryData: Error fetching quiz sessions:', sessionsError);
        throw sessionsError;
      }

      console.log('✅ useQuizHistoryData: Fetched', sessions?.length || 0, 'quiz history entries.');

      // Data is already in the correct format from the view
      setData(sessions || []);

    } catch (err: any) {
      console.error('💥 useQuizHistoryData: Failed to fetch quiz history:', err);
      setError(err.message || 'Failed to load quiz history');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [userId, startDate, endDate]);

  useEffect(() => {
    fetchQuizHistory();
  }, [fetchQuizHistory]);

  return { data, loading, error, refreshData: fetchQuizHistory };
}

// Export a function to update local quiz history entry
export function useQuizHistoryDataWithLocalUpdate({ userId, startDate, endDate }: UseQuizHistoryDataProps) {
  const { data, loading, error, refreshData } = useQuizHistoryData({ userId, startDate, endDate });
  const [localData, setLocalData] = useState<QuizHistoryEntry[]>([]);

  // Sync local data with hook data
  useEffect(() => {
    setLocalData(data);
  }, [data]);

  const updateLocalQuizHistoryEntry = useCallback((sessionId: string, updates: Partial<QuizHistoryEntry>) => {
    setLocalData(prev => prev.map(entry => 
      entry.id === sessionId ? { ...entry, ...updates } : entry
    ));
  }, []);

  return { 
    data: localData, 
    loading, 
    error, 
    refreshData,
    updateLocalQuizHistoryEntry 
  };
}