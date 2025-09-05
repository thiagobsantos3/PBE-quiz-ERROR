import React, { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useTeamLeaderboardData } from '../hooks/useTeamLeaderboardData';
import { LeaderboardTable } from '../components/analytics/LeaderboardTable';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { AlertMessage } from '../components/common/AlertMessage';
import { 
  Trophy, 
  Users, 
  TrendingUp
} from 'lucide-react';

export function Leaderboard() {
  const { user } = useAuth();
  
  // Time filter state
  const [selectedTimeframe, setSelectedTimeframe] = useState<'weekly' | 'monthly' | 'all-time'>('weekly');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Calculate and update date range when timeframe changes
  React.useEffect(() => {
    const now = new Date();
    let newStartDate: Date | undefined;
    let newEndDate: Date | undefined;
    
    switch (selectedTimeframe) {
      case 'weekly': {
        // Calculate current week (Sunday to Saturday)
        newStartDate = new Date(now);
        newStartDate.setDate(now.getDate() - now.getDay()); // Go to Sunday
        newStartDate.setHours(0, 0, 0, 0);
        
        newEndDate = new Date(newStartDate);
        newEndDate.setDate(newStartDate.getDate() + 6); // Go to Saturday
        newEndDate.setHours(23, 59, 59, 999);
        
        break;
      }
      case 'monthly': {
        // Calculate current month
        newStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
        newEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        
        break;
      }
      case 'all-time':
      default:
        newStartDate = undefined;
        newEndDate = undefined;
        break;
    }

    
    // Only update state if dates actually changed to prevent unnecessary re-renders
    const startDateChanged = (newStartDate?.getTime() || 0) !== (startDate?.getTime() || 0);
    const endDateChanged = (newEndDate?.getTime() || 0) !== (endDate?.getTime() || 0);
    
    if (startDateChanged || endDateChanged) {
      setStartDate(newStartDate);
      setEndDate(newEndDate);
    }
  }, [selectedTimeframe, startDate, endDate]);

  // Fetch team leaderboard data
  const { data: leaderboardData, loading, error, refreshData } = useTeamLeaderboardData({
    teamId: user?.teamId,
    startDate,
    endDate,
  });


  // Check if user has a team
  if (!user?.teamId) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No Team Found</h2>
            <p className="text-gray-600">You need to be part of a team to view the leaderboard.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        {/* Time Filter Tabs */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex justify-center">
            <div className="flex items-center space-x-1 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setSelectedTimeframe('weekly')}
                className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  selectedTimeframe === 'weekly'
                    ? 'bg-gray-700 text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setSelectedTimeframe('monthly')}
                className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  selectedTimeframe === 'monthly'
                    ? 'bg-gray-700 text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setSelectedTimeframe('all-time')}
                className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  selectedTimeframe === 'all-time'
                    ? 'bg-gray-700 text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="hidden sm:inline">All Time</span>
                <span className="sm:hidden">All</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <AlertMessage
            type="error"
            message={error}
            className="mb-6"
          />
        )}

        {/* Loading State */}
        {loading && (
          <LoadingSpinner text="Loading team leaderboard..." className="py-8" />
        )}

        {/* Leaderboard Table */}
        {!loading && (
          <LeaderboardTable 
            data={leaderboardData} 
            loading={loading} 
            error={error} 
            selectedTimeframe={selectedTimeframe}
          />
        )}
      </div>
    </Layout>
  );
}