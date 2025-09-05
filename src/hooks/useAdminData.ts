import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface AdminStats {
  totalUsers: number;
  freeUsers: number;
  proUsers: number;
  enterpriseUsers: number;
  totalTeams: number;
  newUsersLast30Days: number;
  newUsersPrev30Days: number;
  subscriptionsCancelledLast30Days: number;
  activeUsers: number;
  activeTeams: number;
}

interface RecentActivity {
  id: number;
  type: string;
  message: string;
  timestamp: string;
  severity: 'info' | 'success' | 'warning' | 'error';
}

export function useAdminData() {
  const { developerLog } = useAuth();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    freeUsers: 0,
    proUsers: 0,
    enterpriseUsers: 0,
    totalTeams: 0,
    newUsersLast30Days: 0,
    newUsersPrev30Days: 0,
    subscriptionsCancelledLast30Days: 0,
    activeUsers: 0,
    activeTeams: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAdminStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      developerLog('📊 Loading admin statistics...');

      // Calculate date ranges
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Load user statistics
      const { data: userProfiles, error: userError } = await supabase
        .from('user_profiles')
        .select('id, created_at');

      if (userError) {
        console.error('❌ Error loading user profiles:', userError);
        throw userError;
      }

      // Load subscription statistics
      const { data: subscriptions, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('user_id, plan, status, cancelled_at, created_at')
        .order('created_at', { ascending: false });

      if (subscriptionError) {
        console.error('❌ Error loading subscriptions:', subscriptionError);
        throw subscriptionError;
      }

      // Load team statistics
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, created_at');

      if (teamsError) {
        console.error('❌ Error loading teams:', teamsError);
        throw teamsError;
      }

      // Load team members for active team calculation
      const { data: teamMembers, error: membersError } = await supabase
        .from('team_members')
        .select('team_id, status, joined_at')
        .eq('status', 'active');

      if (membersError) {
        console.error('❌ Error loading team members:', membersError);
        throw membersError;
      }

      // Get the most recent active subscription per user
      const activeSubscriptionsMap = new Map();
      const allSubscriptionsMap = new Map();
      
      (subscriptions || []).forEach(sub => {
        // Track all subscriptions for cancellation stats
        if (!allSubscriptionsMap.has(sub.user_id)) {
          allSubscriptionsMap.set(sub.user_id, []);
        }
        allSubscriptionsMap.get(sub.user_id).push(sub);
        
        // Track most recent active subscription per user
        if (sub.status === 'active' && !activeSubscriptionsMap.has(sub.user_id)) {
          activeSubscriptionsMap.set(sub.user_id, sub);
        }
      });
      
      const activeSubscriptions = Array.from(activeSubscriptionsMap.values());
      const totalUsers = userProfiles?.length || 0;
      
      // Subscription breakdown
      const freeUsers = activeSubscriptions.filter(s => s.plan === 'free').length;
      const proUsers = activeSubscriptions.filter(s => s.plan === 'pro').length;
      const enterpriseUsers = activeSubscriptions.filter(s => s.plan === 'enterprise').length;

      // New users calculation
      const newUsersLast30Days = userProfiles?.filter(u => 
        new Date(u.created_at) >= thirtyDaysAgo
      ).length || 0;
      
      const newUsersPrev30Days = userProfiles?.filter(u => {
        const createdAt = new Date(u.created_at);
        return createdAt >= sixtyDaysAgo && createdAt < thirtyDaysAgo;
      }).length || 0;

      // Cancelled subscriptions in last 30 days
      const subscriptionsCancelledLast30Days = (subscriptions || []).filter(s => 
        s.cancelled_at && new Date(s.cancelled_at) >= thirtyDaysAgo
      ).length;

      // Active users (users with active subscriptions)
      const activeUsers = activeSubscriptions.length;

      // Active teams (teams with at least one active member)
      const activeTeamIds = new Set(teamMembers?.map(tm => tm.team_id) || []);
      const activeTeams = activeTeamIds.size;

      const calculatedStats: AdminStats = {
        totalUsers,
        freeUsers,
        proUsers,
        enterpriseUsers,
        totalTeams: teams?.length || 0,
        newUsersLast30Days,
        newUsersPrev30Days,
        subscriptionsCancelledLast30Days,
        activeUsers,
        activeTeams,
      };

      developerLog('✅ Admin statistics calculated:', calculatedStats);
      setStats(calculatedStats);

      // Generate some mock recent activities based on real data
      const activities: RecentActivity[] = [
        {
          id: 1,
          type: 'user_signup',
          message: `${newUsersLast30Days} new users registered in the last 30 days`,
          timestamp: '2 hours ago',
          severity: 'info',
        },
        {
          id: 2,
          type: 'subscription',
          message: `${proUsers + enterpriseUsers} users have active paid subscriptions`,
          timestamp: '4 hours ago',
          severity: 'success',
        },
        {
          id: 3,
          type: 'teams',
          message: `${activeTeams} teams are currently active`,
          timestamp: '6 hours ago',
          severity: 'info',
        },
        {
          id: 4,
          type: 'cancellation',
          message: `${subscriptionsCancelledLast30Days} subscription cancellations in the last 30 days`,
          timestamp: '8 hours ago',
          severity: subscriptionsCancelledLast30Days > 5 ? 'warning' : 'info',
        },
      ];

      setRecentActivities(activities);

    } catch (error) {
      console.error('💥 Error loading admin statistics:', error);
      setError('Failed to load admin statistics');
    } finally {
      setLoading(false);
    }
  }, [developerLog]);

  useEffect(() => {
    loadAdminStats();
  }, [loadAdminStats]);

  return {
    stats,
    recentActivities,
    loading,
    error,
    refreshStats: loadAdminStats,
  };
}