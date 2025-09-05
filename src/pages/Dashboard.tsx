import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { StatsCard } from '../components/common/StatsCard';
import { Table, TableColumn } from '../components/common/Table';
import { useGamificationData } from '../hooks/useGamificationData';
import { useStudyAssignments } from '../hooks/useStudyAssignments';
import { useQuizSession } from '../contexts/QuizSessionContext';
import { useQuestion } from '../contexts/QuestionContext';
import { useAuth } from '../contexts/AuthContext';
import { WeeklyScheduleTable } from '../components/schedule/WeeklyScheduleTable';
import { XP_PER_LEVEL, calculateXpProgress } from '../constants/gamification';
import { 
  Users, 
  DollarSign,
  RotateCcw,
  TrendingUp, 
  Activity,
  ArrowUpRight,
  Trophy,
  Zap,
  Star,
  Target,
  Award,
  Calendar as CalendarIcon,
  CheckCircle,
  Clock
} from 'lucide-react';

const stats = [
  {
    name: 'Total Users',
    value: '12,345',
    change: '+12%',
    changeType: 'positive',
    icon: Users,
  },
  {
    name: 'Revenue',
    value: '$45,678',
    change: '+8%',
    changeType: 'positive',
    icon: DollarSign,
  },
  {
    name: 'Growth Rate',
    value: '23.4%',
    change: '-3%',
    changeType: 'negative',
    icon: TrendingUp,
  },
  {
    name: 'Active Sessions',
    value: '1,234',
    change: '+15%',
    changeType: 'positive',
    icon: Activity,
  },
];

const recentActivity = [
  {
    id: 1,
    user: 'John Doe',
    action: 'Upgraded to Pro plan',
    time: '2 hours ago',
    avatar: 'JD',
  },
  {
    id: 2,
    user: 'Jane Smith',
    action: 'Created new project',
    time: '4 hours ago',
    avatar: 'JS',
  },
  {
    id: 3,
    user: 'Mike Johnson',
    action: 'Cancelled subscription',
    time: '6 hours ago',
    avatar: 'MJ',
  },
  {
    id: 4,
    user: 'Sarah Wilson',
    action: 'Invited team member',
    time: '8 hours ago',
    avatar: 'SW',
  },
];

export function Dashboard() {
  const { user, developerLog } = useAuth();
  
  // Debug logging at component start
  React.useEffect(() => {
    developerLog('🔍 Dashboard: Component loaded with user:', user);
    developerLog('🔍 Dashboard: User subscription plan:', user?.subscription?.plan);
    developerLog('🔍 Dashboard: User plan settings:', user?.planSettings);
    developerLog('🔍 Dashboard: User question tier access:', user?.planSettings?.question_tier_access);
  }, [user, developerLog]);
  
  const { userStats, userAchievements, achievements, loading: gamificationLoading, error: gamificationError } = useGamificationData();
  const { assignments, loading: assignmentsLoading } = useStudyAssignments();
  const { getSessionForAssignment } = useQuizSession();
  const { questions, loading: questionsLoading } = useQuestion();
  
  // Debug logging for questions data
  React.useEffect(() => {
    developerLog('🔍 Dashboard: Questions loaded from context:', questions.length, 'total questions');
    developerLog('🔍 Dashboard: Questions loading state:', questionsLoading);
    if (questions.length > 0) {
      const questionsByTier = questions.reduce((acc, q) => {
        acc[q.tier] = (acc[q.tier] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      developerLog('🔍 Dashboard: Questions by tier:', questionsByTier);
      
      const questionsByBook = questions.reduce((acc, q) => {
        acc[q.book_of_bible] = (acc[q.book_of_bible] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      developerLog('🔍 Dashboard: Questions by book:', questionsByBook);
    }
  }, [questions, questionsLoading, developerLog]);
  
  const navigate = useNavigate();

  // Add logging at component render level
  React.useEffect(() => {
    developerLog('*** Dashboard render: questions.length =', questions.length);
    developerLog('Dashboard render: questions.length =', questions.length);
    developerLog('Dashboard render: user subscription plan =', user?.subscription?.plan);
    developerLog('Dashboard render: user plan settings =', user?.planSettings);
  }, [questions, user, developerLog]);

  // Calculate XP progress to next level
  const getXpProgress = () => {
    if (!userStats) return { current: 0, needed: 1000, percentage: 0 };
    
    return calculateXpProgress(userStats.total_xp, userStats.current_level);
  };

  const xpProgress = getXpProgress();


  return (
    <Layout>
      <div className="p-4 sm:p-6">
        {/* Show loading state while questions are being fetched */}
        {questionsLoading && (
          <div className="mb-8 bg-white rounded-xl shadow-sm p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading questions...</p>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's your progress and recent activity.</p>
        </div>

        {/* Weekly Schedule - Moved to top */}
        {!questionsLoading && (
          <div className="mb-8">
            <WeeklyScheduleTable
             allAssignments={assignments.filter(a => a.user_id === user?.id)}
              loading={assignmentsLoading}
              user={user}
              questions={questions}
              getSessionForAssignment={getSessionForAssignment}
              developerLog={developerLog}
            />
          </div>
        )}

        {/* Gamification Stats */}
        {!gamificationLoading && !gamificationError && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Progress</h2>
            {userStats ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
                  <StatsCard
                    title="Level"
                    value={userStats.current_level}
                    subtitle={`${userStats.total_xp.toLocaleString()} total XP`}
                    icon={Star}
                    iconColor="text-yellow-600"
                  />
                  <StatsCard
                    title="Longest Streak"
                    value={`${userStats.longest_streak} days`}
                    subtitle="consecutive study days"
                    icon={Zap}
                    iconColor="text-orange-600"
                  />
                  <StatsCard
                    title="Current Streak"
                    value={`${userStats.current_streak || 0} day${(userStats.current_streak || 0) !== 1 ? 's' : ''}`}
                    subtitle="consecutive study days"
                    icon={Activity}
                    iconColor="text-green-600"
                  />
                  <StatsCard
                    title="Achievements"
                    value={userAchievements.length}
                    subtitle="unlocked"
                    icon={Award}
                    iconColor="text-purple-600"
                  />
                </div>
                
                {/* XP Progress Bar */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-md font-semibold text-gray-900">Level Progress</h3>
                    <span className="text-sm text-gray-600">
                      Level {userStats.current_level} ({Math.round(xpProgress.percentage)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${xpProgress.percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{userStats.total_xp.toLocaleString()} XP</span>
                    <span>{xpProgress.needed} XP to Level {userStats.current_level + 1}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Progress Yet</h3>
                <p className="text-gray-600 mb-4">
                  Complete your first quiz to start tracking your progress, XP, and study streak!
                </p>
                <button
                  onClick={() => navigate('/quiz')}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                >
                  Start Your First Quiz
                </button>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Achievements */}
          {!gamificationLoading && !gamificationError && userAchievements.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Achievements</h2>
              <div className="space-y-3">
                {userAchievements.slice(0, 5).map((userAchievement, index) => {
                  // Find the achievement details by ID
                  const achievementDetails = achievements.find(a => a.id === userAchievement.achievement_id);
                  
                  return (
                    <div key={`${userAchievement.user_id}-${userAchievement.achievement_id}`} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                      <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Trophy className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {achievementDetails?.name || 'Achievement Unlocked'}
                        </p>
                        {achievementDetails?.description && (
                          <p className="text-xs text-gray-500 truncate">
                            {achievementDetails.description}
                          </p>
                        )}
                        <p className="text-sm text-gray-500">
                          {new Date(userAchievement.unlocked_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link 
                to="/quiz"
                className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 block"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Start Quiz</h3>
                    <p className="text-sm text-gray-500">Begin a new quiz session</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-gray-400" />
                </div>
              </Link>
              <Link 
                to="/schedule"
                className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 block"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">View Schedule</h3>
                    <p className="text-sm text-gray-500">Check your study assignments</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-gray-400" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

    </Layout>
  );
}