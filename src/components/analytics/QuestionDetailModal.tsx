import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { AlertMessage } from '../common/AlertMessage';
import { formatTime, formatTimeAgo } from '../../utils/formatters';
import { 
  BookOpen, 
  Target, 
  Clock, 
  Award, 
  TrendingUp,
  CheckCircle,
  XCircle,
  BarChart3,
  AlertTriangle,
  Users,
  Calendar
} from 'lucide-react';

type FilterType = 'all' | 'correct' | 'incorrect';

interface QuestionAttemptDetail {
  user_id: string;
  user_name: string;
  points_earned: number;
  total_points_possible: number;
  time_spent: number;
  is_correct: boolean;
  answered_at: string;
  question_text: string;
  answer_text: string;
  book_of_bible: string;
  chapter: number;
  tier: string;
  points: number;
}

interface QuizQuestionDetail {
}

interface QuestionPerformanceData {
  question_id: string;
  question_text: string;
  answer_text: string;
  book_of_bible: string;
  chapter: number;
  tier: string;
  points: number;
  total_attempts: number;
  correct_attempts: number;
  incorrect_attempts: number;
  accuracy_rate: number;
  average_time_spent: number;
  total_points_earned: number;
  total_points_possible: number;
}

interface QuestionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: QuestionPerformanceData | null;
  teamId?: string;
}

export function QuestionDetailModal({ isOpen, onClose, question, teamId }: QuestionDetailModalProps) {
  const [allAttempts, setAllAttempts] = useState<QuestionAttemptDetail[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');

  const fetchAllAttempts = async () => {
    if (!question || !teamId) return;

    try {
      console.log('🔍 Fetching all attempts for question:', question.question_id, 'in team:', teamId);

      const { data, error } = await supabase.rpc('get_question_attempts_with_user_details', {
        p_question_id: question.question_id,
        p_team_id: teamId
      });

      if (error) {
        console.error('❌ Error fetching all attempts:', error);
        // Don't throw error here, just log it and continue without team member details
        console.warn('⚠️ Team member attempt details not available, continuing without them');
        setAllAttempts([]);
        return;
      }

      console.log('✅ All attempts fetched:', data?.length || 0, 'attempts');
      setAllAttempts(data || []);
    } catch (err: any) {
      console.error('💥 Error fetching all attempts:', err);
      // Don't set error state, just continue without team member details
      setAllAttempts([]);
    }
  };

  useEffect(() => {
    if (isOpen && question && teamId) {
      fetchAllAttempts();
    }
  }, [isOpen, question, teamId]);
  
  if (!question) return null;

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return 'text-green-600';
    if (accuracy >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAccuracyBgColor = (accuracy: number) => {
    if (accuracy >= 90) return 'bg-green-50 border-green-200';
    if (accuracy >= 50) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };
  
  const filteredAttempts = allAttempts.filter(attempt => {
    switch (filter) {
      case 'correct':
        return attempt.is_correct;
      case 'incorrect':
        return !attempt.is_correct;
      default:
        return true;
    }
  });

  const stats = {
    total: allAttempts.length,
    correct: allAttempts.filter(q => q.is_correct).length,
    incorrect: allAttempts.filter(q => !q.is_correct).length,
    totalPoints: allAttempts.reduce((sum, q) => sum + q.points_earned, 0),
    maxPoints: allAttempts.reduce((sum, q) => sum + q.total_points_possible, 0),
    averageTime: allAttempts.length > 0 
      ? Math.round(allAttempts.reduce((sum, q) => sum + q.time_spent, 0) / allAttempts.length)
      : 0
  };

  const getDifficultyLevel = (accuracy: number) => {
    if (accuracy >= 90) return 'Easy';
    if (accuracy >= 70) return 'Moderate';
    if (accuracy >= 50) return 'Challenging';
    return 'Difficult';
  };

  const pointsEfficiency = question.total_points_possible > 0 
    ? Math.round((question.total_points_earned / question.total_points_possible) * 100)
    : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Question Performance Details"
      maxWidth="4xl"
      footer={
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
        >
          Close
        </button>
      }
    >
      <div className="space-y-6">
        {/* Question Header */}
        <div className={`border rounded-lg p-4 ${getAccuracyBgColor(question.accuracy_rate)}`}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3">
              <BookOpen className="h-6 w-6 text-gray-600" />
              <div>
                <h3 className="font-semibold text-gray-900">
                  {question.book_of_bible} Chapter {question.chapter}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge type="tier" value={question.tier} showIcon />
                  <span className="text-sm text-gray-600">•</span>
                  <span className="text-sm text-gray-600">{question.points} points</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${getAccuracyColor(question.accuracy_rate)}`}>
                {question.accuracy_rate}%
              </div>
              <div className="text-sm text-gray-600">Accuracy</div>
              <div className="text-xs text-gray-500 mt-1">
                {getDifficultyLevel(question.accuracy_rate)}
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-900">{question.total_attempts}</div>
            <div className="text-sm text-blue-700 flex items-center justify-center space-x-1">
              <Users className="h-4 w-4" />
              <span>Total Attempts</span>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-900">{question.correct_attempts}</div>
            <div className="text-sm text-green-700 flex items-center justify-center space-x-1">
              <CheckCircle className="h-4 w-4" />
              <span>Correct</span>
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-900">{question.incorrect_attempts}</div>
            <div className="text-sm text-red-700 flex items-center justify-center space-x-1">
              <XCircle className="h-4 w-4" />
              <span>Incorrect</span>
            </div>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-900">{formatTime(question.average_time_spent)}</div>
            <div className="text-sm text-purple-700 flex items-center justify-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>Avg Time</span>
            </div>
          </div>
        </div>

        {/* Question Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                <Target className="h-4 w-4 text-blue-600" />
                <span>Question</span>
              </h4>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-gray-900">{question.question_text}</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Correct Answer</span>
              </h4>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-gray-900">{question.answer_text}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Performance Analysis */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-purple-600" />
                <span>Performance Analysis</span>
              </h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Success Rate</span>
                  <span className={`font-bold ${getAccuracyColor(question.accuracy_rate)}`}>
                    {question.accuracy_rate}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Points Efficiency</span>
                  <span className={`font-bold ${getAccuracyColor(pointsEfficiency)}`}>
                    {pointsEfficiency}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Difficulty Level</span>
                  <span className={`font-bold ${getAccuracyColor(question.accuracy_rate)}`}>
                    {getDifficultyLevel(question.accuracy_rate)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Average Response Time</span>
                  <span className="font-bold text-gray-900">
                    {formatTime(question.average_time_spent)}
                  </span>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h5 className="font-medium text-blue-900 mb-2 flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>Recommendations</span>
              </h5>
              <div className="text-sm text-blue-800 space-y-1">
                {question.accuracy_rate < 50 && (
                  <p>• Consider reviewing this question for clarity or difficulty</p>
                )}
                {question.accuracy_rate >= 50 && question.accuracy_rate < 70 && (
                  <p>• This question provides good challenge - consider similar difficulty</p>
                )}
                {question.accuracy_rate >= 90 && (
                  <p>• This question may be too easy - consider increasing difficulty</p>
                )}
                {question.average_time_spent > 60 && (
                  <p>• Users take longer than expected - question may need simplification</p>
                )}
                {question.total_attempts < 10 && (
                  <p>• Limited data available - more attempts needed for reliable analysis</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Response Distribution</h4>
          <div className="relative">
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-green-500 h-4 rounded-l-full transition-all duration-300"
                style={{ width: `${(question.correct_attempts / question.total_attempts) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mt-2">
              <span>{question.correct_attempts} Correct</span>
              <span>{question.total_attempts} Total Attempts</span>
              <span>{question.incorrect_attempts} Incorrect</span>
            </div>
          </div>
        </div>

        {/* Team Attempts Section - Always displayed below Response Distribution */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900 flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span>Team Member Attempts</span>
            </h4>
            
            {allAttempts.length > 0 && (
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                    filter === 'all'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All ({stats.total})
                </button>
                <button
                  onClick={() => setFilter('correct')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                    filter === 'correct'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Correct ({stats.correct})
                </button>
                <button
                  onClick={() => setFilter('incorrect')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                    filter === 'incorrect'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Incorrect ({stats.incorrect})
                </button>
              </div>
            )}
          </div>

          {allAttempts.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Team Attempts Found</h3>
              <p className="text-gray-600">
                No team member attempts available for this question.
              </p>
            </div>
          ) : filteredAttempts.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No {filter.charAt(0).toUpperCase() + filter.slice(1)} Attempts</h3>
              <p className="text-gray-600">
                No {filter} attempts found for this question.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {filteredAttempts.map((attempt, index) => (
                <div 
                  key={`${attempt.user_id}-${attempt.answered_at}`} 
                  className={`border rounded-lg p-4 ${
                    attempt.is_correct 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-indigo-600">
                          {attempt.user_name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{attempt.user_name}</div>
                        <div className="text-sm text-gray-600">{formatTimeAgo(attempt.answered_at)}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4 text-orange-600" />
                        <span className="text-sm text-orange-600">{formatTime(attempt.time_spent)}</span>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        attempt.is_correct 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {attempt.is_correct ? 'Correct' : 'Incorrect'}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    Points: {attempt.points_earned} / {attempt.total_points_possible}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}