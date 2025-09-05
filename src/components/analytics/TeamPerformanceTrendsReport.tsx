import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Calendar, BarChart3, Clock, Target, Trophy, Minus, Users, Activity } from 'lucide-react';
import { formatTotalTime } from '../../utils/quizHelpers';

interface TeamPerformanceTrendDataPoint {
  period: string;
  periodStart: Date;
  periodEnd: Date;
  totalQuizzesCompleted: number;
  totalQuestionsAnswered: number;
  totalPointsEarned: number;
  totalPossiblePoints: number;
  averageScore: number;
  totalTimeSpentMinutes: number;
  activeDays: number;
  activeMembers: number;
}

interface TeamPerformanceTrendsReportProps {
  data: TeamPerformanceTrendDataPoint[];
  loading: boolean;
  error: string | null;
  timeframe?: 'weekly' | 'monthly';
  onTimeframeChange?: (timeframe: 'weekly' | 'monthly') => void;
}

export function TeamPerformanceTrendsReport({ 
  data, 
  loading, 
  error, 
  timeframe = 'weekly',
  onTimeframeChange 
}: TeamPerformanceTrendsReportProps) {
  const [selectedMetric, setSelectedMetric] = useState<'score' | 'quizzes' | 'time' | 'members'>('score');

  // Calculate trend for the selected metric
  const calculateTrend = (metric: 'score' | 'quizzes' | 'time' | 'members') => {
    if (data.length < 2) return { direction: 'stable', value: 0, color: 'text-gray-600' };

    // Get the last two periods with data
    const periodsWithData = data.filter(d => {
      switch (metric) {
        case 'score': return d.totalPossiblePoints > 0;
        case 'quizzes': return d.totalQuizzesCompleted > 0;
        case 'time': return d.totalTimeSpentMinutes > 0;
        case 'members': return d.activeMembers > 0;
        default: return false;
      }
    });

    if (periodsWithData.length < 2) return { direction: 'stable', value: 0, color: 'text-gray-600' };

    const latest = periodsWithData[periodsWithData.length - 1];
    const previous = periodsWithData[periodsWithData.length - 2];

    let latestValue: number, previousValue: number;

    switch (metric) {
      case 'score':
        latestValue = latest.averageScore;
        previousValue = previous.averageScore;
        break;
      case 'quizzes':
        latestValue = latest.totalQuizzesCompleted;
        previousValue = previous.totalQuizzesCompleted;
        break;
      case 'time':
        latestValue = latest.totalTimeSpentMinutes;
        previousValue = previous.totalTimeSpentMinutes;
        break;
      case 'members':
        latestValue = latest.activeMembers;
        previousValue = previous.activeMembers;
        break;
    }

    if (previousValue === 0) return { direction: 'stable', value: 0, color: 'text-gray-600' };

    const percentChange = ((latestValue - previousValue) / previousValue) * 100;
    
    if (Math.abs(percentChange) < 5) {
      return { direction: 'stable', value: percentChange, color: 'text-gray-600' };
    } else if (percentChange > 0) {
      return { direction: 'up', value: percentChange, color: 'text-green-600' };
    } else {
      return { direction: 'down', value: percentChange, color: 'text-red-600' };
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <TrendingUp className="h-4 w-4" />;
      case 'down': return <TrendingDown className="h-4 w-4" />;
      default: return <Minus className="h-4 w-4" />;
    }
  };

  // Get summary statistics
  const totalQuizzes = data.reduce((sum, d) => sum + d.totalQuizzesCompleted, 0);
  const totalQuestions = data.reduce((sum, d) => sum + d.totalQuestionsAnswered, 0);
  const totalTime = data.reduce((sum, d) => sum + d.totalTimeSpentMinutes, 0);
  const overallScore = data.reduce((sum, d) => sum + d.totalPossiblePoints, 0) > 0 
    ? (data.reduce((sum, d) => sum + d.totalPointsEarned, 0) / data.reduce((sum, d) => sum + d.totalPossiblePoints, 0)) * 100 
    : 0;
  const maxActiveMembers = data.length > 0 ? Math.max(...data.map(d => d.activeMembers)) : 0;
  const totalActiveDays = data.reduce((sum, d) => sum + d.activeDays, 0);

  const trend = calculateTrend(selectedMetric);

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="text-red-600 mb-4">
          <BarChart3 className="h-12 w-12 mx-auto mb-2" />
          <h3 className="text-lg font-semibold">Error Loading Team Performance Trends</h3>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Team Performance Trends</h2>
              <p className="text-sm text-gray-600">
                Track your team's collective performance and activity over time
              </p>
            </div>
          </div>
          
          {onTimeframeChange && (
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => onTimeframeChange('weekly')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                  timeframe === 'weekly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => onTimeframeChange('monthly')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                  timeframe === 'monthly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Analyzing team performance trends...</p>
          </div>
        ) : data.length === 0 || totalQuizzes === 0 ? (
          <div className="text-center py-8">
            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Team Performance Data</h3>
            <p className="text-gray-600">
              Your team needs to complete more quizzes to see performance trends over time.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-blue-900">{overallScore.toFixed(1)}%</div>
                    <div className="text-sm text-blue-700">Team Average Score</div>
                  </div>
                  <Trophy className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-green-900">{totalQuizzes}</div>
                    <div className="text-sm text-green-700">Total Quizzes</div>
                  </div>
                  <Target className="h-8 w-8 text-green-600" />
                </div>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-purple-900">{totalQuestions}</div>
                    <div className="text-sm text-purple-700">Questions</div>
                  </div>
                  <Target className="h-8 w-8 text-purple-600" />
                </div>
              </div>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-orange-900">{formatTotalTime(totalTime)}</div>
                    <div className="text-sm text-orange-700">Study Time</div>
                  </div>
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
              </div>
              
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-indigo-900">{maxActiveMembers}</div>
                    <div className="text-sm text-indigo-700">Active Members</div>
                  </div>
                  <Users className="h-8 w-8 text-indigo-600" />
                </div>
              </div>
            </div>

            {/* Metric Selector */}
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">View trend for:</span>
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setSelectedMetric('score')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                    selectedMetric === 'score'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Team Score
                </button>
                <button
                  onClick={() => setSelectedMetric('quizzes')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                    selectedMetric === 'quizzes'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Quiz Activity
                </button>
                <button
                  onClick={() => setSelectedMetric('time')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                    selectedMetric === 'time'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Study Time
                </button>
                <button
                  onClick={() => setSelectedMetric('members')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                    selectedMetric === 'members'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Active Members
                </button>
              </div>
            </div>

            {/* Trend Indicator */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className={`flex items-center space-x-2 ${trend.color}`}>
                  {getTrendIcon(trend.direction)}
                  <span className="font-medium">
                    {trend.direction === 'up' ? 'Improving' : 
                     trend.direction === 'down' ? 'Declining' : 'Stable'}
                  </span>
                </div>
                <span className="text-gray-600">
                  {selectedMetric === 'score' && 'Team Average Score'}
                  {selectedMetric === 'quizzes' && 'Quiz Activity'}
                  {selectedMetric === 'time' && 'Study Time'}
                  {selectedMetric === 'members' && 'Active Members'}
                  {Math.abs(trend.value) > 0 && (
                    <span className={trend.color}>
                      {' '}({trend.value > 0 ? '+' : ''}{trend.value.toFixed(1)}%)
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Chart Placeholder */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedMetric === 'score' && 'Team Average Score Trend'}
                {selectedMetric === 'quizzes' && 'Team Quiz Activity Trend'}
                {selectedMetric === 'time' && 'Team Study Time Trend'}
                {selectedMetric === 'members' && 'Active Members Trend'}
              </h3>
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 font-medium">Interactive Chart Would Go Here</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Integration with charting library (e.g., Chart.js, Recharts) needed
                  </p>
                  <div className="mt-4 text-xs text-gray-400">
                    <p>Data points available: {data.filter(d => {
                      switch (selectedMetric) {
                        case 'score': return d.totalPossiblePoints > 0;
                        case 'quizzes': return d.totalQuizzesCompleted > 0;
                        case 'time': return d.totalTimeSpentMinutes > 0;
                        case 'members': return d.activeMembers > 0;
                        default: return false;
                      }
                    }).length} periods</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Period-by-Period Breakdown */}
            <div className="border border-gray-200 rounded-lg">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Period Breakdown</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {data.slice().reverse().map((period, index) => {
                  const hasData = period.totalQuizzesCompleted > 0;
                  
                  return (
                    <div key={period.period} className={`p-4 ${index > 0 ? 'border-t border-gray-100' : ''} ${!hasData ? 'opacity-50' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{period.period}</div>
                          <div className="text-sm text-gray-600">
                            {period.periodStart.toLocaleDateString()} - {period.periodEnd.toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          {hasData ? (
                            <>
                              <div className="font-bold text-lg text-gray-900">
                                {period.averageScore.toFixed(1)}%
                              </div>
                              <div className="text-sm text-gray-600">
                                {period.totalQuizzesCompleted} quiz{period.totalQuizzesCompleted !== 1 ? 'es' : ''}, {period.totalQuestionsAnswered} questions
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatTotalTime(period.totalTimeSpentMinutes)} study time, {period.activeMembers} active members
                              </div>
                            </>
                          ) : (
                            <div className="text-sm text-gray-400">No team activity</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Insights */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Team Performance Insights:</p>
                  <ul className="space-y-1 text-blue-700">
                    <li>• Monitor team engagement and collective learning progress</li>
                    <li>• Identify periods of high activity and strong team performance</li>
                    <li>• Use trends to motivate team members and celebrate achievements</li>
                    <li>• Track how many team members are actively participating</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}