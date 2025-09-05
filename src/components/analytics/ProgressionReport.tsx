import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, Calendar, BarChart3, Clock, Target, Trophy, Minus } from 'lucide-react';
import { formatTotalTime } from '../../utils/quizHelpers';

interface ProgressionDataPoint {
  period: string;
  periodStart: Date;
  periodEnd: Date;
  totalQuizzesCompleted: number;
  totalQuestionsAnswered: number;
  totalPointsEarned: number;
  totalPossiblePoints: number;
  averageScore: number;
  totalTimeSpentMinutes: number;
  correctAnswers: number;
  incorrectAnswers: number;
}

interface ProgressionReportProps {
  data: ProgressionDataPoint[];
  loading: boolean;
  error: string | null;
  showIndividual: boolean; // Whether showing individual or team data
  timeframe?: 'weekly' | 'monthly';
  onTimeframeChange?: (timeframe: 'weekly' | 'monthly') => void;
}

export function ProgressionReport({ 
  data, 
  loading, 
  error, 
  showIndividual, 
  timeframe = 'weekly',
  onTimeframeChange 
}: ProgressionReportProps) {
  const [selectedMetric, setSelectedMetric] = useState<'score' | 'quizzes' | 'time'>('score');

  // Calculate trend for the selected metric
  const calculateTrend = (metric: 'score' | 'quizzes' | 'time') => {
    if (data.length < 2) return { direction: 'stable', value: 0, color: 'text-gray-600' };

    // Get the last two periods with data
    const periodsWithData = data.filter(d => {
      switch (metric) {
        case 'score': return d.totalPossiblePoints > 0;
        case 'quizzes': return d.totalQuizzesCompleted > 0;
        case 'time': return d.totalTimeSpentMinutes > 0;
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

  // Custom tooltip component for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm text-blue-600">
              Score: {data.averageScore?.toFixed(1)}%
            </p>
            <p className="text-sm text-green-600">
              Quizzes: {data.totalQuizzesCompleted}
            </p>
            <p className="text-sm text-purple-600">
              Questions: {data.totalQuestionsAnswered}
            </p>
            <p className="text-sm text-orange-600">
              Time: {formatTotalTime(data.totalTimeSpentMinutes)}
            </p>
            <p className="text-sm text-gray-600">
              Correct: {data.correctAnswers} | Incorrect: {data.incorrectAnswers}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Get the data key and color based on selected metric
  const getMetricConfig = () => {
    switch (selectedMetric) {
      case 'score':
        return {
          dataKey: 'averageScore',
          color: '#3b82f6',
          yAxisFormatter: (value: number) => `${value}%`,
          domain: [0, 100]
        };
      case 'quizzes':
        return {
          dataKey: 'totalQuizzesCompleted',
          color: '#10b981',
          yAxisFormatter: (value: number) => value.toString(),
          domain: [0, 'dataMax']
        };
      case 'time':
        return {
          dataKey: 'totalTimeSpentMinutes',
          color: '#8b5cf6',
          yAxisFormatter: (value: number) => formatTotalTime(value),
          domain: [0, 'dataMax']
        };
      default:
        return {
          dataKey: 'averageScore',
          color: '#3b82f6',
          yAxisFormatter: (value: number) => `${value}%`,
          domain: [0, 100]
        };
    }
  };

  const metricConfig = getMetricConfig();
  // Get summary statistics
  const totalQuizzes = data.reduce((sum, d) => sum + d.totalQuizzesCompleted, 0);
  const totalQuestions = data.reduce((sum, d) => sum + d.totalQuestionsAnswered, 0);
  const totalTime = data.reduce((sum, d) => sum + d.totalTimeSpentMinutes, 0);
  const overallScore = data.reduce((sum, d) => sum + d.totalPossiblePoints, 0) > 0 
    ? (data.reduce((sum, d) => sum + d.totalPointsEarned, 0) / data.reduce((sum, d) => sum + d.totalPossiblePoints, 0)) * 100 
    : 0;

  const trend = calculateTrend(selectedMetric);

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="text-red-600 mb-4">
          <BarChart3 className="h-12 w-12 mx-auto mb-2" />
          <h3 className="text-lg font-semibold">Error Loading Progression Report</h3>
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
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Performance Progression</h2>
              <p className="text-sm text-gray-600">
                {showIndividual 
                  ? 'Individual performance trends over time'
                  : 'Team performance trends over time'
                }
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
            <p className="text-gray-600">Analyzing progression data...</p>
          </div>
        ) : data.length === 0 || totalQuizzes === 0 ? (
          <div className="text-center py-8">
            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Progression Data</h3>
            <p className="text-gray-600">
              {showIndividual 
                ? 'This individual needs to complete more quizzes to see progression trends.'
                : 'The team needs to complete more quizzes to see progression trends.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-blue-900">{overallScore.toFixed(1)}%</div>
                    <div className="text-sm text-blue-700">Overall Score</div>
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
                  Average Score
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
                  {selectedMetric === 'score' && 'Average Score'}
                  {selectedMetric === 'quizzes' && 'Quiz Activity'}
                  {selectedMetric === 'time' && 'Study Time'}
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
                {selectedMetric === 'score' && 'Average Score Trend'}
                {selectedMetric === 'quizzes' && 'Quiz Activity Trend'}
                {selectedMetric === 'time' && 'Study Time Trend'}
              </h3>
              {data.length === 0 ? (
                <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 font-medium">No Data Available</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Complete more quizzes to see progression trends
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="period" 
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                        tickFormatter={metricConfig.yAxisFormatter}
                        domain={metricConfig.domain}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey={metricConfig.dataKey}
                        stroke={metricConfig.color}
                        strokeWidth={3}
                        dot={{ fill: metricConfig.color, strokeWidth: 2, r: 5 }}
                        activeDot={{ r: 7, stroke: metricConfig.color, strokeWidth: 2 }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
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
                                {formatTotalTime(period.totalTimeSpentMinutes)} study time
                              </div>
                            </>
                          ) : (
                            <div className="text-sm text-gray-400">No activity</div>
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
                  <p className="font-medium mb-1">Progression Insights:</p>
                  <ul className="space-y-1 text-blue-700">
                    <li>• Track your progress toward the 90% pass rate goal</li>
                    <li>• Identify periods of high activity and strong performance</li>
                    <li>• Use trends to adjust study schedules and focus areas</li>
                    <li>• Consistent practice leads to better retention and scores</li>
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