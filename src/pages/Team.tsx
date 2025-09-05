import React, { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useTeamManagement } from '../hooks/useTeamManagement';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { AlertMessage } from '../components/common/AlertMessage';
import { StatsCard } from '../components/common/StatsCard';
import { canManageTeamMembers, canViewTeamInvitations } from '../utils/permissions';
import { TeamDiagnostics } from '../components/TeamDiagnostics';
import { 
  Users, 
  UserPlus, 
  Search, 
  MoreHorizontal, 
  Mail, 
  Shield, 
  Crown,
  Clock,
  Check,
  Send,
  Copy,
  ExternalLink,
  Link,
  UserX,
  UserCheck,
  X
} from 'lucide-react';

export function Team() {
  const { developerLog } = useAuth();
  const { user } = useAuth();
  const {
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
    getRoleIcon
  } = useTeamManagement();

  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showInvitationLinkModal, setShowInvitationLinkModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [invitationLink, setInvitationLink] = useState('');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members');
  const [suspendingMember, setSuspendingMember] = useState<string | null>(null);
  const [reinstatingMember, setReinstatingMember] = useState<string | null>(null);

  // Filter team members based on search
  const filteredMembers = React.useMemo(() => teamMembers.filter(member => {
    const nameMatch = member.user.name.toLowerCase().includes(searchTerm.toLowerCase());
    // Only search by email if it's not restricted
    const emailMatch = member.user.email !== 'Email restricted' && 
      member.user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return nameMatch || emailMatch;
  }), [teamMembers, searchTerm]);

  const canManageMembers = React.useMemo(() => canManageTeamMembers(user), [user]);
  const canViewInvitations = React.useMemo(() => canViewTeamInvitations(user), [user]);

  const handleInviteMember = React.useCallback(async () => {
    const result = await inviteMember(inviteEmail, inviteRole);
    
    if (result.success && result.invitationLink) {
      // Set the invitation link and show the modal
      setInvitationLink(result.invitationLink);
      setShowInvitationLinkModal(true);

      // Reset form and close invite modal
      setInviteEmail('');
      setInviteRole('member');
      setShowInviteModal(false);
      setError(null);
    } else {
      setError(result.error || 'Failed to send invitation');
    }
  }, [inviteMember, inviteEmail, inviteRole, setInvitationLink, setShowInvitationLinkModal, setInviteEmail, setInviteRole, setShowInviteModal, setError]);

  const handleSuspendMember = React.useCallback(async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to suspend ${memberName}? They will be logged out and unable to access the team.`)) {
      return;
    }

    setSuspendingMember(memberId);
    const result = await suspendMember(memberId);
    
    if (!result.success) {
      setError(result.error || 'Failed to suspend member');
    }
    setSuspendingMember(null);
  }, [suspendMember, setError]);

  const handleReinstateMember = React.useCallback(async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to reinstate ${memberName}? They will regain access to the team.`)) {
      return;
    }

    setReinstatingMember(memberId);
    const result = await reinstateMember(memberId);
    
    if (!result.success) {
      setError(result.error || 'Failed to reinstate member');
    }
    setReinstatingMember(null);
  }, [reinstateMember, setError]);

  const handleCopyLink = React.useCallback(async (link: string, invitationId: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopySuccess(invitationId);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(invitationId);
      setTimeout(() => setCopySuccess(null), 2000);
    }
  }, []);

  const handleCopyModalLink = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(invitationLink);
      setCopySuccess('modal');
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = invitationLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess('modal');
      setTimeout(() => setCopySuccess(null), 2000);
    }
  }, [invitationLink]);

  const handleResendInvitation = React.useCallback(async (invitationId: string) => {
    const result = await resendInvitation(invitationId);
    if (!result.success) {
      setError(result.error || 'Failed to resend invitation');
    }
  }, [resendInvitation, setError]);

  const handleCancelInvitation = React.useCallback(async (invitationId: string) => {
    const result = await cancelInvitation(invitationId);
    if (!result.success) {
      setError(result.error || 'Failed to cancel invitation');
    }
  }, [cancelInvitation, setError]);

  // Get team member limit from the teams table (fallback to 5 for display purposes)
  const teamMemberLimit = user?.maxTeamMembers || 5;

  // If user doesn't have a team, show error state
  if (!user?.teamId) {
    return (
      <Layout>
        <div className="p-4 sm:p-6">
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No Team Found</h2>
            <p className="text-gray-600">You are not currently a member of any team.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Team Management</h1>
            <p className="text-gray-600">Manage your team members and invitations.</p>
          </div>
          {canManageMembers && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
            >
              <UserPlus className="h-4 w-4" />
              <span>Invite Member</span>
            </button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <AlertMessage
            type="error"
            message={error}
            className="mb-6"
          />
        )}

        {/* Diagnostics - Remove after debugging */}
        {/*<TeamDiagnostics />*/}

        {/* Team Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Members"
            value={teamStats.totalMembers}
            icon={Users}
            iconColor="text-indigo-600"
            subtitle={`of ${teamMemberLimit} max`}
          />
          <StatsCard
            title="Admins"
            value={teamStats.admins}
            icon={Shield}
            iconColor="text-blue-600"
          />
          <StatsCard
            title="Pending Invites"
            value={teamStats.pendingInvites}
            icon={Clock}
            iconColor="text-yellow-600"
          />
          <StatsCard
            title="Active Members"
            value={teamStats.activeMembers}
            icon={Check}
            iconColor="text-green-600"
          />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('members')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'members'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Team Members ({teamMembers.length})
              </button>
              {canViewInvitations && (
                <button
                  onClick={() => setActiveTab('invitations')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === 'invitations'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Pending Invitations ({teamInvitations.length})
                </button>
              )}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'members' && (
              <>
                {/* Search */}
                <div className="mb-6">
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search team members..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Permission Info */}
                {!canManageMembers ? (
                  <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium">Limited View</p>
                        <p>As a team member, you can only see your own contact details. Team owners and admins can view all member information.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <Crown className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="text-sm text-green-800">
                        <p className="font-medium">Enhanced Access</p>
                        <p>As a team {user?.teamRole}, you can view and manage all team member details including names and email addresses.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Members List */}
                {loading ? (
                  <LoadingSpinner text="Loading team members..." className="py-12" />
                ) : filteredMembers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Team Members</h3>
                    <p className="text-gray-600 mb-4">
                      {teamMembers.length === 0 
                        ? "Your team doesn't have any members yet." 
                        : "No members match your search criteria."
                      }
                    </p>
                    {canManageMembers && teamMembers.length === 0 && (
                      <button
                        onClick={() => setShowInviteModal(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                      >
                        Invite Your First Member
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredMembers.map((member) => (
                      <div key={member.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200 space-y-4 sm:space-y-0">
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-indigo-600">
                              {member.user.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium text-gray-900">{member.user.name}</h3>
                              {member.role === 'owner' && (
                                <Crown className="h-4 w-4 text-yellow-500" title="Team Owner" />
                              )}
                            </div>
                            <p className={`text-sm truncate ${member.user.email === 'Email restricted' ? 'text-gray-400 italic' : 'text-gray-600'}`}>
                              {member.user.email}
                            </p>
                            <p className="text-xs text-gray-500">Joined: {new Date(member.joinedAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                          <Badge type="teamRole" value={member.role} showIcon />
                          <Badge type="status" value={member.status} />
                          
                          {/* Suspend button for team owners/admins */}
                          {canManageMembers && 
                           member.role !== 'owner' && 
                           member.userId !== user?.id && 
                           member.status === 'active' && (
                            <button
                              onClick={() => handleSuspendMember(member.id, member.user.name)}
                              disabled={suspendingMember === member.id}
                              className="flex items-center space-x-1 px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200 disabled:opacity-50"
                              title="Suspend member"
                            >
                              {suspendingMember === member.id ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b border-red-600"></div>
                              ) : (
                                <UserX className="h-3 w-3" />
                              )}
                              <span>Suspend</span>
                            </button>
                          )}

                          {/* Reinstate button for suspended members */}
                          {canManageMembers && 
                           member.role !== 'owner' && 
                           member.userId !== user?.id && 
                           member.status === 'suspended' && (
                            <button
                              onClick={() => handleReinstateMember(member.id, member.user.name)}
                              disabled={reinstatingMember === member.id}
                              className="flex items-center space-x-1 px-2 py-1 text-xs font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors duration-200 disabled:opacity-50"
                              title="Reinstate member"
                            >
                              {reinstatingMember === member.id ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b border-green-600"></div>
                              ) : (
                                <UserCheck className="h-3 w-3" />
                              )}
                              <span>Reinstate</span>
                            </button>
                          )}
                          
                          {canManageMembers && member.role !== 'owner' && member.userId !== user?.id && (
                            <div className="relative">
                              <button className="text-gray-400 hover:text-gray-600 transition-colors duration-200">
                                <MoreHorizontal className="h-5 w-5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'invitations' && canViewInvitations && (
              <div className="space-y-4">
                {loading ? (
                  <LoadingSpinner text="Loading invitations..." className="py-12" />
                ) : teamInvitations.length === 0 ? (
                  <div className="text-center py-12">
                    <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Invitations</h3>
                    <p className="text-gray-600 mb-4">There are no pending invitations for your team.</p>
                    {canManageMembers && (
                      <button
                        onClick={() => setShowInviteModal(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                      >
                        Send an Invitation
                      </button>
                    )}
                  </div>
                ) : (
                  teamInvitations.map((invitation) => {
                    const invitationLink = generateInvitationLink(invitation.token);
                    const isCopied = copySuccess === invitation.id;
                    
                    return (
                      <div key={invitation.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center">
                              <Mail className="h-6 w-6 text-gray-400" />
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900">{invitation.email}</h3>
                              <p className="text-sm text-gray-600">
                                Invited {new Date(invitation.createdAt).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-gray-500">
                                Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <Badge type="teamRole" value={invitation.role} showIcon />
                            <Badge type="status" value="pending" />
                          </div>
                        </div>

                        {/* Invitation Link Section */}
                        <div className="bg-gray-50 rounded-lg p-3 mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                              <Link className="h-4 w-4" />
                              <span>Invitation Link</span>
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={invitationLink}
                              readOnly
                              className="flex-1 px-3 py-2 text-sm font-mono bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                            <button
                              onClick={() => handleCopyLink(invitationLink, invitation.id)}
                              className={`px-3 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-1 ${
                                isCopied 
                                  ? 'bg-green-100 text-green-700 border border-green-300' 
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
                              }`}
                            >
                              {isCopied ? (
                                <>
                                  <Check className="h-4 w-4" />
                                  <span className="text-sm">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4" />
                                  <span className="text-sm">Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Share this link with the invited team member. The link will expire in 7 days.
                          </p>
                        </div>

                        {/* Action Buttons */}
                        {canManageMembers && (
                          <div className="flex items-center justify-end space-x-2">
                            <button 
                              onClick={() => handleResendInvitation(invitation.id)}
                              className="text-indigo-600 hover:text-indigo-700 transition-colors duration-200 flex items-center space-x-1 px-3 py-1 rounded-lg hover:bg-indigo-50"
                              disabled={loading}
                            >
                              <Send className="h-4 w-4" />
                              <span className="text-sm">Extend</span>
                            </button>
                            <button 
                              onClick={() => handleCancelInvitation(invitation.id)}
                              className="text-red-600 hover:text-red-700 transition-colors duration-200 flex items-center space-x-1 px-3 py-1 rounded-lg hover:bg-red-50"
                              disabled={loading}
                            >
                              <X className="h-4 w-4" />
                              <span className="text-sm">Cancel</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Invite Modal */}
        <Modal
          isOpen={showInviteModal}
          onClose={() => {
            setShowInviteModal(false);
            setError(null);
            setInviteEmail('');
            setInviteRole('member');
          }}
          title="Invite Team Member"
          footer={
            <>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setError(null);
                  setInviteEmail('');
                  setInviteRole('member');
                }}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleInviteMember}
                disabled={!inviteEmail.trim() || loading}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-2"
              >
                {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                <span>Send Invitation</span>
              </button>
            </>
          }
        >
          {error && (
            <AlertMessage
              type="error"
              message={error}
              className="mb-4"
            />
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {inviteRole === 'admin' 
                  ? 'Can manage team members and settings' 
                  : 'Can access team resources and collaborate'
                }
              </p>
            </div>
          </div>
        </Modal>

        {/* Invitation Link Modal */}
        <Modal
          isOpen={showInvitationLinkModal}
          onClose={() => {
            setShowInvitationLinkModal(false);
            setInvitationLink('');
            setCopySuccess(null);
          }}
          title="Invitation Sent Successfully"
          maxWidth="lg"
          footer={
            <button
              onClick={() => {
                setShowInvitationLinkModal(false);
                setInvitationLink('');
                setCopySuccess(null);
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
            >
              Close
            </button>
          }
        >
          <div className="mb-4">
            <div className="flex items-center space-x-2 text-green-600 mb-3">
              <Check className="h-5 w-5" />
              <span className="font-medium">Invitation created successfully!</span>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              You can share this invitation link with the team member. The link will expire in 7 days.
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invitation Link
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={invitationLink}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                />
                <button
                  onClick={handleCopyModalLink}
                  className={`px-3 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-1 ${
                    copySuccess === 'modal'
                      ? 'bg-green-100 text-green-700 border border-green-300' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {copySuccess === 'modal' ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span className="text-sm">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span className="text-sm">Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <ExternalLink className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Share this link</p>
                  <p>Send this link to the invited team member via email, chat, or any other communication method.</p>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}