import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { useAnalyticsContext } from '../../contexts/AnalyticsContext';
import { StatsCard } from '../common/StatsCard';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { AlertMessage } from '../common/AlertMessage';
import { ProgressionReport } from './ProgressionReport';
import { formatTotalTime } from '../../utils/quizHelpers';
import { 
  TrendingUp,
  BarChart3,
  BookOpen,
  Target,
  Award,
  Clock,
  Trophy
} from 'lucide-react';

export function OverviewTab() {
  const {
    selectedMemberId,
    progressionTimeframe,
    setProgressionTimeframe,
    analyticsData,
    analyticsLoading,
    analyticsError,
    progressionData,
    progressionLoading,
    progressionError
  } = useAnalyticsContext();

  if (analyticsLoading) {
    return <LoadingSpinner text="Loading overview data..." className="py-8" />;
  }

  if (analyticsError) {
    return <AlertMessage type="error" message={analyticsError} />;
  }

  // Prepare stats cards data
  const statsCardsData = [
    {
      name: 'Quizzes Completed',
      value: analyticsData?.totalQuizzesCompleted?.toLocaleString() || '0',
      icon: BookOpen,
      iconColor: 'text-indigo-600',
    },
    {
      name: 'Questions Answered',
      value: analyticsData?.totalQuestionsAnswered?.toLocaleString() || '0',
      icon: Target,
      iconColor: 'text-green-600',
    },
    {
      name: 'Average Score',
      value: analyticsData?.averageScore ? `${analyticsData.averageScore.toFixed(1)}%` : '0%',
      icon: Award,
      iconColor: 'text-blue-600',
    },
    {
      name: 'Total Study Time',
      value: formatTotalTime(analyticsData?.totalTimeSpentMinutes || 0),
      icon: Clock,
      iconColor: 'text-purple-600',
    },
    {
      name: 'Study Streak',
      value: analyticsData?.studyStreak ? `${analyticsData.studyStreak} day${analyticsData.studyStreak === 1 ? '' : 's'}` : '0 days',
      icon: Trophy,
      iconColor: 'text-yellow-600',
    },
  ];

  // Custom tooltip component for the charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          <div className="space-y-1">
            <p className="text-sm text-blue-600">
              Score: {data.averageScore?.toFixed(1)}%
            </p>
            <p className="text-sm text-green-600">
              Quizzes: {data.totalQuizzesCompleted}
            </p>
            <p className="text-sm text-purple-600">
              Time: {formatTotalTime(data.totalTimeSpentMinutes)}
            </p>
            <p className="text-sm text-orange-600">
              Questions: {data.totalQuestionsAnswered}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Format Y-axis values based on metric type
  const formatYAxisValue = (value: number, metric: string) => {
    switch (metric) {
      case 'averageScore':
        return `${value}%`;
      case 'totalTimeSpentMinutes':
        return formatTotalTime(value);
      default:
        return value.toString();
    }
  };

  return (
    <div className="space-y-8">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
        {statsCardsData.map((metric) => (
          <StatsCard
            key={metric.name}
            title={metric.name}
            value={metric.value}
            icon={metric.icon}
            iconColor={metric.iconColor}
          />
        ))}
      </div>

      {/* Overview Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {selectedMemberId === undefined ? 'Team Performance Trends' : 'Performance Overview'}
          </h2>
          {progressionLoading ? (
            <div className="h-64 flex items-center justify-center">
              <LoadingSpinner text="Loading chart data..." />
            </div>
          ) : progressionError ? (
            <div className="h-64 bg-red-50 rounded-lg flex items-center justify-center">
              <div className="text-center text-red-600">
                <TrendingUp className="h-12 w-12 mx-auto mb-2" />
                <p className="text-sm">Failed to load chart data</p>
              </div>
            </div>
          ) : progressionData && progressionData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                    tickFormatter={(value) => formatYAxisValue(value, 'averageScore')}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="averageScore" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No progression data available</p>
                <p className="text-sm text-gray-400">Complete more quizzes to see trends</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quiz Activity Distribution
          </h2>
          {progressionLoading ? (
            <div className="h-64 flex items-center justify-center">
              <LoadingSpinner text="Loading activity data..." />
            </div>
          ) : progressionError ? (
            <div className="h-64 bg-red-50 rounded-lg flex items-center justify-center">
              <div className="text-center text-red-600">
                <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                <p className="text-sm">Failed to load activity data</p>
              </div>
            </div>
          ) : progressionData && progressionData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={progressionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'totalQuizzesCompleted' ? `${value} quizzes` : `${value} questions`,
                      name === 'totalQuizzesCompleted' ? 'Quizzes Completed' : 'Questions Answered'
                    ]}
                    labelStyle={{ color: '#374151' }}
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #d1d5db',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="totalQuizzesCompleted" 
                    fill="#10b981" 
                    name="Quizzes"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar 
                    dataKey="totalQuestionsAnswered" 
                    fill="#3b82f6" 
                    name="Questions"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No activity data available</p>
                <p className="text-sm text-gray-400">Complete more quizzes to see activity distribution</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Progression Report */}
      <ProgressionReport
        data={progressionData}
        loading={progressionLoading}
        error={progressionError}
        showIndividual={selectedMemberId !== undefined}
        timeframe={progressionTimeframe}
        onTimeframeChange={setProgressionTimeframe}
      />
    </div>
  );
}