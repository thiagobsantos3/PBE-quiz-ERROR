import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { calculateStudyStreak } from '../utils/quizHelpers';
import { useAuth } from '../contexts/AuthContext';

interface TeamMemberAnalytics {
  userId: string;
  userName: string;
  totalQuizzesCompleted: number;
  totalQuestionsAnswered: number;
  averageScore: number; // Percentage
  totalTimeSpentMinutes: number;
  studyStreak: number;
  totalPointsEarned: number;
  totalPossiblePoints: number;
}

interface UseTeamLeaderboardDataProps {
  teamId: string | undefined;
  startDate?: Date;
  endDate?: Date;
}

export function useTeamLeaderboardData({ teamId, startDate, endDate }: UseTeamLeaderboardDataProps) {
  const { developerLog, invalidateTeamData } = useAuth();
  const [data, setData] = useState<TeamMemberAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamLeaderboardData = useCallback(async () => {
    if (!teamId) {
      developerLog('🔍 useTeamLeaderboardData: No teamId provided, skipping data fetch');
      setLoading(false);
      setData([]);
      return;
    }

    developerLog('🔍 useTeamLeaderboardData: Starting team leaderboard data fetch for team:', teamId, 'with date range:', startDate, endDate);

    setLoading(true);
    setError(null);

    try {
      // Use the secure database function to get team leaderboard data
      developerLog('🔍 useTeamLeaderboardData: Using secure function to fetch team leaderboard data');
      
      let leaderboardData;
      let leaderboardError;
      
      try {
        const result = await supabase
          .rpc('get_team_leaderboard_data', { 
            p_team_id: teamId,
            p_start_date: startDate ? startDate.toISOString() : null,
            p_end_date: endDate ? endDate.toISOString() : null
          });
        
        leaderboardData = result.data;
        leaderboardError = result.error;
      } catch (rpcError: any) {
        developerLog('❌ useTeamLeaderboardData: RPC call failed with error:', rpcError);
        
        // Check if this is a "Team with ID ... does not exist" error
        if (rpcError?.message?.includes('Team with ID') && rpcError?.message?.includes('does not exist')) {
          developerLog('🔄 useTeamLeaderboardData: Team does not exist, refreshing user profile to clear invalid team data');
          try {
            await invalidateTeamData();
            developerLog('✅ useTeamLeaderboardData: Invalid team data cleared');
          } catch (refreshError) {
            developerLog('❌ useTeamLeaderboardData: Failed to invalidate team data:', refreshError);
          }
        }
        
        // Return empty data for any RPC errors
        leaderboardData = [];
        leaderboardError = null;
      }

      if (leaderboardError) {
      }
      let dataArray;
      try {
        if (Array.isArray(leaderboardData)) {
          dataArray = leaderboardData;
        } else if (leaderboardData && typeof leaderboardData === 'object') {
          dataArray = [leaderboardData];
        } else {
          // Handle unexpected scalar values or null/undefined
          dataArray = [];
        }
      } catch (arrayError: any) {
        developerLog('❌ useTeamLeaderboardData: Error processing leaderboard data:', arrayError);
        dataArray = [];
      }
      
      developerLog('✅ useTeamLeaderboardData: Fetched leaderboard data:', dataArray.length, 'members');

      // Transform the data to match our interface
      const transformedData: TeamMemberAnalytics[] = dataArray.map(member => ({
        userId: member.user_id,
        userName: member.user_name,
        role: member.role,
        totalQuizzesCompleted: Number(member.total_quizzes_completed),
        totalQuestionsAnswered: Number(member.total_questions_answered),
        averageScore: Number(member.average_score),
        totalTimeSpentMinutes: Number(member.total_quizzes_completed) === 0 ? 0 : Number(member.total_time_spent_minutes),
        studyStreak: Number(member.study_streak),
        totalPointsEarned: Number(member.total_points_earned),
        totalPossiblePoints: Number(member.total_possible_points),
      }));

      developerLog('✅ useTeamLeaderboardData: Transformed leaderboard data:', transformedData);
      setData(transformedData);

    } catch (err: any) {
      console.error('❌ useTeamLeaderboardData: Error fetching team leaderboard data:', err);
      setError(err.message || 'Failed to load team leaderboard data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [teamId, startDate, endDate, developerLog]);

  useEffect(() => {
    fetchTeamLeaderboardData();
  }, [fetchTeamLeaderboardData]);

  return { data, loading, error, refreshData: fetchTeamLeaderboardData };
}