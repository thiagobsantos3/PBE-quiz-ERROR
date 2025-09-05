import React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Layout } from '../components/layout/Layout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQuestion } from '../contexts/QuestionContext';
import { useQuizSession } from '../contexts/QuizSessionContext';
import { supabase } from '../lib/supabase';
import { AlertMessage } from '../components/common/AlertMessage';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Modal } from '../components/common/Modal';
import { formatTimeAgo } from '../utils/formatters';
import { getQuizTypeIcon, getQuizTypeDisplayName } from '../utils/quizUtils';
import { 
  Zap, 
  Edit, 
  Calendar, 
  ArrowRight,
  Clock,
  Users,
  BookOpen,
  Target,
  Trophy,
  Play,
  RotateCcw,
  CheckCircle,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { formatStudyItemsForAssignment } from '../utils/quizHelpers';

interface RecentActivity {
  id: string;
  title: string;
  total_points: number;
  max_points: number;
  completed_at: string;
  estimated_minutes: number;
  type: string;
}

export function Quiz() {
  const { developerLog } = useAuth();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { questions } = useQuestion();
  const { getActiveSessionsForUser, deleteQuizSession } = useQuizSession();
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalActivitiesCount, setTotalActivitiesCount] = useState(0);
  const itemsPerPage = 10;
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [sessionToDeleteId, setSessionToDeleteId] = useState<string | null>(null);

  // Get active quiz sessions for the current user
  const activeSessions = user ? getActiveSessionsForUser(user.id) : [];

  // Memoized helper functions
  const calculateAccuracy = React.useCallback((totalPoints: number, maxPoints: number): number => {
    if (maxPoints === 0) return 0;
    return Math.round((totalPoints / maxPoints) * 100);
  }, []);

  const calculateProgress = React.useCallback((currentIndex: number, totalQuestions: number): number => {
    if (totalQuestions === 0) return 0;
    return Math.round((currentIndex / totalQuestions) * 100);
  }, []);

  const handleDeleteClick = React.useCallback((sessionId: string) => {
    setSessionToDeleteId(sessionId);
    setShowDeleteConfirmModal(true);
  }, []);

  const loadRecentActivities = React.useCallback(async () => {
    if (!user) return;

    try {
      setLoadingActivities(true);
      setActivitiesError(null);

      developerLog('📥 Loading recent quiz activities for user:', user.id);

      const { data, error, count } = await supabase
        .from('quiz_sessions')
        .select('id, title, total_points, max_points, completed_at, estimated_minutes, type', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(itemsPerPage)
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (error) {
        console.error('❌ Error loading recent activities:', error);
        throw error;
      }

      developerLog('✅ Recent activities loaded:', data?.length || 0, 'activities');
      developerLog('🔍 Quiz Center: Recent activities data:', data);
      setRecentActivities(data || []);
      setTotalActivitiesCount(count || 0);
    } catch (error) {
      console.error('💥 Error loading recent activities:', error);
      setActivitiesError('Failed to load recent quiz activities');
    } finally {
      setLoadingActivities(false);
    }
  }, [user, currentPage, itemsPerPage, developerLog]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const totalPages = Math.ceil(totalActivitiesCount / itemsPerPage);

  const handleDeleteConfirm = React.useCallback(async () => {
    if (!sessionToDeleteId) return;

    try {
      await deleteQuizSession(sessionToDeleteId);
      // Reload recent activities to refresh the UI
      await loadRecentActivities();
      setShowDeleteConfirmModal(false);
      setSessionToDeleteId(null);
    } catch (error) {
      console.error('Error deleting quiz session:', error);
      // You could add error handling UI here
    }
  }, [sessionToDeleteId, deleteQuizSession, loadRecentActivities]);

  const handleResumeQuiz = React.useCallback((sessionId: string) => {
    navigate(`/quiz/runner/${sessionId}`);
  }, [navigate]);

  // Load recent quiz activities
  useEffect(() => {
    if (user) {
      loadRecentActivities();
    } else {
      setLoadingActivities(false);
    }
  }, [user, loadRecentActivities]);

  // Reload activities when page changes (this is now handled by the dependency in loadRecentActivities)

  const quizOptions = [
    {
      id: 'quick-start',
      title: 'Quick Start',
      description: 'Jump into a random quiz with questions from your subscription tier. Perfect for quick practice sessions.',
      icon: Zap,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      hoverColor: 'hover:bg-green-100',
      features: [
        'Random questions from your tier',
        '90 questions per session',
        'Instant feedback',
        'Mock PBE test experience'
      ],
      action: 'Start Quiz',
      onClick: () => navigate('/quiz/quick-start'),
      disabled: !user?.planSettings?.allow_quick_start_quiz,
      tooltip: user?.planSettings?.allow_quick_start_quiz ? '' : 'Not available on your current plan',
    },
    {
      id: 'create-your-own',
      title: 'Create Your Own',
      description: 'Build custom quizzes by selecting specific books, chapters, and difficulty levels. Tailor your study experience.',
      icon: Edit,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      hoverColor: 'hover:bg-blue-100',
      features: [
        'Choose specific Bible books',
        'Select chapter ranges',
        'Set difficulty level',
        'Customize question count'
      ],
      action: 'Create Quiz',
      onClick: () => navigate('/quiz/create-own'),
      disabled: !user?.planSettings?.allow_create_own_quiz,
      tooltip: user?.planSettings?.allow_create_own_quiz ? '' : 'Not available on your current plan',
    },
    {
      id: 'study-schedule',
      title: 'Study Schedule',
      description: 'Follow a structured study plan with progressive difficulty and comprehensive coverage of the material.',
      icon: Calendar,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      hoverColor: 'hover:bg-purple-100',
      features: [
        'Structured learning path',
        'Progressive difficulty',
        'Track your progress',
        'Daily study goals'
      ],
      action: 'View Schedule',
      onClick: () => navigate('/schedule'),
      disabled: !user?.planSettings?.allow_study_schedule_quiz,
      tooltip: user?.planSettings?.allow_study_schedule_quiz ? '' : 'Upgrade to Pro plan to access Study Schedule',
    }
  ];

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Quiz Center</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Practice your Pathfinder Bible Experience knowledge with interactive quizzes.
          </p>
        </div>

        {/* Active Quiz Sessions */}
        {activeSessions.length > 0 && (
          <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <RotateCcw className="h-5 w-5 text-blue-600" />
              <span>Resume Quiz Sessions</span>
            </h2>
            <div className="space-y-4">
              {activeSessions.map((session) => {
                const progress = calculateProgress(session.current_question_index, session.questions.length);
                const questionsCompleted = session.results.length;
                const totalQuestions = session.questions.length;
                
                return (
                  <div key={session.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors duration-200 space-y-4 sm:space-y-0">
                    <div className="flex items-center space-x-4">
                      <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        {React.createElement(getQuizTypeIcon(session.type), { className: "h-6 w-6 text-blue-600" })}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-gray-900 truncate">{session.title}</h3>
                        <div className="flex flex-wrap gap-x-2 text-sm text-gray-600">
                          <span className="min-w-0 max-w-full truncate">{getQuizTypeDisplayName(session.type)}</span>
                          <span>•</span>
                          {session.type === 'study-assignment' && (
                            <>
                              <span className="min-w-0 max-w-full truncate">{formatStudyItemsForAssignment(session.study_items || [])}</span>
                              <span>•</span>
                            </>
                          )}
                          <span className="min-w-0 max-w-full truncate">Question {session.current_question_index + 1} of {totalQuestions}</span>
                          <span>•</span>
                          <span className="min-w-0 max-w-full truncate">{session.total_points} points earned</span>
                        </div>
                        <div className="mt-2">
                          <div className="w-full sm:w-48 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {progress}% complete ({questionsCompleted}/{totalQuestions} answered)
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 w-full sm:w-auto justify-end flex-shrink-0">
                      <div className="text-right text-sm text-gray-600 flex-shrink-0">
                        <div>Started</div>
                        <div>{formatTimeAgo(session.created_at)}</div>
                      </div>
                      <button
                        onClick={() => handleDeleteClick(session.id)}
                        className="flex items-center space-x-2 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200"
                        title="Delete quiz session"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleResumeQuiz(session.id)}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>Resume</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteConfirmModal}
          onClose={() => {
            setShowDeleteConfirmModal(false);
            setSessionToDeleteId(null);
          }}
          title="Delete Quiz Session"
          footer={
            <>
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setSessionToDeleteId(null);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
              >
                Delete Session
              </button>
            </>
          }
        >
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
            <div>
              <p className="text-gray-900 mb-2">
                Are you sure you want to delete this quiz session?
              </p>
              <p className="text-sm text-gray-600">
                This action cannot be undone. All progress and results for this session will be permanently lost.
              </p>
            </div>
          </div>
        </Modal>

        {/* Quiz Options */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {quizOptions.map((option) => (
            <div
              key={option.id}
              className={`relative bg-white rounded-xl shadow-sm border-2 ${option.borderColor} transition-all duration-200 group ${
                option.disabled 
                  ? 'opacity-60 cursor-not-allowed' 
                  : `${option.hoverColor} hover:shadow-md cursor-pointer`
              }`}
            >
              {option.disabled && option.tooltip && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-xl z-10">
                  <span className="text-white text-center p-4 font-semibold text-sm">
                    {option.tooltip}
                  </span>
                </div>
              )}
              <div className="p-6 sm:p-8">
                {/* Header */}
                <div className="flex items-center mb-4">
                  <div className={`h-12 w-12 ${option.color} rounded-lg flex items-center justify-center`}>
                    <option.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                      {option.title}
                    </h3>
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {option.description}
                </p>

                {/* Features */}
                <div className="space-y-2 mb-6">
                  {option.features.map((feature, index) => (
                    <div key={index} className="flex items-center text-sm text-gray-600">
                      <div className="h-1.5 w-1.5 bg-gray-400 rounded-full mr-3 flex-shrink-0"></div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Action Button */}
                <button
                  onClick={option.onClick}
                  disabled={option.disabled}
                  className={`w-full flex items-center justify-center space-x-2 py-3 px-4 ${option.color} text-white rounded-lg transition-all duration-200 ${
                    option.disabled 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:opacity-90 group-hover:shadow-lg'
                  }`}
                >
                  <Play className="h-4 w-4" />
                  <span className="font-medium">{option.action}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Quiz Activity</h2>
          
          {/* Loading State */}
          {loadingActivities && (
            <LoadingSpinner text="Loading recent activities..." className="py-8" />
          )}

          {/* Error State */}
          {activitiesError && (
            <AlertMessage
              type="error"
              message={activitiesError}
              className="mb-4"
            />
          )}

          {/* Activities List */}
          {!loadingActivities && !activitiesError && (
            <div className="space-y-4">
              {recentActivities.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recent Activity</h3>
                  <p className="text-gray-600 mb-4">
                    You haven't completed any quizzes yet. Start your first quiz to see your activity here!
                  </p>
                  {user?.planSettings?.allow_quick_start_quiz && (
                    <button
                      onClick={() => navigate('/quiz/quick-start')}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                    >
                      Start Your First Quiz
                    </button>
                  )}
                </div>
              ) : (
                recentActivities.map((activity) => {
                  const accuracy = calculateAccuracy(activity.total_points, activity.max_points);
                  const timeAgo = formatTimeAgo(activity.completed_at);
                  const IconComponent = getQuizTypeIcon(activity.type);
                  
                  return (
                    <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <IconComponent className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 truncate">{activity.title}</p>
                          <div className="flex flex-wrap gap-x-2 text-sm text-gray-600">
                            <span className="min-w-0 max-w-full truncate">Completed with {accuracy}% accuracy</span>
                            <span>•</span>
                            <span className="min-w-0 max-w-full truncate">{activity.total_points}/{activity.max_points} points</span>
                            {activity.estimated_minutes > 0 && (
                              <>
                                <span>•</span>
                                <span className="min-w-0 max-w-full truncate">~{activity.estimated_minutes} min</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500 whitespace-nowrap flex-shrink-0">{timeAgo}</span>
                    </div>
                  );
                })
              )}
            </div>
          )}
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalActivitiesCount)} of {totalActivitiesCount} activities
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}