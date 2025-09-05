import { 
  canViewTeamMemberDetails, 
  canManageTeamMembers, 
  canViewTeamInvitations,
  isSuperAdmin,
  isTeamOwner,
  isTeamAdmin,
  canModifyTeamMember
} from '../permissions';
import { User } from '../../types';

// Mock user objects for testing
const mockSuperAdmin: User = {
  id: '1',
  email: 'admin@example.com',
  name: 'Super Admin',
  role: 'admin',
  teamId: 'team1',
  teamRole: 'member',
  createdAt: '2024-01-01T00:00:00Z'
};

const mockTeamOwner: User = {
  id: '2',
  email: 'owner@example.com',
  name: 'Team Owner',
  role: 'user',
  teamId: 'team1',
  teamRole: 'owner',
  createdAt: '2024-01-01T00:00:00Z'
};

const mockTeamAdmin: User = {
  id: '3',
  email: 'admin@example.com',
  name: 'Team Admin',
  role: 'user',
  teamId: 'team1',
  teamRole: 'admin',
  createdAt: '2024-01-01T00:00:00Z'
};

const mockTeamMember: User = {
  id: '4',
  email: 'member@example.com',
  name: 'Team Member',
  role: 'user',
  teamId: 'team1',
  teamRole: 'member',
  createdAt: '2024-01-01T00:00:00Z'
};

describe('Permission Utils', () => {
  describe('canViewTeamMemberDetails', () => {
    it('should return true for team owners', () => {
      expect(canViewTeamMemberDetails(mockTeamOwner)).toBe(true);
    });

    it('should return true for team admins', () => {
      expect(canViewTeamMemberDetails(mockTeamAdmin)).toBe(true);
    });

    it('should return false for regular team members', () => {
      expect(canViewTeamMemberDetails(mockTeamMember)).toBe(false);
    });

    it('should return false for null user', () => {
      expect(canViewTeamMemberDetails(null)).toBe(false);
    });
  });

  describe('canManageTeamMembers', () => {
    it('should return true for team owners', () => {
      expect(canManageTeamMembers(mockTeamOwner)).toBe(true);
    });

    it('should return true for team admins', () => {
      expect(canManageTeamMembers(mockTeamAdmin)).toBe(true);
    });

    it('should return false for regular team members', () => {
      expect(canManageTeamMembers(mockTeamMember)).toBe(false);
    });
  });

  describe('canViewTeamInvitations', () => {
    it('should return true for super admins', () => {
      expect(canViewTeamInvitations(mockSuperAdmin)).toBe(true);
    });

    it('should return true for team owners', () => {
      expect(canViewTeamInvitations(mockTeamOwner)).toBe(true);
    });

    it('should return true for team admins', () => {
      expect(canViewTeamInvitations(mockTeamAdmin)).toBe(true);
    });

    it('should return false for regular team members', () => {
      expect(canViewTeamInvitations(mockTeamMember)).toBe(false);
    });
  });

  describe('isSuperAdmin', () => {
    it('should return true for super admins', () => {
      expect(isSuperAdmin(mockSuperAdmin)).toBe(true);
    });

    it('should return false for non-super admins', () => {
      expect(isSuperAdmin(mockTeamOwner)).toBe(false);
      expect(isSuperAdmin(mockTeamAdmin)).toBe(false);
      expect(isSuperAdmin(mockTeamMember)).toBe(false);
    });
  });

  describe('isTeamOwner', () => {
    it('should return true for team owners', () => {
      expect(isTeamOwner(mockTeamOwner)).toBe(true);
    });

    it('should return false for non-owners', () => {
      expect(isTeamOwner(mockTeamAdmin)).toBe(false);
      expect(isTeamOwner(mockTeamMember)).toBe(false);
    });
  });

  describe('isTeamAdmin', () => {
    it('should return true for team admins', () => {
      expect(isTeamAdmin(mockTeamAdmin)).toBe(true);
    });

    it('should return false for non-admins', () => {
      expect(isTeamAdmin(mockTeamOwner)).toBe(false);
      expect(isTeamAdmin(mockTeamMember)).toBe(false);
    });
  });

  describe('canModifyTeamMember', () => {
    it('should return true when team owner tries to modify regular member', () => {
      expect(canModifyTeamMember(mockTeamOwner, 'member', 'other-user-id')).toBe(true);
    });

    it('should return true when team admin tries to modify regular member', () => {
      expect(canModifyTeamMember(mockTeamAdmin, 'member', 'other-user-id')).toBe(true);
    });

    it('should return false when regular member tries to modify anyone', () => {
      expect(canModifyTeamMember(mockTeamMember, 'member', 'other-user-id')).toBe(false);
    });

    it('should return false when trying to modify team owner', () => {
      expect(canModifyTeamMember(mockTeamAdmin, 'owner', 'other-user-id')).toBe(false);
    });

    it('should return false when trying to modify themselves', () => {
      expect(canModifyTeamMember(mockTeamAdmin, 'member', mockTeamAdmin.id)).toBe(false);
    });
  });
});