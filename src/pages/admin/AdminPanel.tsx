import React from 'react';
import { Layout } from '../../components/layout/Layout';
import { useAdminData } from '../../hooks/useAdminData';
import { StatsCard } from '../../components/common/StatsCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AlertMessage } from '../../components/common/AlertMessage';
import { 
  Users, 
  DollarSign, 
  Activity, 
  TrendingUp,
  Server,
  Database,
  Shield,
  Building2,
  UserCheck,
  UserX,
  Calendar,
  Percent,
  Crown,
  CreditCard
} from 'lucide-react';

export function AdminPanel() {
  const { stats, recentActivities, loading, error } = useAdminData();

  // Calculate derived statistics
  const paidUsersCount = stats.proUsers + stats.enterpriseUsers;
  const freeUsersPercentage = stats.totalUsers > 0 ? Math.round((stats.freeUsers / stats.totalUsers) * 100) : 0;
  const paidUsersPercentage = stats.totalUsers > 0 ? Math.round((paidUsersCount / stats.totalUsers) * 100) : 0;
  const avgMembersPerTeam = stats.totalTeams > 0 ? Math.round(stats.totalUsers / stats.totalTeams) : 0;
  const newUsersGrowth = stats.newUsersPrev30Days > 0 
    ? Math.round(((stats.newUsersLast30Days - stats.newUsersPrev30Days) / stats.newUsersPrev30Days) * 100)
    : 0;
  const activeUsersPercentage = stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0;
  const activeTeamsPercentage = stats.totalTeams > 0 ? Math.round((stats.activeTeams / stats.totalTeams) * 100) : 0;

  // Admin stats with calculated values
  const adminStats = [
    {
      name: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      change: `${freeUsersPercentage}% free, ${paidUsersPercentage}% paid`,
      changeType: 'neutral',
      icon: Users,
    },
    {
      name: 'Total Teams',
      value: stats.totalTeams.toLocaleString(),
      change: `${avgMembersPerTeam} avg members`,
      changeType: 'neutral',
      icon: Building2,
    },
    {
      name: 'New Users (30D)',
      value: stats.newUsersLast30Days.toLocaleString(),
      change: `${newUsersGrowth >= 0 ? '+' : ''}${newUsersGrowth}%`,
      changeType: newUsersGrowth >= 0 ? 'positive' : 'negative',
      icon: UserCheck,
    },
    {
      name: 'Cancellations (30D)',
      value: stats.subscriptionsCancelledLast30Days.toLocaleString(),
      change: `${stats.totalUsers > 0 ? Math.round((stats.subscriptionsCancelledLast30Days / stats.totalUsers) * 100) : 0}% of total`,
      changeType: stats.subscriptionsCancelledLast30Days > 0 ? 'negative' : 'positive',
      icon: UserX,
    },
    {
      name: 'Active Users',
      value: `${activeUsersPercentage}%`,
      change: `${stats.activeUsers} users`,
      changeType: activeUsersPercentage >= 90 ? 'positive' : activeUsersPercentage >= 70 ? 'neutral' : 'negative',
      icon: Activity,
    },
    {
      name: 'Active Teams',
      value: `${activeTeamsPercentage}%`,
      change: `${stats.activeTeams} teams`,
      changeType: activeTeamsPercentage >= 90 ? 'positive' : activeTeamsPercentage >= 70 ? 'neutral' : 'negative',
      icon: Shield,
    },
    {
      name: 'Free Plans',
      value: stats.freeUsers.toLocaleString(),
      change: `${freeUsersPercentage}% of users`,
      changeType: 'neutral',
      icon: Users,
    },
    {
      name: 'Paid Plans',
      value: paidUsersCount.toLocaleString(),
      change: `${paidUsersPercentage}% of users`,
      changeType: 'positive',
      icon: CreditCard,
    },
  ];

  const systemMetrics = [
    { name: 'CPU Usage', value: 45, status: 'good' },
    { name: 'Memory Usage', value: 67, status: 'warning' },
    { name: 'Disk Usage', value: 23, status: 'good' },
    { name: 'Network I/O', value: 89, status: 'critical' },
  ];

  // Subscription breakdown
  const subscriptionBreakdown = [
    { plan: 'Free', count: stats.freeUsers, color: 'bg-gray-500' },
    { plan: 'Pro', count: stats.proUsers, color: 'bg-blue-500' },
    { plan: 'Enterprise', count: stats.enterpriseUsers, color: 'bg-purple-500' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'success': return 'bg-green-50 text-green-700 border-green-200';
      case 'warning': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'error': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'positive': return 'text-green-500';
      case 'negative': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner fullScreen text="Loading admin data..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Admin Panel</h1>
          <p className="text-sm sm:text-base text-gray-600">Monitor system performance and manage your application.</p>
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

        {/* Admin Stats - Enhanced Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {adminStats.map((stat) => (
            <StatsCard
              key={stat.name}
              title={stat.name}
              value={stat.value}
              icon={stat.icon}
              trend={{
                value: stat.change,
                type: stat.changeType
              }}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
          {/* System Metrics */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center space-x-2 mb-4 sm:mb-6">
              <Server className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">System Metrics</h2>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {systemMetrics.map((metric) => (
                <div key={metric.name} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 min-w-0 flex-1 truncate pr-3">{metric.name}</span>
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                    <div className="w-20 sm:w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getStatusColor(metric.status)}`}
                        style={{ width: `${metric.value}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8 text-right">
                      {metric.value}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subscription Breakdown */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center space-x-2 mb-4 sm:mb-6">
              <Percent className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Subscription Breakdown</h2>
            </div>
            <div className="space-y-4">
              {subscriptionBreakdown.map((sub) => (
                <div key={sub.plan} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${sub.color}`}></div>
                    <span className="text-sm font-medium text-gray-900">{sub.plan}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">{sub.count}</div>
                    <div className="text-xs text-gray-500">
                      {stats.totalUsers > 0 ? Math.round((sub.count / stats.totalUsers) * 100) : 0}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <button className="flex flex-col items-center p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200">
                <Database className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 mb-2" />
                <span className="text-xs sm:text-sm font-medium text-gray-900 text-center leading-tight">Backup Database</span>
              </button>
              <button className="flex flex-col items-center p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200">
                <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 mb-2" />
                <span className="text-xs sm:text-sm font-medium text-gray-900 text-center leading-tight">Security Scan</span>
              </button>
              <button className="flex flex-col items-center p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 mb-2" />
                <span className="text-xs sm:text-sm font-medium text-gray-900 text-center leading-tight">Manage Users</span>
              </button>
              <button className="flex flex-col items-center p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200">
                <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 mb-2" />
                <span className="text-xs sm:text-sm font-medium text-gray-900 text-center leading-tight">View Logs</span>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Recent Activities</h2>
          <div className="space-y-3 sm:space-y-4">
            {recentActivities.slice(0, 8).map((activity) => (
              <div
                key={activity.id}
                className={`p-3 sm:p-4 rounded-lg border ${getSeverityColor(activity.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium break-words">{activity.message}</p>
                    <p className="text-xs mt-1 opacity-75">{activity.timestamp}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ml-3 flex-shrink-0 ${
                    activity.severity === 'success' ? 'bg-green-100 text-green-800' :
                    activity.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                    activity.severity === 'error' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {activity.type.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}