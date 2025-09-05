import React, { useState } from 'react';
import { Table, TableColumn } from '../common/Table';
import { formatTotalTime } from '../../utils/quizHelpers';
import { 
  Activity, 
  Calendar, 
  Target, 
  Clock, 
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Zap,
  BookOpen
} from 'lucide-react';

interface EngagementDataPoint {
  date: string;
  dateObj: Date;
  quizzesCompleted: number;
  questionsAnswered: number;
  timeSpentMinutes: number;
  averageSessionTime: number;
  studyStreak: number;
}

interface EngagementActivityTableProps {
  data: EngagementDataPoint[];
  loading: boolean;
  error: string | null;
  showIndividual: boolean; // Whether showing individual or team data
}

export function EngagementActivityTable({ data, loading, error, showIndividual }: EngagementActivityTableProps) {
  const [sortField, setSortField] = useState<keyof EngagementDataPoint>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Sort data based on current sort field and direction
  const sortedData = React.useMemo(() => {
    return [...data].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
      }
      
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortDirection === 'desc' 
          ? bValue.getTime() - aValue.getTime()
          : aValue.getTime() - bValue.getTime();
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'desc' 
          ? bValue.localeCompare(aValue)
          : aValue.localeCompare(bValue);
      }
      
      return 0;
    });
  }, [data, sortField, sortDirection]);

  const handleSort = (field: keyof EngagementDataPoint) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // Default to descending for new fields
    }
  };

  const getActivityLevel = (quizzes: number, questions: number): { level: string; color: string } => {
    if (quizzes === 0) return { level: 'No Activity', color: 'text-gray-500' };
    if (quizzes >= 3 || questions >= 50) return { level: 'High', color: 'text-green-600' };
    if (quizzes >= 2 || questions >= 20) return { level: 'Medium', color: 'text-blue-600' };
    return { level: 'Low', color: 'text-yellow-600' };
  };

  const columns: TableColumn<EngagementDataPoint>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (entry) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            {entry.dateObj.toLocaleDateString('en-US', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric' 
            })}
          </div>
          <div className="text-gray-500 text-xs">
            {entry.dateObj.toLocaleDateString()}
          </div>
        </div>
      ),
      className: 'whitespace-nowrap',
      sortable: true,
    },
    {
      key: 'quizzesCompleted',
      header: 'Quizzes',
      render: (entry) => (
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1">
            <BookOpen className="h-4 w-4 text-indigo-600" />
            <span className="font-medium text-gray-900">{entry.quizzesCompleted}</span>
          </div>
        </div>
      ),
      className: 'text-center',
      headerClassName: 'text-center',
      sortable: true,
    },
    {
      key: 'questionsAnswered',
      header: 'Questions',
      render: (entry) => (
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1">
            <Target className="h-4 w-4 text-green-600" />
            <span className="font-medium text-gray-900">{entry.questionsAnswered}</span>
          </div>
        </div>
      ),
      className: 'text-center',
      headerClassName: 'text-center',
      sortable: true,
    },
    {
      key: 'timeSpentMinutes',
      header: 'Study Time',
      render: (entry) => (
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1">
            <Clock className="h-4 w-4 text-purple-600" />
            <span className="font-medium text-gray-900">
              {formatTotalTime(entry.timeSpentMinutes)}
            </span>
          </div>
        </div>
      ),
      className: 'text-center',
      headerClassName: 'text-center',
      sortable: true,
    },
    {
      key: 'averageSessionTime',
      header: 'Avg Session',
      render: (entry) => (
        <div className="text-center">
          <span className="font-medium text-gray-900">
            {entry.averageSessionTime > 0 ? formatTotalTime(entry.averageSessionTime) : '—'}
          </span>
        </div>
      ),
      className: 'text-center',
      headerClassName: 'text-center',
      sortable: true,
    },
    {
      key: 'activity_level',
      header: 'Activity Level',
      render: (entry) => {
        const { level, color } = getActivityLevel(entry.quizzesCompleted, entry.questionsAnswered);
        return (
          <div className="text-center">
            <span className={`font-medium ${color}`}>
              {level}
            </span>
          </div>
        );
      },
      className: 'text-center',
      headerClassName: 'text-center',
    },
    {
      key: 'studyStreak',
      header: 'Streak',
      render: (entry) => (
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1">
            <Zap className="h-4 w-4 text-yellow-600" />
            <span className="font-medium text-gray-900">
              {entry.studyStreak > 0 ? `${entry.studyStreak}` : '—'}
            </span>
          </div>
        </div>
      ),
      className: 'text-center',
      headerClassName: 'text-center',
      sortable: true,
    },
  ];

  // Make columns sortable by adding click handlers
  const sortableColumns = columns.map(column => ({
    ...column,
    header: column.sortable ? (
      <button
        onClick={() => handleSort(column.key as keyof EngagementDataPoint)}
        className="flex items-center justify-center space-x-1 hover:text-indigo-600 transition-colors duration-200 w-full"
      >
        <span>{column.header}</span>
        {sortField === column.key && (
          <TrendingUp 
            className={`h-3 w-3 transition-transform duration-200 ${
              sortDirection === 'desc' ? 'rotate-180' : ''
            }`} 
          />
        )}
      </button>
    ) : column.header
  }));

  // Calculate summary statistics
  const totalQuizzes = data.reduce((sum, d) => sum + d.quizzesCompleted, 0);
  const totalQuestions = data.reduce((sum, d) => sum + d.questionsAnswered, 0);
  const totalTime = data.reduce((sum, d) => sum + d.timeSpentMinutes, 0);
  const activeDays = data.filter(d => d.quizzesCompleted > 0).length;
  const currentStreak = data.length > 0 ? Math.max(...data.map(d => d.studyStreak)) : 0;

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="text-red-600 mb-4">
          <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
          <h3 className="text-lg font-semibold">Error Loading Engagement Data</h3>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Activity className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Daily Activity & Engagement</h2>
            <p className="text-sm text-gray-600">
              {showIndividual 
                ? 'Daily study activity and engagement patterns for this individual'
                : 'Daily study activity and engagement patterns for the team'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-900">{totalQuizzes}</div>
            <div className="text-sm text-blue-700">Total Quizzes</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-900">{totalQuestions}</div>
            <div className="text-sm text-green-700">Total Questions</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-900">{formatTotalTime(totalTime)}</div>
            <div className="text-sm text-purple-700">Total Time</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-900">{activeDays}</div>
            <div className="text-sm text-orange-700">Active Days</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-900">{currentStreak}</div>
            <div className="text-sm text-yellow-700">Best Streak</div>
          </div>
        </div>
      </div>
      
      <Table
        columns={sortableColumns}
        data={sortedData}
        loading={loading}
        emptyState={{
          icon: Activity,
          title: "No Activity Data",
          description: "No daily activity data available for the selected date range. Complete some quizzes to see engagement patterns!"
        }}
      />
      
      {data.length > 0 && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Click column headers to sort • Activity levels: High (3+ quizzes or 50+ questions), Medium (2+ quizzes or 20+ questions), Low (1+ quiz)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}