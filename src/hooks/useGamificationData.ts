import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { calculateCurrentStudyStreak, calculateLongestStudyStreak } from '../utils/quizHelpers';
import { UserStats, Achievement, UserAchievement } from '../types';

interface UseGamificationDataResult {
  userStats: UserStats | null;
  userAchievements: UserAchievement[];
  achievements: Achievement[];
  loading: boolean;
  error: string | null;
  refreshGamificationData: () => void;
  createAchievement: (achievementData: Omit<Achievement, 'id'>) => Promise<Achievement>;
  updateAchievement: (id: string, achievementData: Partial<Achievement>) => Promise<Achievement>;
  deleteAchievement: (id: string) => Promise<void>;
}

export function useGamificationData(): UseGamificationDataResult {
  const { user, developerLog } = useAuth();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGamificationData = useCallback(async () => {
    if (!user) {
      developerLog('🔍 useGamificationData: No user authenticated, skipping data fetch');
      setUserStats(null);
      setUserAchievements([]);
      setAchievements([]);
      setLoading(false);
      return;
    }

    developerLog('🔍 useGamificationData: Starting gamification data fetch for user:', user.id);
    setLoading(true);
    setError(null);

    try {
      // Fetch user stats
      const { data: statsData, error: statsError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (statsError) throw statsError;
      developerLog('✅ useGamificationData: User stats fetched (raw):', statsData);

      // Fetch all completed quiz sessions for the user to calculate current streak
      const { data: completedSessions, error: sessionsError } = await supabase
        .from('quiz_sessions')
        .select('completed_at')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      const currentStreak = calculateCurrentStudyStreak(completedSessions || []);
      const longestStreakComputed = calculateLongestStudyStreak(completedSessions || []);
      developerLog('✅ useGamificationData: Calculated streaks:', { currentStreak, longestStreakComputed });

      // Combine fetched stats with calculated current streak
      const finalUserStats: UserStats = {
        ...(statsData || { user_id: user.id, total_xp: 0, current_level: 1, longest_streak: 0 }),
        // Ensure longest_streak reflects reality even if DB hasn't been updated yet
        longest_streak: Math.max(statsData?.longest_streak || 0, longestStreakComputed || 0),
        current_streak: currentStreak,
      };
      setUserStats(finalUserStats);
      developerLog('✅ useGamificationData: Final user stats:', finalUserStats);

      // Fetch user achievements
      const { data: userAchievementsData, error: userAchievementsError } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id);

      if (userAchievementsError) throw userAchievementsError;
      setUserAchievements(userAchievementsData || []);
      developerLog('✅ useGamificationData: User achievements fetched:', userAchievementsData?.length || 0);

      // Fetch all achievements (for display purposes, e.g., showing locked achievements)
      const { data: allAchievementsData, error: allAchievementsError } = await supabase
        .from('achievements')
        .select('*');

      if (allAchievementsError) throw allAchievementsError;
      setAchievements(allAchievementsData || []);
      developerLog('✅ useGamificationData: All achievements fetched:', allAchievementsData?.length || 0);

    } catch (err: any) {
      console.error('💥 useGamificationData: Error fetching gamification data:', err);
      setError(err.message || 'Failed to load gamification data');
      setUserStats(null);
      setUserAchievements([]);
      setAchievements([]);
    } finally {
      setLoading(false);
    }
  }, [user, developerLog]);

  const createAchievement = useCallback(async (achievementData: Omit<Achievement, 'id'>) => {
    try {
      developerLog('📝 Creating new achievement...');
      
      const { data, error } = await supabase
        .from('achievements')
        .insert([achievementData])
        .select()
        .single();

      if (error) {
        developerLog('❌ Error creating achievement:', error);
        throw error;
      }

      developerLog('✅ Achievement created successfully:', data);
      setAchievements(prev => [...prev, data]);
      return data;
    } catch (error) {
      developerLog('💥 Error creating achievement:', error);
      throw error;
    }
  }, [developerLog]);

  const updateAchievement = useCallback(async (id: string, achievementData: Partial<Achievement>) => {
    try {
      developerLog('📝 Updating achievement:', id);
      
      const { data, error } = await supabase
        .from('achievements')
        .update(achievementData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        developerLog('❌ Error updating achievement:', error);
        throw error;
      }

      developerLog('✅ Achievement updated successfully:', data);
      setAchievements(prev => prev.map(a => a.id === id ? data : a));
      return data;
    } catch (error) {
      developerLog('💥 Error updating achievement:', error);
      throw error;
    }
  }, [developerLog]);

  const deleteAchievement = useCallback(async (id: string) => {
    try {
      developerLog('🗑️ Deleting achievement:', id);
      
      const { error } = await supabase
        .from('achievements')
        .delete()
        .eq('id', id);

      if (error) {
        developerLog('❌ Error deleting achievement:', error);
        throw error;
      }

      developerLog('✅ Achievement deleted successfully');
      setAchievements(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      developerLog('💥 Error deleting achievement:', error);
      throw error;
    }
  }, [developerLog]);
  useEffect(() => {
    fetchGamificationData();
  }, [fetchGamificationData]);

  return {
    userStats,
    userAchievements,
    achievements,
    loading,
    error,
    refreshGamificationData: fetchGamificationData,
    createAchievement,
    updateAchievement,
    deleteAchievement,
  };
}