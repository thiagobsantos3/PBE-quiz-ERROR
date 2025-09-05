import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { calculateCurrentStudyStreak } from '../utils/quizHelpers';
import { useAuth } from '../contexts/AuthContext';

interface UserAnalytics {
  totalQuizzesCompleted: number;
  totalQuestionsAnswered: number;
  averageScore: number; // Percentage
  totalTimeSpentMinutes: number;
  studyStreak: number;
  totalPointsEarned: number;
  totalPossiblePoints: number;
}

interface UseUserAnalyticsProps {
  userId: string | undefined;
  startDate?: Date;
  endDate?: Date;
}

export function useUserAnalytics({ userId, startDate, endDate }: UseUserAnalyticsProps) {
  const { developerLog } = useAuth();
  const [data, setData] = useState<UserAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Temporarily disable caching for debugging
  // const isFetchingRef = useRef(false);
  // const lastFetchRef = useRef<{ userId: string; startDate: string; endDate: string } | null>(null);

  const fetchUserAnalytics = useCallback(async () => {
    if (!userId) {
      developerLog('🔍 useUserAnalytics: No userId provided, skipping data fetch');
      setLoading(false);
      setData(null);
      return;
    }

    // Temporarily disable caching for debugging
    // // Prevent multiple simultaneous requests
    // if (isFetchingRef.current) {
    //   developerLog('🔍 useUserAnalytics: Request already in progress, skipping');
    //   return;
    // }

    // // Check if we've already fetched the same data recently
    // const currentRequest = {
    //   userId,
    //   startDate: startDate?.toISOString() || '',
    //   endDate: endDate?.toISOString() || ''
    // };

    // if (lastFetchRef.current && 
    //     lastFetchRef.current.userId === currentRequest.userId &&
    //     lastFetchRef.current.startDate === currentRequest.startDate &&
    //     lastFetchRef.current.endDate === currentRequest.endDate) {
    //   developerLog('🔍 useUserAnalytics: Same request already made, skipping');
    //   return;
    // }

    developerLog('🔍 useUserAnalytics: Starting user analytics fetch for user:', userId, 'with date range:', startDate, endDate);

    // isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // Use the secure database function to get user analytics data
      developerLog('🔍 useUserAnalytics: Using secure function to fetch user analytics data');
      
      const { data: analyticsData, error: analyticsError } = await supabase
        .rpc('get_user_analytics_data', { 
          p_user_id: userId,
          p_start_date: startDate?.toISOString(),
          p_end_date: endDate?.toISOString()
        });

      if (analyticsError) {
        console.error('❌ Error fetching user analytics data:', analyticsError);
        throw analyticsError;
      }

      developerLog('✅ useUserAnalytics: Raw RPC response:', analyticsData);
      developerLog('🔍 useUserAnalytics: RPC response type:', typeof analyticsData);
      developerLog('🔍 useUserAnalytics: RPC response keys:', analyticsData ? Object.keys(analyticsData) : 'null');

      // Fix: RPC returns an array, we need the first element
      let actualData = null;
      if (Array.isArray(analyticsData) && analyticsData.length > 0) {
        actualData = analyticsData[0];
        developerLog('✅ useUserAnalytics: Extracted data from array:', actualData);
      } else if (analyticsData && !Array.isArray(analyticsData)) {
        actualData = analyticsData;
        developerLog('✅ useUserAnalytics: Using data directly (not array):', actualData);
      } else {
        developerLog('⚠️ useUserAnalytics: No valid data found in RPC response');
      }

      // Transform the data to match our interface
      const transformedData: UserAnalytics = {
        totalQuizzesCompleted: Number(actualData?.total_quizzes_completed || 0),
        totalQuestionsAnswered: Number(actualData?.total_questions_answered || 0),
        averageScore: Number(actualData?.average_score || 0),
        totalTimeSpentMinutes: Number(actualData?.total_time_spent_minutes || 0),
        studyStreak: Number(actualData?.study_streak || 0),
        totalPointsEarned: Number(actualData?.total_points_earned || 0),
        totalPossiblePoints: Number(actualData?.total_possible_points || 0),
      };

      developerLog('✅ useUserAnalytics: Transformed analytics data:', transformedData);
      developerLog('🔍 useUserAnalytics: Individual field transformations:', {
        totalQuizzesCompleted: `${actualData?.total_quizzes_completed} -> ${transformedData.totalQuizzesCompleted}`,
        averageScore: `${actualData?.average_score} -> ${transformedData.averageScore}`,
        totalTimeSpentMinutes: `${actualData?.total_time_spent_minutes} -> ${transformedData.totalTimeSpentMinutes}`,
        studyStreak: `${actualData?.study_streak} -> ${transformedData.studyStreak}`
      });
      setData(transformedData);
      
      // // Store the successful request
      // lastFetchRef.current = currentRequest;

    } catch (err: any) {
      console.error('❌ useUserAnalytics: Error fetching user analytics data:', err);
      developerLog('❌ useUserAnalytics: Error details:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint
      });
      setError(err.message || 'Failed to load user analytics data');
      setData(null);
    } finally {
      // isFetchingRef.current = false;
      setLoading(false);
    }
  }, [userId, startDate, endDate, developerLog]);

  useEffect(() => {
    // Add a small delay to prevent rapid successive calls
    const timeoutId = setTimeout(() => {
      fetchUserAnalytics();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [fetchUserAnalytics]);

  return { data, loading, error, refreshData: fetchUserAnalytics };
}