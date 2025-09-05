import React from 'react';
import { Users, ChevronDown } from 'lucide-react';
import { TeamMemberForSchedule } from '../../types';

interface TeamMemberSelectorProps {
  teamMembers: TeamMemberForSchedule[];
  selectedMemberId: string | undefined; // Can be undefined for 'All Team'
  onSelectMember: (memberId: string | undefined) => void; // Accepts undefined
  selectedMemberInfo?: TeamMemberForSchedule;
  disabled?: boolean;
  includeAllTeamOption?: boolean; // New prop
}

export function TeamMemberSelector({
  teamMembers,
  selectedMemberId,
  onSelectMember,
  selectedMemberInfo,
  disabled = false,
  includeAllTeamOption = false // Default to false
}: TeamMemberSelectorProps) {
  if (teamMembers.length === 0 && !includeAllTeamOption) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6">
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No Team Found</h2>
          <p className="text-gray-600">You need to be part of a team to manage study schedules.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {disabled ? `${selectedMemberInfo?.user.name}'s Study Schedule` : 'Viewing Performance For:'}
          </h2>
          {disabled ? (
            // Show static display for regular members
            <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-base font-medium text-gray-900 min-w-64 capitalize">
              {selectedMemberInfo?.role} Access
            </div>
          ) : (
            // Show dropdown for owners/admins
            <div className="relative">
              <select
                value={selectedMemberId === undefined ? '' : selectedMemberId} // Convert undefined to empty string for select value
                onChange={(e) => onSelectMember(e.target.value === '' ? undefined : e.target.value)} // Convert empty string back to undefined
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-3 pr-10 text-base font-medium text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200 w-full sm:min-w-64"
                disabled={disabled}
              >
                {includeAllTeamOption && (
                  <option value="">All Team</option>
                )}
                {/* Always show the currently selected member first, regardless of role */}
                {selectedMemberId && teamMembers.find(m => m.userId === selectedMemberId) && (
                  <option key={selectedMemberId} value={selectedMemberId}>
                    {teamMembers.find(m => m.userId === selectedMemberId)?.user.name} ({teamMembers.find(m => m.userId === selectedMemberId)?.role})
                  </option>
                )}
                {/* Then show only members with 'member' role, excluding the already selected one */}
                {teamMembers
                  .filter(member => member.role === 'member' && member.userId !== selectedMemberId)
                  .map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.user.name} ({member.role})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}