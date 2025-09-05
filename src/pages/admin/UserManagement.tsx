import React, { useState } from 'react';
import { Layout } from '../../components/layout/Layout';
import { useUserManagement } from '../../hooks/useUserManagement';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AlertMessage } from '../../components/common/AlertMessage';
import { StatsCard } from '../../components/common/StatsCard';
import { Table, TableColumn } from '../../components/common/Table';
import { 
  Users, 
  Search, 
  Filter, 
  Shield,
  Plus,
  Building2,
  Mail,
} from 'lucide-react';

export function UserManagement() {
  const { users, teams, loading, error } = useUserManagement();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [showUserModal, setShowUserModal] = useState(false);

  // Get team name by team ID
  const getTeamName = (teamId?: string) => {
    if (!teamId) return 'No Team';
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'Unknown Team';
  };

  // Define table columns
  const columns: TableColumn[] = [
    {
      key: 'user',
      header: 'User',
      render: (user) => (
        <div className="flex items-center">
          <div className="h-8 w-8 sm:h-10 sm:w-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs sm:text-sm font-medium text-indigo-600">
              {user.name.split(' ').map((n: string) => n[0]).join('')}
            </span>
          </div>
          <div className="ml-3 sm:ml-4 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
            <div className="text-sm text-gray-500 truncate">{user.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'team',
      header: 'Team',
      render: (user) => (
        <div className="flex flex-col">
          <div className="flex items-center space-x-1">
            <Building2 className="h-3 w-3 text-gray-400" />
            <span className="text-sm font-medium text-gray-900 truncate max-w-32">
              {user.teamName || 'No Team'}
            </span>
          </div>
          {user.teamRole && (
            <Badge type="teamRole" value={user.teamRole} />
          )}
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (user) => <Badge type="role" value={user.role} />,
      className: 'whitespace-nowrap',
    },
    {
      key: 'status',
      header: 'Status',
      render: (user) => <Badge type="status" value={user.status} />,
      className: 'whitespace-nowrap',
    },
    {
      key: 'subscription',
      header: 'Subscription',
      render: (user) => (
        <span className="text-sm text-gray-900 capitalize">{user.subscription}</span>
      ),
      className: 'whitespace-nowrap text-sm text-gray-900 hidden sm:table-cell',
      headerClassName: 'hidden sm:table-cell',
    },
    {
      key: 'joinDate',
      header: 'Join Date',
      render: (user) => (
        <span className="text-sm text-gray-500">
          {new Date(user.joinDate).toLocaleDateString()}
        </span>
      ),
      className: 'whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell',
      headerClassName: 'hidden lg:table-cell',
    },
    {
      key: 'lastActive',
      header: 'Last Active',
      render: (user) => (
        <span className="text-sm text-gray-500">{user.lastActive}</span>
      ),
      className: 'whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell',
      headerClassName: 'hidden lg:table-cell',
    },
  ];

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.teamName || 'No Team').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus;
    const matchesTeam = selectedTeam === 'all' || user.teamId === selectedTeam;
    
    return matchesSearch && matchesRole && matchesStatus && matchesTeam;
  });

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner fullScreen text="Loading user data..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">User Management</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage user accounts, roles, and permissions across all teams.</p>
          </div>
          <button
            onClick={() => setShowUserModal(true)}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors duration-200 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Add User</span>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <AlertMessage
            type="error"
            title="Error Loading Data"
            message={error}
            className="mb-6"
          />
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6">
          <div className="flex flex-col space-y-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search users by name, email, or team..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
              >
                <option value="all">All Roles</option>
                <option value="admin">System Admin</option>
                <option value="user">User</option>
              </select>
              
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
              
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
              >
                <option value="all">All Teams</option>
                <option value="">No Team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              
              <div className="flex items-center text-sm text-gray-600">
                <Filter className="h-4 w-4 mr-2" />
                <span>{filteredUsers.length} of {users.length} users</span>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <Table
          columns={columns}
          data={filteredUsers}
          loading={loading}
          emptyState={{
            icon: Users,
            title: "No Users Found",
            description: users.length === 0 
              ? "No users found in the system." 
              : "No users match your search criteria."
          }}
        />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-6 sm:mt-8">
          <StatsCard
            title="Total Users"
            value={users.length}
            icon={Users}
            iconColor="text-indigo-600"
          />
          <StatsCard
            title="System Admins"
            value={users.filter(u => u.role === 'admin').length}
            icon={Shield}
            iconColor="text-purple-600"
          />
          <StatsCard
            title="Teams"
            value={teams.length}
            icon={Building2}
            iconColor="text-green-600"
          />
          <StatsCard
            title="Active Users"
            value={users.filter(u => u.status === 'active').length}
            icon={Mail}
            iconColor="text-blue-600"
          />
        </div>
      </div>
    </Layout>
  );
}