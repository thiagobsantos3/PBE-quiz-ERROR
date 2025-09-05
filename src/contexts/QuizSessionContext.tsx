import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { QuizSession, QuizSessionContextType } from '../types';
import { useAuth } from './AuthContext';
import { calculateStudyStreak, calculateLongestStudyStreak } from '../utils/quizHelpers';
import { useNotification } from './NotificationContext';
import { checkAndMarkAssignmentCompleted } from '../utils/assignmentUpdates';
import { XP_PER_LEVEL, calculateLevel } from '../constants/gamification';
import { isSameDay, getUtcMidnight } from '../utils/dateUtils';

// Add missing type definition
interface QuizResult {
  questionId: string;
  pointsEarned: number;
  totalPoints: number;
  timeSpent: number;
}

// Assume these types exist based on the new tables the user needs to create
interface UserStats {
  user_id: string;
  total_xp: number;
  current_level: number;
  longest_streak: number;
  last_quiz_date?: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  criteria_type: string;
  criteria_value: number;
  badge_icon_url: string;
}

interface UserAchievement {
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

// Bonus XP for completing study assignments on time
const STUDY_SCHEDULE_BONUS_XP = 10;

const QuizSessionContext = createContext<QuizSessionContextType | undefined>(undefined);

export function QuizSessionProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const { user, developerLog, refreshUser } = useAuth();
  const { showNotification } = useNotification();

  // Load sessions from Supabase when user changes
  useEffect(() => {
    if (user) {
      loadUserSessions();
    } else {
      setSessions([]);
    }
  }, [user]);

  const loadUserSessions = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('quiz_sessions')
        .select('id, title, type, status, total_points, max_points, total_actual_time_spent_seconds, completed_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setSessions(data || []);
    } catch (error) {
      console.error('Error loading quiz sessions:', error);
    }
  }, [user]);

  const createQuizSession = useCallback(async (sessionData: Omit<QuizSession, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    try {
      developerLog('🚀 Creating quiz session...', sessionData);
      
      const { data, error } = await supabase
        .from('quiz_sessions')
        .insert([sessionData])
        .select()
        .single();

      if (error) {
        developerLog('❌ Error creating quiz session:', error);
        throw error;
      }

      developerLog('✅ Quiz session created successfully:', data);

      // Add to local state
      setSessions(prev => [data, ...prev]);
      
      return data.id;
    } catch (error) {
      developerLog('💥 Error creating quiz session:', error);
      throw error;
    }
  }, [user]);

  const loadQuizSession = useCallback((sessionId: string): QuizSession | null => {
    return sessions.find(session => session.id === sessionId) || null;
  }, [sessions]);

  const loadQuizSessionAsync = useCallback(async (sessionId: string): Promise<QuizSession | null> => {
    // First try to find in local state
    const localSession = sessions.find(session => session.id === sessionId);
    if (localSession) {
      developerLog('✅ Found quiz session in local state:', sessionId);
      return localSession;
    }

    // If not found locally, fetch from database
    try {
      developerLog('🔄 Quiz session not found locally, fetching from database:', sessionId);
      
      const { data, error } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user?.id)
        .single();

      if (error) {
        developerLog('❌ Error fetching quiz session from database:', error);
        return null;
      }

      if (!data) {
        developerLog('⚠️ Quiz session not found in database:', sessionId);
        return null;
      }

      developerLog('✅ Quiz session fetched from database:', data);
      
      // Add to local state for future access
      setSessions(prev => [data, ...prev.filter(s => s.id !== sessionId)]);
      
      return data;
    } catch (error) {
      developerLog('💥 Error fetching quiz session:', error);
      return null;
    }
  }, [sessions, user?.id, developerLog]);


  const getActiveSessionsForUser = useCallback((userId: string): QuizSession[] => {
    return sessions.filter(session => 
      session.user_id === userId && session.status === 'active'
    );
  }, [sessions]);

  const getSessionForAssignment = useCallback((assignmentId: string, userId: string): QuizSession | null => {
    return sessions.find(session => 
      session.assignment_id === assignmentId && 
      session.user_id === userId
    ) || null;
  }, [sessions]);

  const deleteQuizSession = useCallback(async (sessionId: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    try {
      developerLog('🗑️ Deleting quiz session using RPC function:', sessionId);
      
      // Use the new RPC function to delete quiz and adjust gamification
      const { data, error } = await supabase.rpc('delete_quiz_and_adjust_gamification', {
        p_quiz_session_id: sessionId,
        p_user_id: user.id
      });

      if (error) {
        developerLog('❌ Error calling delete RPC function:', error);
        throw error;
      }

      if (!data?.success) {
        const errorMessage = data?.error || 'Failed to delete quiz session';
        developerLog('❌ RPC function returned error:', errorMessage);
        throw new Error(errorMessage);
      }

      developerLog('✅ Quiz session deleted successfully via RPC');

      // Remove from local state
      setSessions(prev => prev.filter(session => session.id !== sessionId));
      
      // Refresh user data to update gamification stats on frontend
      try {
        await refreshUser();
        developerLog('✅ User data refreshed after quiz deletion');
      } catch (refreshError) {
        developerLog('⚠️ Could not refresh user data after deletion:', refreshError);
        // Don't throw here as the deletion was successful
      }
      
    } catch (error) {
      developerLog('💥 Error deleting quiz session:', error);
      throw error;
    }
  }, [user, developerLog, refreshUser]);

  // Helper to calculate total points from results array
  const calculateTotalPointsFromResults = (results: QuizResult[]): number => {
    if (!results || !Array.isArray(results)) return 0;
    return results.reduce((sum, result) => sum + (Number(result.pointsEarned) || 0), 0);
  };

  // Helper to calculate total time spent from results array
  const calculateTotalTimeSpentFromResults = (results: QuizResult[]): number => {
    if (!results || !Array.isArray(results)) return 0;
    return results.reduce((sum, result) => sum + (Number(result.timeSpent) || 0), 0);
  };

  // Helper to calculate bonus XP for on-time assignment completion
  const calculateBonusXp = async (session: QuizSession): Promise<number> => {
    if (!session.assignment_id) return 0;

    try {
      developerLog('📅 Checking for on-time completion bonus for assignment:', session.assignment_id);
      
      const { data: assignment, error: assignmentError } = await supabase
        .from('study_assignments')
        .select('date')
        .eq('id', session.assignment_id)
        .single();
      
      if (assignmentError || !assignment) {
        developerLog('⚠️ Could not fetch assignment date for bonus XP check:', assignmentError);
        return 0;
      }

      const assignmentDate = new Date(assignment.date);
      const completedDate = new Date(session.completed_at || new Date());
      
      if (isSameDay(assignmentDate, completedDate)) {
        developerLog('🎉 On-time completion bonus earned:', STUDY_SCHEDULE_BONUS_XP, 'XP');
        return STUDY_SCHEDULE_BONUS_XP;
      } else {
        developerLog('📅 Assignment completed on different day - no bonus XP');
        return 0;
      }
    } catch (error) {
      developerLog('💥 Error checking for bonus XP:', error);
      return 0;
    }
  };

  // Helper to update user stats with proper transaction handling
  const updateUserStats = async (pointsEarned: number, bonusXp: number): Promise<void> => {
    if (!user) return;

    try {
      // Get current user stats
      const { data: currentUserStats, error: statsError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (statsError) throw statsError;

      developerLog('📊 Current user stats from database:', currentUserStats);

      // Recalculate total XP from ALL completed quiz sessions to ensure accuracy
      const { data: allCompletedSessions, error: allSessionsError } = await supabase
        .from('quiz_sessions')
        .select('total_points')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      if (allSessionsError) throw allSessionsError;

      // Calculate total XP from all completed sessions plus bonus XP
      const totalXpFromAllSessions = (allCompletedSessions || []).reduce((sum, session) => {
        return sum + (Number(session.total_points) || 0);
      }, 0);

      const newTotalXp = totalXpFromAllSessions + bonusXp;
      
      developerLog('🔍 XP recalculation from all sessions:', {
        allCompletedSessionsCount: allCompletedSessions?.length || 0,
        totalXpFromAllSessions,
        bonusXp,
        finalNewTotalXp: newTotalXp,
        previousTotalXp: currentUserStats?.total_xp || 0
      });

      // Calculate new level
      const newCurrentLevel = calculateLevel(newTotalXp);

      // Recalculate study streak
      const { data: allCompletedSessionsForStreak, error: sessionsError } = await supabase
        .from('quiz_sessions')
        .select('completed_at')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      const currentStudyStreak = calculateStudyStreak(allCompletedSessionsForStreak || []);
      const trueHistoricalLongestStreak = calculateLongestStudyStreak(allCompletedSessionsForStreak || []);

      developerLog('📈 Streak calculation:', {
        currentStudyStreak,
        trueHistoricalLongestStreak,
        previousLongestStreak: currentUserStats?.longest_streak || 0
      });

      // Prepare stats to upsert
      const statsToUpsert = {
        user_id: user.id,
        total_xp: newTotalXp,
        current_level: newCurrentLevel,
        longest_streak: trueHistoricalLongestStreak,
        last_quiz_date: new Date().toISOString().split('T')[0],
      };

      developerLog('💾 About to upsert user stats:', statsToUpsert);

      // Update user stats
      const { error: upsertStatsError } = await supabase
        .from('user_stats')
        .upsert(statsToUpsert, { onConflict: 'user_id' });

      if (upsertStatsError) throw upsertStatsError;

      developerLog('✅ User stats successfully updated:', statsToUpsert);

    } catch (error) {
      developerLog('💥 Error updating user stats:', error);
      throw error;
    }
  };

  // Helper to check and unlock achievements
  const checkAchievements = async (): Promise<void> => {
    if (!user) return;

    try {
      // Get all achievements
      const { data: allAchievements, error: achievementsError } = await supabase
        .from('achievements')
        .select('*');

      if (achievementsError) throw achievementsError;

      // Get user's unlocked achievements
      const { data: userUnlockedAchievements, error: userAchievementsError } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', user.id);

      if (userAchievementsError) throw userAchievementsError;

      const unlockedAchievementIds = new Set(userUnlockedAchievements?.map(ua => ua.achievement_id) || []);

      // Check each achievement
      for (const achievement of allAchievements || []) {
        if (unlockedAchievementIds.has(achievement.id)) continue;

        let criteriaMet = false;

        switch (achievement.criteria_type) {
          case 'total_quizzes_completed':
            const { count: totalQuizzesCount, error: countError } = await supabase
              .from('quiz_sessions')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('status', 'completed');

            if (countError) throw countError;
            criteriaMet = (totalQuizzesCount || 0) >= achievement.criteria_value;
            break;

          case 'total_points_earned':
            const { data: userStats, error: statsError } = await supabase
              .from('user_stats')
              .select('total_xp')
              .eq('user_id', user.id)
              .single();

            if (!statsError && userStats) {
              criteriaMet = userStats.total_xp >= achievement.criteria_value;
            }
            break;

          case 'longest_streak':
            const { data: streakStats, error: streakError } = await supabase
              .from('user_stats')
              .select('longest_streak')
              .eq('user_id', user.id)
              .single();

            if (!streakError && streakStats) {
              criteriaMet = streakStats.longest_streak >= achievement.criteria_value;
            }
            break;

          default:
            developerLog('⚠️ Unknown achievement criteria type:', achievement.criteria_type);
            break;
        }

        if (criteriaMet) {
          // Unlock achievement
          const { error: insertError } = await supabase
            .from('user_achievements')
            .insert({
              user_id: user.id,
              achievement_id: achievement.id,
              unlocked_at: new Date().toISOString()
            });

          if (insertError) {
            developerLog('❌ Error unlocking achievement:', insertError);
            continue;
          }

          developerLog('🏆 Achievement unlocked:', achievement.name);
          showNotification('achievement', achievement);
        }
      }
    } catch (error) {
      developerLog('💥 Error checking achievements:', error);
      // Don't throw here to avoid disrupting the main flow
    }
  };

  const updateQuizSession = useCallback(async (sessionId: string, updates: Partial<QuizSession>): Promise<void> => {
    // Input validation
    if (!sessionId) throw new Error('Session ID is required');
    if (!updates) throw new Error('Updates object is required');
    if (!user) throw new Error('User not authenticated');

    try {
      developerLog('🔄 Updating quiz session:', sessionId, 'with updates:', updates);
      
      // Get current session data
      const currentSession = sessions.find(s => s.id === sessionId);
      if (!currentSession) {
        throw new Error(`Session with ID ${sessionId} not found`);
      }

      // Prepare final updates object
      let finalUpdates = { ...updates };

      // If results are updated, recalculate derived values
      if (updates.results) {
        const calculatedTotalPoints = calculateTotalPointsFromResults(updates.results);
        const calculatedTimeSpent = calculateTotalTimeSpentFromResults(updates.results);
        
        finalUpdates.total_points = calculatedTotalPoints;
        finalUpdates.total_actual_time_spent_seconds = calculatedTimeSpent;
        
        developerLog('🔄 Recalculated derived values:', {
          calculatedTotalPoints,
          calculatedTimeSpent,
          resultsCount: updates.results.length
        });
      }

      // Handle completion logic
      if (updates.status === 'completed') {
        developerLog('🎯 Quiz session being marked as completed');

        // Calculate bonus XP if applicable
        let bonusXp = 0;
        if (currentSession.assignment_id) {
          bonusXp = await calculateBonusXp({
            ...currentSession,
            completed_at: finalUpdates.completed_at || new Date().toISOString()
          });
          
          if (bonusXp > 0) {
            finalUpdates.bonus_xp = bonusXp;
            
            // Show bonus XP notification
            showNotification('achievement', {
              id: 'bonus-xp',
              name: 'On-Time Completion Bonus!',
              description: `You earned ${STUDY_SCHEDULE_BONUS_XP} bonus XP for completing your study assignment on time!`,
              criteria_type: 'bonus_xp',
              criteria_value: STUDY_SCHEDULE_BONUS_XP,
              badge_icon_url: '/images/badges/perfect.png'
            });
          }
        }

        // Update the quiz session in database first
        const { error: updateError } = await supabase
          .from('quiz_sessions')
          .update(finalUpdates)
          .eq('id', sessionId);

        if (updateError) {
          developerLog('❌ Error updating quiz session:', updateError);
          throw updateError;
        }

        developerLog('✅ Quiz session updated successfully');

        // Handle assignment completion
        if (currentSession.assignment_id) {
          try {
            developerLog('📚 Marking assignment as completed:', currentSession.assignment_id);
            await checkAndMarkAssignmentCompleted(currentSession.assignment_id);
            developerLog('✅ Assignment marked as completed');
          } catch (error) {
            developerLog('❌ Failed to mark assignment as completed:', error);
            // Don't throw here to avoid disrupting the quiz completion flow
          }
        }

        // Update server-side user stats via triggers; do a non-blocking refresh
        try {
          // Defer refresh slightly and never throw here to avoid breaking confirmation view
          setTimeout(async () => {
            try {
              await refreshUser();
              developerLog('✅ Post-completion: user stats refreshed');
            } catch (e) {
              developerLog('⚠️ Post-completion: user stats refresh failed (non-blocking):', e);
            }
          }, 400);
          await checkAchievements();
          
        } catch (error) {
          developerLog('❌ Error in gamification updates:', error);
          // Log but don't throw to avoid breaking the main flow
        }

      } else {
        // For non-completion updates, just update the session
        const { error: updateError } = await supabase
          .from('quiz_sessions')
          .update(finalUpdates)
          .eq('id', sessionId);

        if (updateError) {
          developerLog('❌ Error updating quiz session:', updateError);
          throw updateError;
        }
      }

      // Update local state
      setSessions(prev => prev.map(session => 
        session.id === sessionId ? { ...session, ...finalUpdates } : session
      ));

      developerLog('✅ Quiz session update completed successfully');

    } catch (error) {
      developerLog('💥 Error in updateQuizSession:', error);
      throw error;
    }
  }, [user, sessions, developerLog, showNotification]);

  const updateQuizApprovalStatus = useCallback(async (sessionId: string, status: 'approved' | 'rejected'): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    if (!sessionId) throw new Error('Session ID is required');

    try {
      developerLog('🔄 Updating quiz approval status:', sessionId, 'to:', status);

      const { error } = await supabase
        .from('quiz_sessions')
        .update({ approval_status: status, updated_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) {
        developerLog('❌ Error updating quiz approval status:', error);
        throw error;
      }

      setSessions(prev => prev.map(session =>
        session.id === sessionId ? { ...session, approval_status: status } : session
      ));

      developerLog('✅ Quiz approval status updated successfully');
    } catch (error) {
      developerLog('💥 Error in updateQuizApprovalStatus:', error);
      throw error;
    }
  }, [user, developerLog]);

  const value = {
    sessions,
    createQuizSession,
    updateQuizSession,
    loadQuizSession,
    loadQuizSessionAsync,
    loadUserSessions,
    getActiveSessionsForUser,
    getSessionForAssignment,
    deleteQuizSession,
    updateQuizApprovalStatus
  };

  return (
    <QuizSessionContext.Provider value={value}>
      {children}
    </QuizSessionContext.Provider>
  );
}

export function useQuizSession() {
  const context = useContext(QuizSessionContext);
  if (context === undefined) {
    throw new Error('useQuizSession must be used within a QuizSessionProvider');
  }
  return context;
}