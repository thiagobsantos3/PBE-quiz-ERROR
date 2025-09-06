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
      // Fetch recent session summaries (lightweight)
      const { data: summaries, error: summariesError } = await supabase
        .from('quiz_sessions')
        .select('id, title, type, status, total_points, max_points, total_actual_time_spent_seconds, completed_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (summariesError) throw summariesError;

      // Fetch full details for active sessions to power the Resume UI
      const { data: activeDetails, error: activeError } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (activeError) throw activeError;

      // Merge: start with summaries, then overlay active session details
      setSessions(prev => {
        const previousById = new Map(prev.map(s => [s.id, s]));
        const mergedSummaries = (summaries || []).map(s => {
          const existing = previousById.get(s.id);
          return existing ? { ...existing, ...s } : (s as any);
        });
        const mergedById = new Map(mergedSummaries.map(s => [s.id, s]));
        (activeDetails || []).forEach(detailed => {
          const existing = mergedById.get(detailed.id) || previousById.get(detailed.id);
          mergedById.set(detailed.id, existing ? { ...existing, ...detailed } : detailed);
        });
        // Ensure any currently active sessions not in the fetched window are preserved
        const preservedActive = prev.filter(s => s.status === 'active' && !mergedById.has(s.id));
        return [...preservedActive, ...Array.from(mergedById.values())];
      });
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
      // Detect partial/local summary objects (e.g., after list refresh) and refetch full details
      const isPartial = !Array.isArray((localSession as any).questions) || (localSession as any).questions.length === 0;
      if (isPartial) {
        developerLog('ℹ️ Local session is partial, refetching full data from database:', sessionId);
      } else {
        developerLog('✅ Found full quiz session in local state:', sessionId);
        return localSession;
      }
    }

    // If not found locally or partial, fetch from database
    try {
      developerLog('🔄 Fetching quiz session from database:', sessionId);
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

      // Merge into local state, preserving any existing fields if present
      setSessions(prev => {
        const exists = prev.find(s => s.id === sessionId);
        if (exists) {
          return prev.map(s => (s.id === sessionId ? { ...s, ...data } : s));
        }
        return [data, ...prev];
      });

      return data as any;
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

        // Ensure actual time is recorded using authoritative logs as fallback
        try {
          const { data: timeAgg, error: timeErr } = await supabase
            .from('quiz_question_logs')
            .select('time_spent, is_correct, show_answer_used, total_points_possible, question_id, answered_at')
            .eq('quiz_session_id', sessionId);

          if (!timeErr && Array.isArray(timeAgg)) {
            const sumSeconds = timeAgg.reduce((sum: number, r: any) => sum + (Number(r?.time_spent) || 0), 0);
            const currentSeconds = Number(finalUpdates.total_actual_time_spent_seconds) || 0;
            if (sumSeconds > 0 && sumSeconds !== currentSeconds) {
              developerLog('⏱ Updating total_actual_time_spent_seconds from logs sum:', { sumSeconds, currentSeconds });
              const { error: setTimeErr } = await supabase
                .from('quiz_sessions')
                .update({ total_actual_time_spent_seconds: sumSeconds })
                .eq('id', sessionId);
              if (!setTimeErr) {
                // Also reflect in local state immediately
                finalUpdates.total_actual_time_spent_seconds = sumSeconds;
              }
            }

            // Enrich with question metadata
            const questionsArray: any[] = Array.isArray((currentSession as any).questions) ? (currentSession as any).questions : [];
            const questionById = new Map<string, any>((questionsArray || []).map((q: any) => [q?.id, q]));
            const normalizeText = (s: any): string => typeof s === 'string' ? s : '';
            const countWords = (s: string): number => {
              const trimmed = s.trim();
              if (!trimmed) return 0;
              const parts = trimmed.split(/\s+/);
              return parts.filter(Boolean).length;
            };

            // Sort logs by answered_at when available to compute windows and streaks
            const logs = [...timeAgg].sort((a: any, b: any) => {
              const ta = a?.answered_at ? new Date(a.answered_at).getTime() : 0;
              const tb = b?.answered_at ? new Date(b.answered_at).getTime() : 0;
              return ta - tb;
            });

            const total = Math.max(1, logs.length);
            let countFastCorrect = 0;
            let countUltraFast = 0;
            let countZeroOne = 0;
            let countShowAnswerFast = 0;
            let countHighPointUltraFast = 0;
            let countWordyUltraFast = 0;
            let countTimeRatioLow = 0;

            let numFast2OrLess = 0;
            let numFast2OrLessCorrect = 0;

            let maxConsecutiveFast2OrLess = 0;
            let currentStreakFast2OrLess = 0;

            // Sliding window checks
            const windowSize = 10;
            let flagWindowManyFast3OrLess = false;
            let flagWindowManyHighValueFast = false;

            const perLog: { time: number; correct: boolean; pts: number }[] = [];

            for (const r of logs as any[]) {
              const pts = Number(r?.total_points_possible) || 1;
              const time = Number(r?.time_spent) || 0;
              const correct = !!r?.is_correct;
              const showAns = !!r?.show_answer_used;
              const qId = r?.question_id as string | undefined;
              const qMeta = qId ? questionById.get(qId) : undefined;
              const qText = normalizeText(qMeta?.question);
              const aText = normalizeText(qMeta?.answer);
              const qWords = countWords(qText);
              const aWords = countWords(aText);

              const tmin = Math.max(2, 2 * pts);
              const expected = tmin + 0.2 * (qWords + aWords);

              const fastCorrect = correct && time > 0 && time < tmin;
              const ultraFastCorrect = correct && time <= 2;
              const zeroOneCorrect = correct && time <= 1;
              const showAnswerFast = showAns && correct && time <= 2;
              const highPointUltraFast = correct && pts >= 4 && time <= 3;
              const wordyUltraFast = correct && (qWords + aWords) >= 14 && time <= 2;
              const timeRatioLow = correct && expected > 0 && (time / expected) <= 0.3;

              if (fastCorrect) countFastCorrect++;
              if (ultraFastCorrect) countUltraFast++;
              if (zeroOneCorrect) countZeroOne++;
              if (showAnswerFast) countShowAnswerFast++;
              if (highPointUltraFast) countHighPointUltraFast++;
              if (wordyUltraFast) countWordyUltraFast++;
              if (timeRatioLow) countTimeRatioLow++;

              if (time <= 2) {
                numFast2OrLess++;
                if (correct) numFast2OrLessCorrect++;
                currentStreakFast2OrLess += 1;
              } else {
                currentStreakFast2OrLess = 0;
              }
              if (currentStreakFast2OrLess > maxConsecutiveFast2OrLess) {
                maxConsecutiveFast2OrLess = currentStreakFast2OrLess;
              }

              perLog.push({ time, correct, pts });
            }

            // Window scans for density patterns
            for (let i = 0; i < perLog.length; i++) {
              const j = Math.min(perLog.length, i + windowSize);
              const window = perLog.slice(i, j);
              if (window.length === 0) continue;
              const fast3OrLessCount = window.filter(x => x.time <= 3).length;
              if (fast3OrLessCount >= 8) {
                flagWindowManyFast3OrLess = true;
              }
              const highValueFastCount = window.filter(x => x.pts >= 6 && x.time <= 3).length;
              if (highValueFastCount >= 3) {
                flagWindowManyHighValueFast = true;
              }
              if (flagWindowManyFast3OrLess && flagWindowManyHighValueFast) break;
            }

            const fastCorrectRate = countFastCorrect / total;
            const ultraFastRate = countUltraFast / total;
            const zeroOneRate = countZeroOne / total;
            const showAnswerFastRate = countShowAnswerFast / total;
            const highPointUltraFastRate = countHighPointUltraFast / total;
            const wordyUltraFastRate = countWordyUltraFast / total;
            const timeRatioLowRate = countTimeRatioLow / total;

            const fast2Share = numFast2OrLess / total;
            const fast2Accuracy = numFast2OrLess > 0 ? (numFast2OrLessCorrect / numFast2OrLess) : 0;
            const speedAccuracyFlag = (fast2Share >= 0.3 && fast2Accuracy >= 0.9) ? 1 : 0;

            const streakOrBlockFlag = (maxConsecutiveFast2OrLess >= 5 || flagWindowManyFast3OrLess || flagWindowManyHighValueFast) ? 1 : 0;

            let score = 0.30 * wordyUltraFastRate
                      + 0.25 * highPointUltraFastRate
                      + 0.20 * timeRatioLowRate
                      + 0.15 * speedAccuracyFlag
                      + 0.10 * streakOrBlockFlag;
            if (score > 1) score = 1;
            const status = score >= 0.25 ? 'red' : score >= 0.15 ? 'amber' : 'green';

            const summary = {
              fastCorrectRate: Number(fastCorrectRate.toFixed(3)),
              ultraFastRate: Number(ultraFastRate.toFixed(3)),
              zeroOneRate: Number(zeroOneRate.toFixed(3)),
              showAnswerFastRate: Number(showAnswerFastRate.toFixed(3)),
              highPointUltraFastRate: Number(highPointUltraFastRate.toFixed(3)),
              wordyUltraFastRate: Number(wordyUltraFastRate.toFixed(3)),
              timeRatioLowRate: Number(timeRatioLowRate.toFixed(3)),
              fast2Share: Number(fast2Share.toFixed(3)),
              fast2Accuracy: Number(fast2Accuracy.toFixed(3)),
              maxConsecutiveFast2OrLess: maxConsecutiveFast2OrLess,
              windowFast3OrLessDense: flagWindowManyFast3OrLess,
              windowHighValueFastDense: flagWindowManyHighValueFast,
              totalQuestions: total
            };

            const sessionUpdates: any = {
              suspicion_status: status,
              suspicion_score: Number(score.toFixed(3)),
              suspicious_summary: summary,
            };
            // Optional auto-review: set red sessions to pending
            // sessionUpdates.approval_status = status === 'red' ? 'pending' : undefined;

            const { error: suspErr } = await supabase
              .from('quiz_sessions')
              .update(sessionUpdates)
              .eq('id', sessionId);
            if (!suspErr) {
              finalUpdates.suspicion_status = sessionUpdates.suspicion_status;
              finalUpdates.suspicion_score = sessionUpdates.suspicion_score;
              finalUpdates.suspicious_summary = sessionUpdates.suspicious_summary;
            }
          }
        } catch (tErr) {
          developerLog('⚠️ Could not ensure actual time from logs (non-blocking):', tErr);
        }

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