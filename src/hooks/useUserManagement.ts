import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive' | 'suspended';
  subscription: string;
  joinDate: string;
  lastActive: string;
  teamId?: string;
  teamRole?: 'owner' | 'admin' | 'member';
  teamName?: string;
}

interface TeamData {
  id: string;
  name: string;
  memberCount: number;
}

export function useUserManagement() {
  const { developerLog } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      developerLog('👥 Loading users for admin panel...');

      // Load user profiles with team and subscription data
      const { data: userProfiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select(`
          id,
          name,
          email,
          role,
          team_id,
          team_role,
          created_at,
          teams:team_id (
            id,
            name
          )
        `);

      if (profilesError) {
        console.error('❌ Error loading user profiles:', profilesError);
        throw profilesError;
      }

      // Load subscriptions
      const { data: subscriptions, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select('user_id, plan, status, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (subscriptionsError) {
        console.error('❌ Error loading subscriptions:', subscriptionsError);
        // Continue without subscription data
      }

      // Create a map of subscriptions by user ID (most recent active subscription per user)
      const subscriptionsMap = new Map();
      (subscriptions || []).forEach(sub => {
        // Only set if we don't already have a subscription for this user
        // (since we ordered by created_at desc, the first one is the most recent)
        if (!subscriptionsMap.has(sub.user_id)) {
          subscriptionsMap.set(sub.user_id, sub);
        }
      });

      // Load team members to get status
      const { data: teamMembers, error: membersError } = await supabase
        .from('team_members')
        .select('user_id, status');

      if (membersError) {
        console.error('❌ Error loading team members:', membersError);
        // Continue without team member status
      }

      // Create a map of team member status by user ID
      const teamMembersMap = new Map(
        (teamMembers || []).map(tm => [tm.user_id, tm])
      );

      // Transform the data
      const transformedUsers: UserData[] = (userProfiles || []).map(profile => {
        const subscription = subscriptionsMap.get(profile.id);
        const teamMember = teamMembersMap.get(profile.id);

        return {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
          status: teamMember?.status || 'active',
          subscription: subscription?.plan || 'free',
          joinDate: profile.created_at,
          lastActive: 'Recently', // Placeholder - would need activity tracking
          teamId: profile.team_id,
          teamRole: profile.team_role,
          teamName: profile.teams?.name,
        };
      });

      developerLog('✅ Users loaded successfully:', transformedUsers.length);
      setUsers(transformedUsers);

    } catch (error) {
      console.error('💥 Error loading users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [developerLog]);

  const loadTeams = useCallback(async () => {
    try {
      developerLog('🏢 Loading teams for admin panel...');

      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, member_count');

      if (teamsError) {
        console.error('❌ Error loading teams:', teamsError);
        throw teamsError;
      }

      const transformedTeams: TeamData[] = (teamsData || []).map(team => ({
        id: team.id,
        name: team.name,
        memberCount: team.member_count,
      }));

      developerLog('✅ Teams loaded successfully:', transformedTeams.length);
      setTeams(transformedTeams);

    } catch (error) {
      console.error('💥 Error loading teams:', error);
      // Don't set error here as users might have loaded successfully
    }
  }, [developerLog]);

  const loadAllData = useCallback(async () => {
    await Promise.all([
      loadUsers(),
      loadTeams()
    ]);
  }, [loadUsers, loadTeams]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  return {
    users,
    teams,
    loading,
    error,
    refreshData: loadAllData,
  };
}