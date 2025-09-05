import { User } from '../types';

/**
 * Permission utility functions for role-based access control
 */

/**
 * Check if user can view team member details (names and emails)
 * Only team owners and admins have this permission
 */
export function canViewTeamMemberDetails(user: User | null): boolean {
  return user?.teamRole === 'owner' || user?.teamRole === 'admin';
}

/**
 * Check if user can manage team members (invite, suspend, etc.)
 * Only team owners and admins have this permission
 */
export function canManageTeamMembers(user: User | null): boolean {
  return user?.teamRole === 'owner' || user?.teamRole === 'admin';
}

/**
 * Check if user can view team invitations
 * Super admins, team owners, and team admins can view invitations
 */
export function canViewTeamInvitations(user: User | null): boolean {
  return user?.role === 'admin' || user?.teamRole === 'owner' || user?.teamRole === 'admin';
}

/**
 * Check if user is a super admin
 * Super admins have access to system-wide functionality
 */
export function isSuperAdmin(user: User | null): boolean {
  return user?.role === 'admin';
}

/**
 * Check if user is a team owner
 */
export function isTeamOwner(user: User | null): boolean {
  return user?.teamRole === 'owner';
}

/**
 * Check if user is a team admin
 */
export function isTeamAdmin(user: User | null): boolean {
  return user?.teamRole === 'admin';
}

/**
 * Check if user can modify a specific team member
 * - Cannot modify team owners
 * - Cannot modify themselves (for suspension/etc)
 * - Must be team owner or admin
 * - Additional security checks
 */
export function canModifyTeamMember(
  currentUser: User | null, 
  targetMemberRole: string, 
  targetMemberId: string
): boolean {
  if (!canManageTeamMembers(currentUser)) {
    return false;
  }
  
  // Additional security validation
  if (!currentUser?.id || !targetMemberId) {
    return false;
  }
  
  // Validate UUID format for target member ID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(targetMemberId)) {
    return false;
  }
  
  // Cannot modify team owners
  if (targetMemberRole === 'owner') {
    return false;
  }
  
  // Cannot modify themselves
  if (targetMemberId === currentUser?.id) {
    return false;
  }
  
  return true;
}

/**
 * Get user display permissions for team member information
 */
export function getTeamMemberDisplayPermissions(
  currentUser: User | null, 
  targetUserId: string
) {
  return {
    canViewName: true, // Everyone can see names (though it might be generic)
    canViewEmail: canViewTeamMemberDetails(currentUser) || targetUserId === currentUser?.id,
    canViewRole: true, // Everyone can see roles
    canViewStatus: true, // Everyone can see status
    canViewJoinDate: true, // Everyone can see join dates
    canModify: canModifyTeamMember(currentUser, 'member', targetUserId) // Simplified check
  };
}