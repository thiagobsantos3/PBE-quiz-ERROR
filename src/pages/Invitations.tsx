import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/common/Badge';
import { getRoleIconComponent } from '../utils/displayUtils';
import { 
  Mail, 
  Check, 
  X, 
  Clock, 
  Users, 
  Building2,
  AlertCircle,
  CheckCircle,
  Calendar
} from 'lucide-react';

interface TeamInvitation {
  id: string;
  teamId: string;
  email: string;
  role: 'admin' | 'member';
  invitedBy: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: string;
  createdAt: string;
  team: {
    id: string;
    name: string;
    description?: string;
  };
  inviter: {
    name: string;
  };
}

export function Invitations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadInvitations();
    }
  }, [user]);

  const loadInvitations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Load pending invitations for the current user's email
      const { data, error } = await supabase
        .from('team_invitations')
        .select(`
          id,
          team_id,
          email,
          role,
          invited_by,
          status,
          expires_at,
          created_at,
          teams:team_id (
            id,
            name,
            description
          )
        `)
        .eq('email', user.email)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading invitations:', error);
        setError('Failed to load invitations');
        return;
      }

      // Get inviter profiles separately
      const inviterIds = [...new Set((data || []).map(inv => inv.invited_by))];
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, name')
        .in('id', inviterIds);

      if (profilesError) {
        console.error('Error loading inviter profiles:', profilesError);
        // Continue without inviter names rather than failing completely
      }

      // Create a map of inviter profiles
      const profilesMap = new Map(
        (profiles || []).map(profile => [profile.id, profile])
      );

      // Transform the data
      const transformedInvitations: TeamInvitation[] = (data || []).map(inv => ({
        id: inv.id,
        teamId: inv.team_id,
        email: inv.email,
        role: inv.role,
        invitedBy: inv.invited_by,
        status: inv.status,
        expiresAt: inv.expires_at,
        createdAt: inv.created_at,
        team: {
          id: inv.teams.id,
          name: inv.teams.name,
          description: inv.teams.description
        },
        inviter: {
          name: profilesMap.get(inv.invited_by)?.name || 'Unknown User'
        }
      }));

      setInvitations(transformedInvitations);
    } catch (error) {
      console.error('Error loading invitations:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInvitationResponse = async (invitationId: string, action: 'accept' | 'decline') => {
    if (!user) return;

    try {
      setProcessingInvitation(invitationId);
      setError(null);

      const invitation = invitations.find(inv => inv.id === invitationId);
      if (!invitation) {
        setError('Invitation not found');
        return;
      }

      if (action === 'accept') {
        // Use the database function to accept the invitation
        const { data, error } = await supabase.rpc('accept_team_invitation', {
          p_invitation_id: invitationId
        });

        if (error) {
          console.error('Error accepting invitation:', error);
          setError('Failed to accept invitation. Please try again.');
          return;
        }

        if (!data.success) {
          setError(data.error || 'Failed to accept invitation');
          return;
        }

        // Show success message and redirect to team page
        alert('Successfully joined the team!');
        
        // Refresh the user's auth context to get updated team info
        window.location.reload();
      } else {
        // Decline the invitation
        const { error } = await supabase
          .from('team_invitations')
          .update({ status: 'declined' })
          .eq('id', invitationId);

        if (error) {
          console.error('Error declining invitation:', error);
          setError('Failed to decline invitation. Please try again.');
          return;
        }

        // Remove the invitation from the list
        setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      }
    } catch (error) {
      console.error('Error processing invitation:', error);
      setError('An unexpected error occurred');
    } finally {
      setProcessingInvitation(null);
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'Expired';
    if (diffDays === 1) return '1 day remaining';
    return `${diffDays} days remaining`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading invitations...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Team Invitations</h1>
          <p className="text-gray-600">Manage your pending team invitations.</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {invitations.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Invitations</h3>
            <p className="text-gray-600 mb-6">
              You don't have any pending team invitations at the moment.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {invitation.team.name}
                        </h3>
                        <Badge type="plan" value={invitation.team.plan} />
                      </div>
                      
                      <p className="text-gray-600 mb-3">
                        <strong>{invitation.inviter.name}</strong> invited you to join their team
                        as <Badge type="teamRole" value={invitation.role} />.
                      </p>
                      
                      {invitation.team.description && (
                        <p className="text-sm text-gray-500 mb-3">
                          {invitation.team.description}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          {React.createElement(getRoleIconComponent(invitation.role), { className: "h-4 w-4 text-gray-500" })}
                          <Badge type="teamRole" value={invitation.role} />
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>Invited {new Date(invitation.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span className={formatTimeRemaining(invitation.expiresAt).includes('Expired') ? 'text-red-600' : ''}>
                            {formatTimeRemaining(invitation.expiresAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleInvitationResponse(invitation.id, 'decline')}
                      disabled={processingInvitation === invitation.id}
                      className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      <X className="h-4 w-4" />
                      <span>Decline</span>
                    </button>
                    <button
                      onClick={() => handleInvitationResponse(invitation.id, 'accept')}
                      disabled={processingInvitation === invitation.id}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      {processingInvitation === invitation.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Accept</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}