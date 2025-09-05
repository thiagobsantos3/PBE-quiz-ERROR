import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { TeamMember, TeamInvitation } from '../types';
import { canViewTeamMemberDetails } from '../utils/permissions';
import { getRoleIcon } from '../utils/displayUtils';

export function useTeamManagement() {
  const { user, logout, developerLog } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamInvitations, setTeamInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to check if current user can view team member details
  const canViewDetails = useCallback(() => {
    return canViewTeamMemberDetails(user);
  }, [user]);

  // Helper function to fetch team member details
  const fetchTeamMemberDetails = useCallback(async (
    memberId: string, 
    teamId: string, 
    currentUser: any, 
    canViewDetails: boolean
  ): Promise<TeamMember['user']> => {
    developerLog('🔍 Processing member:', {
      memberId: memberId,
      userId: memberId,
      canViewDetails
    });

    try {
      // Try to use the secure function for team member profiles
      const { data: profileResult, error: funcError } = await supabase
        .rpc('get_team_member_profile', {
          p_user_id: memberId,
          p_team_id: teamId
        });

      if (funcError) {
        console.warn(`get_team_member_profile function not available, falling back to basic approach:`, funcError);
        
        // Fallback: use the existing get_user_name_by_id function for names
        const { data: nameResult, error: nameError } = await supabase
          .rpc('get_user_name_by_id', { p_user_id: memberId });
        
        if (nameError) {
          console.warn(`Error getting name for user ${memberId}:`, nameError);
        }

        // For the current user, use their own information from context
        if (memberId === currentUser?.id) {
          return {
            id: memberId,
            name: currentUser.name || nameResult || 'Unknown User',
            email: currentUser.email || 'Email not available',
            lastActive: 'Recently'
          };
        } else {
          // For other users, show name but indicate email access needs DB function
          return {
            id: memberId,
            name: nameResult || 'Unknown User',
            email: canViewDetails ? 'Run MANUAL_DB_FUNCTION.sql to enable email access' : 'Email restricted',
            lastActive: 'Recently'
          };
        }
      } else if (profileResult && typeof profileResult === 'object' && !profileResult.error) {
        // Successfully got profile data from the secure function
        return {
          id: profileResult.id || memberId,
          name: profileResult.name || 'Unknown User',
          email: profileResult.email || 'Email not available',
          lastActive: 'Recently'
        };
      } else {
        // Function returned an error or unexpected format
        console.warn(`get_team_member_profile returned error:`, profileResult);
        
        // Fallback to name-only approach
        const { data: nameResult, error: nameError } = await supabase
          .rpc('get_user_name_by_id', { p_user_id: memberId });

        return {
          id: memberId,
          name: memberId === currentUser?.id ? currentUser.name : (nameResult || 'Unknown User'),
          email: memberId === currentUser?.id ? currentUser.email : 
                (canViewDetails ? 'Contact admin for email access' : 'Email restricted'),
          lastActive: 'Recently'
        };
      }
    } catch (error) {
      return {
        id: memberId,
        name: memberId === currentUser?.id ? currentUser.name : 'Team Member',
        email: memberId === currentUser?.id ? currentUser.email : 'Email restricted',
        lastActive: 'Recently'
      };
    }
  }, [developerLog]);

  const loadTeamData = useCallback(async () => {
    if (!user?.teamId) return;

    try {
      setLoading(true);
      setError(null);
      
      // Load team members first
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select(`
          id,
          user_id,
          team_id,
          role,
          status,
          joined_at
        `)
        .eq('team_id', user.teamId);

      if (membersError) {
        console.error('Error loading team members:', membersError);
        setError('Failed to load team members');
        return;
      }

      // Debug: Log the raw team members data
      developerLog('🔍 Raw team members data:', {
        teamId: user.teamId,
        membersCount: membersData?.length || 0,
        membersData: membersData
      });

      // Transform the data based on user permissions
      const transformedMembers: TeamMember[] = [];
      
      developerLog('🔍 Starting member transformation. Processing', membersData?.length || 0, 'members');
      
      for (const member of membersData || []) {
        const memberDetails = await fetchTeamMemberDetails(
          member.user_id,
          user.teamId,
          user,
          canViewDetails()
        );

        transformedMembers.push({
          id: member.id,
          userId: member.user_id,
          teamId: member.team_id,
          role: member.role,
          status: member.status,
          joinedAt: member.joined_at,
          user: memberDetails
        });
      }
       
       developerLog('🔍 Final transformed members:', {
         originalCount: membersData?.length || 0,
         transformedCount: transformedMembers.length,
         members: transformedMembers.map(m => ({
           id: m.id,
           userId: m.userId,
           role: m.role,
           status: m.status,
           userName: m.user.name,
           userEmail: m.user.email
         }))
       });
       
       setTeamMembers(transformedMembers);

       // Load team invitations - only for owners and admins
       if (canViewDetails()) {
        const { data: invitationsData, error: invitationsError } = await supabase
          .from('team_invitations')
          .select('*')
          .eq('team_id', user.teamId)
          .eq('status', 'pending')
          .gt('expires_at', new Date().toISOString());

        if (invitationsError) {
          console.error('Error loading team invitations:', invitationsError);
          // Don't set error here as members might have loaded successfully
        } else {
          const transformedInvitations: TeamInvitation[] = (invitationsData || []).map(inv => ({
            id: inv.id,
            teamId: inv.team_id,
            email: inv.email,
            role: inv.role,
            invitedBy: inv.invited_by,
            token: inv.token,
            status: inv.status,
            expiresAt: inv.expires_at,
            createdAt: inv.created_at
          }));
          setTeamInvitations(transformedInvitations);
        }
      } else {
        // Regular members cannot see invitations
        setTeamInvitations([]);
      }
    } catch (error) {
      console.error('Error loading team data:', error);
      setError('Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, [user?.teamId, user?.id, user?.name, user?.email, canViewDetails, fetchTeamMemberDetails, developerLog]);

  const suspendMember = useCallback(async (memberId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);

      developerLog('🚫 Suspending team member:', memberId);

      // Find the member being suspended
      const memberToSuspend = teamMembers.find(m => m.id === memberId);
      if (!memberToSuspend) {
        return { success: false, error: 'Member not found' };
      }

      // Prevent suspending the team owner
      if (memberToSuspend.role === 'owner') {
        return { success: false, error: 'Cannot suspend the team owner' };
      }

      // Update the member's status to suspended
      const { error } = await supabase
        .from('team_members')
        .update({ 
          status: 'suspended',
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId);

      if (error) {
        console.error('❌ Error suspending member:', error);
        return { success: false, error: 'Failed to suspend member' };
      }

      developerLog('✅ Member suspended successfully');

      // If the current user suspended themselves, log them out
      if (memberToSuspend.userId === user?.id) {
        developerLog('🚪 User suspended themselves, logging out...');
        setTimeout(() => {
          logout();
        }, 1000);
      }

      // Reload team data to reflect the change
      await loadTeamData();
      return { success: true };
    } catch (error) {
      console.error('💥 Error suspending member:', error);
      return { success: false, error: 'Failed to suspend member' };
    } finally {
      setLoading(false);
    }
  }, [teamMembers, user?.id, logout, loadTeamData, developerLog]);

  const reinstateMember = useCallback(async (memberId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);

      developerLog('✅ Reinstating team member:', memberId);

      // Find the member being reinstated
      const memberToReinstate = teamMembers.find(m => m.id === memberId);
      if (!memberToReinstate) {
        return { success: false, error: 'Member not found' };
      }

      // Update the member's status to active
      const { error } = await supabase
        .from('team_members')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId);

      if (error) {
        console.error('❌ Error reinstating member:', error);
        return { success: false, error: 'Failed to reinstate member' };
      }

      developerLog('✅ Member reinstated successfully');

      // Reload team data to reflect the change
      await loadTeamData();
      return { success: true };
    } catch (error) {
      console.error('💥 Error reinstating member:', error);
      return { success: false, error: 'Failed to reinstate member' };
    } finally {
      setLoading(false);
    }
  }, [teamMembers, loadTeamData, developerLog]);

  const inviteMember = useCallback(async (email: string, role: 'admin' | 'member'): Promise<{ success: boolean; invitationLink?: string; error?: string }> => {
    if (!user?.teamId || !email.trim()) {
      return { success: false, error: 'Please enter a valid email address' };
    }

    try {
      setLoading(true);
      setError(null);

      // Use the database function to handle the invitation
      const { data, error } = await supabase.rpc('invite_team_member', {
        p_team_id: user.teamId,
        p_email: email.trim(),
        p_role: role
      });

      if (error) {
        console.error('Error calling invite_team_member function:', error);
        return { success: false, error: 'Failed to send invitation. Please try again.' };
      }

      if (!data.success) {
        return { success: false, error: data.error || 'Failed to send invitation' };
      }

      developerLog('✅ Invitation created successfully:', data);

      // Reload team data to show the new invitation
      // Send invitation email via Brevo Edge Function
      try {
        await supabase.functions.invoke('send-email-brevo', {
          body: {
            to: email.trim(),
            subject: `You're invited to join ${user.teamName || 'a team'} on PBE Journey!`,
            htmlContent: `
              <p>Hello,</p>
              <p>You have been invited by ${user.name} to join their team on PBE Journey as a ${role}.</p>
              <p>Click the link below to accept your invitation:</p>
              <p><a href="${data.invitation_link}">${data.invitation_link}</a></p>
              <p>This link will expire in 7 days.</p>
              <p>Best regards,<br>The PBE Journey Team</p>
            `,
          },
        });
      } catch (emailError) {
        console.error('❌ Failed to send invitation email via Brevo:', emailError);
        // Continue with the process even if email sending fails
      }
      await loadTeamData();

      return { success: true, invitationLink: data.invitation_link };
    } catch (error) {
      console.error('💥 Error inviting member:', error);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    } finally {
      setLoading(false);
    }
  }, [user?.teamId, loadTeamData, developerLog]);

  const resendInvitation = useCallback(async (invitationId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);
      
      // Update the invitation with a new expiry date
      const { error } = await supabase
        .from('team_invitations')
        .update({
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      if (error) {
        console.error('Error resending invitation:', error);
        return { success: false, error: 'Failed to resend invitation' };
      }

      // Reload invitations
      await loadTeamData();
      return { success: true };
    } catch (error) {
      console.error('Error resending invitation:', error);
      return { success: false, error: 'Failed to resend invitation' };
    } finally {
      setLoading(false);
    }
  }, [loadTeamData]);

  const cancelInvitation = useCallback(async (invitationId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase
        .from('team_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) {
        console.error('Error canceling invitation:', error);
        return { success: false, error: 'Failed to cancel invitation' };
      }

      // Reload invitations
      await loadTeamData();
      return { success: true };
    } catch (error) {
      console.error('Error canceling invitation:', error);
      return { success: false, error: 'Failed to cancel invitation' };
    } finally {
      setLoading(false);
    }
  }, [loadTeamData]);

  const generateInvitationLink = useCallback((token: string): string => {
    return `${window.location.origin}/invitations/accept?token=${token}`;
  }, []);

  // Calculate team statistics
  const teamStats = {
    totalMembers: teamMembers.length,
    admins: teamMembers.filter(m => m.role === 'admin' || m.role === 'owner').length,
    pendingInvites: teamInvitations.length,
    activeMembers: teamMembers.filter(m => m.status === 'active').length,
  };

  // Load team data when user changes
  useEffect(() => {
    if (user?.teamId) {
      loadTeamData();
    } else {
      setTeamMembers([]);
      setTeamInvitations([]);
    }
  }, [user?.teamId, loadTeamData]);

  return {
    teamMembers,
    teamInvitations,
    teamStats,
    loading,
    error,
    setError,
    inviteMember,
    suspendMember,
    reinstateMember,
    resendInvitation,
    cancelInvitation,
    generateInvitationLink,
    getRoleIcon,
    loadTeamData
  };
}