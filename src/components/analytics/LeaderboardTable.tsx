import React, { useState } from 'react';
import { Table, TableColumn } from '../common/Table';
import { Badge } from '../common/Badge';
import { formatTotalTime } from '../../utils/quizHelpers';
import { 
  Trophy, 
  Medal, 
  Award,
  TrendingUp,
  Clock,
  Target,
  BookOpen,
  Zap
} from 'lucide-react';

interface TeamMemberAnalytics {
  userId: string;
  userName: string;
  role: string;
  totalQuizzesCompleted: number;
  totalQuestionsAnswered: number;
  averageScore: number;
  totalTimeSpentMinutes: number;
  studyStreak: number;
  totalPointsEarned: number;
  totalPossiblePoints: number;
}

interface LeaderboardTableProps {
  data: TeamMemberAnalytics[];
  loading: boolean;
  error: string | null;
  selectedTimeframe: 'weekly' | 'monthly' | 'all-time';
}

export function LeaderboardTable({ data, loading, error, selectedTimeframe }: LeaderboardTableProps) {
  const [sortField, setSortField] = useState<keyof TeamMemberAnalytics>('totalPointsEarned');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filter out team owners and admins from the leaderboard display
  // Sort by total points earned (descending) by default
  const sortedData = React.useMemo(() => {
    return data
      .filter(member => member.role === 'member')
      .sort((a, b) => b.totalPointsEarned - a.totalPointsEarned);
  }, [data]);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-medium text-gray-500">#{index + 1}</span>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const columns: TableColumn<TeamMemberAnalytics>[] = [
    {
      key: 'rank',
      header: <div className="text-center">Rank</div>,
      render: (_, index) => (
        <div className="flex items-center justify-center">
          {getRankIcon(index)}
        </div>
      ),
      className: 'text-center w-16',
      headerClassName: 'text-center',
    },
    {
      key: 'userName',
      header: 'Team Member',
      render: (member) => (
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center">
            <span className="text-xs font-medium text-indigo-600">
              {member.userName.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div> 
            <div className="font-medium text-gray-900">{member.userName}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'totalPointsEarned',
      header: 'XP',
      render: (member) => (
        <div className="text-center">
          <div className="font-bold text-lg text-gray-900">
            {member.totalPointsEarned.toLocaleString()}
          </div>
        </div>
      ),
      className: 'text-center',
      headerClassName: 'text-center',
    },
    {
      key: 'averageScore',
      header: 'Average Score',
      render: (member) => (
        <div className="text-center">
          <div className={`font-bold text-lg ${getScoreColor(member.averageScore)}`}>
            {member.averageScore.toFixed(1)}%
          </div>
        </div>
      ),
      className: 'text-center hidden md:table-cell',
      headerClassName: 'text-center hidden md:table-cell',
    },
    {
      key: 'totalQuizzesCompleted',
      header: 'Quizzes',
      render: (member) => (
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1">
            <BookOpen className="h-4 w-4 text-indigo-600" />
            <span className="font-medium text-gray-900">{member.totalQuizzesCompleted}</span>
          </div>
        </div>
      ),
      className: 'text-center hidden md:table-cell',
      headerClassName: 'text-center hidden md:table-cell',
    },
    {
      key: 'totalQuestionsAnswered',
      header: 'Questions',
      render: (member) => (
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1">
            <Target className="h-4 w-4 text-green-600" />
            <span className="font-medium text-gray-900">{member.totalQuestionsAnswered}</span>
          </div>
        </div>
      ),
      className: 'text-center hidden md:table-cell',
      headerClassName: 'text-center hidden md:table-cell',
    },
    {
      key: 'totalTimeSpentMinutes',
      header: 'Study Time',
      render: (member) => (
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1">
            <Clock className="h-4 w-4 text-purple-600" />
            <span className="font-medium text-gray-900">
              {formatTotalTime(member.totalTimeSpentMinutes)}
            </span>
          </div>
        </div>
      ),
      className: 'text-center hidden md:table-cell',
      headerClassName: 'text-center hidden md:table-cell',
    },
  ];

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="text-red-600 mb-4">
          <TrendingUp className="h-12 w-12 mx-auto mb-2" />
          <h3 className="text-lg font-semibold">Error Loading Leaderboard</h3>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Trophy className="h-6 w-6 text-yellow-500" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Team Leaderboard</h2>
          </div>
        </div>
      </div>
      
      <Table
        columns={columns}
        data={sortedData}
        loading={loading}
        emptyState={{
          icon: Trophy,
          title: "No Team Data",
          description: "No team member analytics data available yet. Complete some quizzes to see the leaderboard!"
        }}
      />
      
      {data.length > 0 && (
        <div className="p-4 bg-gray-50 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            Rankings based on total points earned
          </p>
        </div>
      )}
    </div>
  );
}