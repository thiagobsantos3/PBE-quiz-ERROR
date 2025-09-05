import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { AlertMessage } from '../common/AlertMessage';
import { formatTime } from '../../utils/formatters';
import { 
  CheckCircle, 
  XCircle, 
  Filter,
  BookOpen,
  Award,
  Clock,
  Target,
  AlertTriangle
} from 'lucide-react';

interface QuizQuestionDetail {
  id: string;
  question_id: string;
  points_earned: number;
  total_points_possible: number;
  time_spent: number;
  is_correct: boolean;
  answered_at: string;
  question: {
    book_of_bible: string;
    chapter: number;
    question: string;
    answer: string;
    points: number;
    tier: string;
  };
}

interface QuizDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizSessionId: string | null;
  quizTitle?: string;
}

type FilterType = 'all' | 'correct' | 'incorrect';

export function QuizDetailsModal({ isOpen, onClose, quizSessionId, quizTitle }: QuizDetailsModalProps) {
  const [questionDetails, setQuestionDetails] = useState<QuizQuestionDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    if (isOpen && quizSessionId) {
      fetchQuestionDetails();
    }
  }, [isOpen, quizSessionId]);

  const fetchQuestionDetails = async () => {
    if (!quizSessionId) return;

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Fetching question details for quiz session:', quizSessionId);

      const { data, error } = await supabase
        .from('quiz_question_logs')
        .select(`
          id,
          question_id,
          points_earned,
          total_points_possible,
          time_spent,
          is_correct,
          answered_at,
          questions!inner (
            book_of_bible,
            chapter,
            question,
            answer,
            points,
            tier
          )
        `)
        .eq('quiz_session_id', quizSessionId)
        .order('answered_at', { ascending: true });

      if (error) {
        console.error('❌ Error fetching question details:', error);
        throw error;
      }

      console.log('✅ Question details fetched:', data?.length || 0, 'questions');
      setQuestionDetails(data || []);
    } catch (err: any) {
      console.error('💥 Error fetching question details:', err);
      setError(err.message || 'Failed to load question details');
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestions = questionDetails.filter(detail => {
    switch (filter) {
      case 'correct':
        return detail.is_correct;
      case 'incorrect':
        return !detail.is_correct;
      default:
        return true;
    }
  });

  const stats = {
    total: questionDetails.length,
    correct: questionDetails.filter(q => q.is_correct).length,
    incorrect: questionDetails.filter(q => !q.is_correct).length,
    totalPoints: questionDetails.reduce((sum, q) => sum + q.points_earned, 0),
    maxPoints: questionDetails.reduce((sum, q) => sum + q.total_points_possible, 0),
    averageTime: questionDetails.length > 0 
      ? Math.round(questionDetails.reduce((sum, q) => sum + q.time_spent, 0) / questionDetails.length)
      : 0
  };

  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Quiz Details${quizTitle ? `: ${quizTitle}` : ''}`}
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
      {loading ? (
        <LoadingSpinner text="Loading question details..." className="py-8" />
      ) : error ? (
        <AlertMessage type="error" message={error} />
      ) : (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
              <div className="text-sm text-blue-700">Total Questions</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-900">{accuracy}%</div>
              <div className="text-sm text-green-700">Accuracy</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-900">{stats.totalPoints}</div>
              <div className="text-sm text-purple-700">Points Earned</div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-900">{formatTime(stats.averageTime)}</div>
              <div className="text-sm text-orange-700">Avg Time</div>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Filter:</span>
              </div>
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
            </div>
            <div className="text-sm text-gray-600">
              Showing {filteredQuestions.length} of {stats.total} questions
            </div>
          </div>

          {/* Questions List */}
          <div className="max-h-96 overflow-y-auto space-y-4">
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Questions Found</h3>
                <p className="text-gray-600">
                  {filter === 'all' 
                    ? 'No question details available for this quiz.'
                    : `No ${filter} questions found.`
                  }
                </p>
              </div>
            ) : (
              filteredQuestions.map((detail, index) => (
                <div 
                  key={detail.id} 
                  className={`border rounded-lg p-4 ${
                    detail.is_correct 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      {detail.question ? (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <BookOpen className="h-4 w-4" />
                          <span>{detail.question.book_of_bible} Chapter {detail.question.chapter}</span>
                          <span>•</span>
                          <span className="capitalize">{detail.question.tier} tier</span>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 italic">Question details not available</div>
                      )}
                    </div>
                    <div>
                      {detail.is_correct ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm mb-3">
                    <div className="flex items-center space-x-1">
                      <Award className="h-4 w-4 text-purple-600" />
                      <span className="font-medium">
                        {detail.points_earned}/{detail.total_points_possible} pts
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4 text-orange-600" />
                      <span>{formatTime(detail.time_spent)}</span>
                    </div>
                  </div>

                  {detail.question ? (
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">Question:</div>
                        <div className="text-gray-900">{detail.question.question}</div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">Correct Answer:</div>
                        <div className="text-gray-900">{detail.question.answer}</div>
                      </div>

                      {!detail.is_correct && (
                        <div className="bg-red-100 border border-red-200 rounded p-2">
                          <div className="text-sm font-medium text-red-700 mb-1">Result:</div>
                          <div className="text-red-800">
                            Incorrect answer - {detail.points_earned} of {detail.total_points_possible} points earned
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-100 border border-gray-200 rounded p-3">
                      <div className="text-sm text-gray-600">
                        Question details are not available for this entry. This may occur if the question was deleted after the quiz was completed.
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}