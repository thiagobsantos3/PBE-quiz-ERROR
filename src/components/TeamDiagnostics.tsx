import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { canViewTeamMemberDetails, canManageTeamMembers, canViewTeamInvitations } from '../utils/permissions';

export function TeamDiagnostics() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <h3 className="font-semibold text-yellow-800 mb-3">🔍 Team Admin Diagnostics</h3>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <h4 className="font-medium text-yellow-700 mb-2">User Info:</h4>
          <ul className="space-y-1 text-yellow-600">
            <li><strong>User ID:</strong> {user.id}</li>
            <li><strong>Name:</strong> {user.name}</li>
            <li><strong>Email:</strong> {user.email}</li>
            <li><strong>System Role:</strong> {user.role}</li>
            <li><strong>Team ID:</strong> {user.teamId || 'None'}</li>
            <li><strong>Team Role:</strong> {user.teamRole || 'None'}</li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-medium text-yellow-700 mb-2">Permissions:</h4>
          <ul className="space-y-1 text-yellow-600">
            <li>
              <strong>Can View Member Details:</strong> 
              <span className={canViewTeamMemberDetails(user) ? 'text-green-600' : 'text-red-600'}>
                {canViewTeamMemberDetails(user) ? ' ✅ Yes' : ' ❌ No'}
              </span>
            </li>
            <li>
              <strong>Can Manage Members:</strong> 
              <span className={canManageTeamMembers(user) ? 'text-green-600' : 'text-red-600'}>
                {canManageTeamMembers(user) ? ' ✅ Yes' : ' ❌ No'}
              </span>
            </li>
            <li>
              <strong>Can View Invitations:</strong> 
              <span className={canViewTeamInvitations(user) ? 'text-green-600' : 'text-red-600'}>
                {canViewTeamInvitations(user) ? ' ✅ Yes' : ' ❌ No'}
              </span>
            </li>
          </ul>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-yellow-100 rounded">
        <h4 className="font-medium text-yellow-700 mb-2">Expected for Team Admin:</h4>
        <ul className="text-sm text-yellow-600">
          <li>✅ Should see all team members (including owners and other admins)</li>
          <li>✅ Should see real names and email addresses</li>
          <li>✅ Should be able to invite new members</li>
          <li>✅ Should be able to suspend/reinstate members (except owners)</li>
          <li>✅ Should see team invitations</li>
        </ul>
      </div>
    </div>
  );
}