import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useTeamManagement } from '../hooks/useTeamManagement';
import { useAnalyticsData } from '../hooks/useAnalyticsData';
import { useKnowledgeGapsData } from '../hooks/useKnowledgeGapsData';
import { useProgressionData } from '../hooks/useProgressionData';
import { useQuizHistoryData } from '../hooks/useQuizHistoryData';
import { useStudyScheduleAnalysisData } from '../hooks/useStudyScheduleAnalysisData';
import { useQuestionPerformanceData } from '../hooks/useQuestionPerformanceData';
import { useEngagementData } from '../hooks/useEngagementData';
import { useTeamPerformanceTrendsData } from '../hooks/useTeamPerformanceTrendsData';
import { useBookChapterPerformanceData } from '../hooks/useBookChapterPerformanceData';
import { AnalyticsProvider, AnalyticsContextType } from '../contexts/AnalyticsContext';
import { TeamMemberSelector } from '../components/schedule/TeamMemberSelector';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { AlertMessage } from '../components/common/AlertMessage';
import { OverviewTab } from '../components/analytics/OverviewTab';
import { QuizHistoryTab } from '../components/analytics/QuizHistoryTab';
import { StudyScheduleTab } from '../components/analytics/StudyScheduleTab';
import { KnowledgeGapsTab } from '../components/analytics/KnowledgeGapsTab';
import { QuestionPerformanceTab } from '../components/analytics/QuestionPerformanceTab';
import { ActivityTab } from '../components/analytics/ActivityTab';
import { TeamTrendsTab } from '../components/analytics/TeamTrendsTab';
import { BookChapterPerformanceTab } from '../components/analytics/BookChapterPerformanceTab';
import { 
  BarChart3,
  Clock,
  Calendar,
  Target,
  Trophy,
  CalendarDays,
  BookOpen,
  Brain,
  Award,
  Activity,
  TrendingUp as TrendingUpIcon
} from 'lucide-react';

// Constants
const DEFAULT_DATE_RANGE_MONTHS = 3;

type AnalyticsTab = 'overview' | 'quiz-history' | 'study-schedule' | 'knowledge-gaps' | 'question-performance' | 'activity' | 'book-chapter-performance' | 'team-trends';

// Tab configuration
const TABS_CONFIG = [
  { id: 'overview', name: 'Overview', icon: BarChart3 },
  { id: 'quiz-history', name: 'Quiz History', icon: BookOpen, requiresIndividualView: true },
  { id: 'study-schedule', name: 'Study Schedule', icon: Calendar, requiresIndividualView: true },
  { id: 'knowledge-gaps', name: 'Knowledge Gaps', icon: Brain },
  { id: 'question-performance', name: 'Question Performance', icon: Target },
  { id: 'activity', name: 'Daily Activity', icon: Activity },
  { id: 'book-chapter-performance', name: 'Book/Chapter', icon: BookOpen },
  { id: 'team-trends', name: 'Team Trends', icon: TrendingUpIcon, requiresTeamView: true },
];

export function Analytics() {
  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP LEVEL
  const { user, refreshUser, developerLog } = useAuth();
  const navigate = useNavigate();

  // Track if initial member selection has been done
  const isInitialMemberSelectionDone = useRef(false);

  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>(undefined);
  const [progressionTimeframe, setProgressionTimeframe] = useState<'weekly' | 'monthly'>('weekly');
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  
  // Date range state - default to last 3 months
  const [startDate, setStartDate] = useState<Date>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - DEFAULT_DATE_RANGE_MONTHS);
    return date;
  });
  const [endDate, setEndDate] = useState<Date>(new Date());

  // Fetch team members for the selector - ALWAYS call this hook
  const { teamMembers, loading: teamMembersLoading, error: teamMembersError } = useTeamManagement();

  // ALL DATA-FETCHING HOOKS MUST BE CALLED UNCONDITIONALLY - ALWAYS call these hooks
  const { data: analyticsData, loading: analyticsLoading, error: analyticsError } = useAnalyticsData({
    teamId: user?.teamId,
    userId: selectedMemberId,
    startDate,
    endDate,
  });

  const { data: knowledgeGapsData, loading: knowledgeGapsLoading, error: knowledgeGapsError } = useKnowledgeGapsData({
    teamId: user?.teamId,
    userId: selectedMemberId,
    startDate,
    endDate,
  });

  const { data: progressionData, loading: progressionLoading, error: progressionError } = useProgressionData({
    teamId: user?.teamId,
    userId: selectedMemberId,
    timeframe: progressionTimeframe,
    startDate,
    endDate,
  });

  const { data: quizHistoryData, loading: quizHistoryLoading, error: quizHistoryError } = useQuizHistoryData({
    userId: selectedMemberId,
    startDate,
    endDate,
  });

  const { data: studyScheduleData, loading: studyScheduleLoading, error: studyScheduleError } = useStudyScheduleAnalysisData({
    teamId: user?.teamId,
    userId: selectedMemberId,
    startDate,
    endDate,
  });

  const { data: questionPerformanceData, loading: questionPerformanceLoading, error: questionPerformanceError } = useQuestionPerformanceData({
    teamId: user?.teamId,
    userId: selectedMemberId,
    startDate,
    endDate,
  });

  const { data: engagementData, loading: engagementLoading, error: engagementError } = useEngagementData({
    teamId: user?.teamId,
    userId: selectedMemberId,
    startDate,
    endDate,
  });

  const { data: teamTrendsData, loading: teamTrendsLoading, error: teamTrendsError } = useTeamPerformanceTrendsData({
    teamId: selectedMemberId === undefined ? user?.teamId : undefined,
    timeframe: progressionTimeframe,
    startDate,
    endDate,
  });

  const { data: bookChapterData, loading: bookChapterLoading, error: bookChapterError } = useBookChapterPerformanceData({
    teamId: user?.teamId,
    userId: selectedMemberId,
    startDate,
    endDate,
  });

  // Memoized helper functions with correct dependencies
  const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = new Date(e.target.value);
    if (newStartDate <= endDate) {
      setStartDate(newStartDate);
    }
  }, [endDate]);

  const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = new Date(e.target.value);
    if (newEndDate >= startDate) {
      setEndDate(newEndDate);
    }
  }, [startDate]);

  const formatDateForInput = useCallback((date: Date): string => {
    return date.toISOString().split('T')[0];
  }, []);

  const handleRefreshData = useCallback(async () => {
    // Refresh user data which might trigger data refetch in hooks
    try {
      await refreshUser();
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  }, [refreshUser]);

  // Handle tab change with validation
  const handleTabChange = useCallback((tabId: AnalyticsTab) => {
    const isTeamView = selectedMemberId === undefined;
    const tab = TABS_CONFIG.find(t => t.id === tabId);
    
    if (!tab) return;
    
    // Check if tab is available for current view
    if (tab.requiresIndividualView && isTeamView) return;
    if (tab.requiresTeamView && !isTeamView) return;
    
    setActiveTab(tabId);
  }, [selectedMemberId]);

  // Get selected member info for the selector component
  const selectedMemberInfo = useMemo(() => {
    return selectedMemberId ? teamMembers.find(m => m.userId === selectedMemberId) : undefined;
  }, [selectedMemberId, teamMembers]);

  // Get available tabs based on current view
  const availableTabs = useMemo(() => {
    const isTeamView = selectedMemberId === undefined;
    return TABS_CONFIG.filter(tab => {
      if (tab.requiresIndividualView && isTeamView) return false;
      if (tab.requiresTeamView && !isTeamView) return false;
      return true;
    });
  }, [selectedMemberId]);

  // Calculate date range duration
  const dateRangeDays = useMemo(() => {
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  }, [startDate, endDate]);

  // Prepare context value with memoization
  const contextValue: AnalyticsContextType = useMemo(() => ({
    user,
    selectedMemberId,
    setSelectedMemberId,
    teamMembers,
    canSelectIndividuals: user?.teamRole === 'owner' || user?.teamRole === 'admin',
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    progressionTimeframe,
    setProgressionTimeframe,
    analyticsData,
    analyticsLoading,
    analyticsError,
    knowledgeGapsData,
    knowledgeGapsLoading,
    knowledgeGapsError,
    progressionData,
    progressionLoading,
    progressionError,
    quizHistoryData,
    quizHistoryLoading,
    quizHistoryError,
    studyScheduleData,
    studyScheduleLoading,
    studyScheduleError,
    questionPerformanceData,
    questionPerformanceLoading,
    questionPerformanceError,
    engagementData,
    engagementLoading,
    engagementError,
    teamTrendsData,
    teamTrendsLoading,
    teamTrendsError,
    bookChapterData,
    bookChapterLoading,
    bookChapterError,
    selectedMemberInfo,
  }), [
    user,
    selectedMemberId,
    teamMembers,
    startDate,
    endDate,
    progressionTimeframe,
    analyticsData,
    analyticsLoading,
    analyticsError,
    knowledgeGapsData,
    knowledgeGapsLoading,
    knowledgeGapsError,
    progressionData,
    progressionLoading,
    progressionError,
    quizHistoryData,
    quizHistoryLoading,
    quizHistoryError,
    studyScheduleData,
    studyScheduleLoading,
    studyScheduleError,
    questionPerformanceData,
    questionPerformanceLoading,
    questionPerformanceError,
    engagementData,
    engagementLoading,
    engagementError,
    teamTrendsData,
    teamTrendsLoading,
    teamTrendsError,
    bookChapterData,
    bookChapterLoading,
    bookChapterError,
    selectedMemberInfo,
  ]);

  // Initialize selected member based on user's team role and team members data
  useEffect(() => {
    if (user && teamMembers.length > 0 && !isInitialMemberSelectionDone.current) {
      // If user is a team member (not owner/admin), default to their own ID
      if (user.teamRole === 'member') {
        setSelectedMemberId(user.id);
      } else {
        // For owners/admins, default to 'all team' (undefined userId)
        setSelectedMemberId(undefined);
      }
      isInitialMemberSelectionDone.current = true;
    }
  }, [user, teamMembers]);

  // Ensure active tab is available
  useEffect(() => {
    const currentTab = availableTabs.find(tab => tab.id === activeTab);
    if (!currentTab) {
      setActiveTab('overview');
    }
  }, [availableTabs, activeTab]);

  // Check if user has analytics access AFTER all hooks are called
  const hasAnalyticsAccess = user?.planSettings?.allow_analytics_access ?? false;

  // Debug logging for analytics access
  if (process.env.NODE_ENV === 'development') {
    developerLog('🔍 Analytics: Current user:', user);
    developerLog('🔍 Analytics: User team info:', { teamId: user?.teamId, teamRole: user?.teamRole });
    developerLog('🔍 Analytics: Plan settings:', user?.planSettings);
    developerLog('🔍 Analytics: Analytics access:', user?.planSettings?.allow_analytics_access);
    developerLog('🔍 Analytics: Selected member ID:', selectedMemberId);
  }

  // Check loading states
  const isAnyDataLoading = analyticsLoading || knowledgeGapsLoading || 
    progressionLoading || quizHistoryLoading || studyScheduleLoading || 
    questionPerformanceLoading || engagementLoading || teamTrendsLoading || 
    bookChapterLoading;

  // Check if user can select individuals (owners/admins can, members cannot)
  const canSelectIndividuals = user?.teamRole === 'owner' || user?.teamRole === 'admin';

  const renderTabContent = useCallback(() => {
    try {
      switch (activeTab) {
        case 'overview':
          return <OverviewTab />;
        case 'quiz-history':
          return <QuizHistoryTab />;
        case 'study-schedule':
          return <StudyScheduleTab />;
        case 'knowledge-gaps':
          return <KnowledgeGapsTab />;
        case 'question-performance':
          return <QuestionPerformanceTab />;
        case 'activity':
          return <ActivityTab />;
        case 'team-trends':
          return <TeamTrendsTab />;
        case 'book-chapter-performance':
          return <BookChapterPerformanceTab />;
        default:
          return <OverviewTab />;
      }
    } catch (error) {
      console.error('Error rendering tab content:', error);
      return (
        <div className="text-center py-8">
          <AlertMessage type="error" message="Failed to load tab content. Please try refreshing the page." />
        </div>
      );
    }
  }, [activeTab]);

  // CONDITIONAL RENDERING LOGIC - ALL HOOKS HAVE BEEN CALLED ABOVE THIS POINT

  // Display loading state for data fetching
  if (teamMembersLoading) {
    return (
      <Layout>
        <LoadingSpinner fullScreen text="Loading analytics data..." />
      </Layout>
    );
  }

  // Display error state if data fetching failed
  if (teamMembersError) {
    return (
      <Layout>
        <div className="p-6">
          <AlertMessage type="error" message={teamMembersError || "Failed to load data."} />
        </div>
      </Layout>
    );
  }

  // Render upgrade message if no analytics access
  if (!hasAnalyticsAccess) {
    return (
      <Layout>
        <div className="p-6">
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Analytics</h1>
            <p className="text-gray-600 mb-6">
              Your current plan does not include access to Analytics.
              Upgrade your subscription to unlock this feature and gain valuable insights.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">Upgrade Your Plan</h3>
              <p className="text-blue-800 text-sm">
                Access detailed performance metrics, user engagement data, and more by upgrading to a higher tier.
              </p>
            </div>
            <div className="flex justify-center space-x-4">
              <button
                onClick={async () => {
                  if (process.env.NODE_ENV === 'development') {
                    developerLog('🔄 Analytics: Manually refreshing user profile...');
                  }
                  await refreshUser();
                }}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors duration-200"
              >
                Refresh Permissions
              </button>
              <button
                onClick={() => navigate('/billing')}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
              >
                Upgrade Plan
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Render main analytics content if user has access
  return (
    <Layout>
      <AnalyticsProvider value={contextValue}>
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Analytics</h1>
              <p className="text-gray-600">
                Track performance and progress insights.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRefreshData}
                disabled={isAnyDataLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors duration-200"
              >
                <Calendar className="h-4 w-4" />
                <span>{isAnyDataLoading ? 'Loading...' : 'Refresh'}</span>
              </button>
            </div>
          </div>

          {/* Date Range Selector */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <CalendarDays className="h-5 w-5 text-gray-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Date Range</h3>
                  <p className="text-sm text-gray-600">Filter analytics data by date range</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-2">
                  <label htmlFor="startDate" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    From:
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    value={formatDateForInput(startDate)}
                    onChange={handleStartDateChange}
                    max={formatDateForInput(endDate)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <label htmlFor="endDate" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    To:
                  </label>
                  <input
                    id="endDate"
                    type="date"
                    value={formatDateForInput(endDate)}
                    onChange={handleEndDateChange}
                    min={formatDateForInput(startDate)}
                    max={formatDateForInput(new Date())}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
                  />
                </div>
                
                <div className="text-sm text-gray-500">
                  {dateRangeDays} days
                </div>
              </div>
            </div>
          </div>

          {/* Team Member Selector */}
          <TeamMemberSelector
            teamMembers={teamMembers}
            selectedMemberId={selectedMemberId}
            onSelectMember={setSelectedMemberId}
            selectedMemberInfo={selectedMemberInfo}
            disabled={!canSelectIndividuals}
            includeAllTeamOption={true}
          />

          {/* Dynamic Tabbed Navigation */}
          <div className="bg-white rounded-xl shadow-sm mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6 overflow-x-auto" role="tablist">
                {availableTabs.map((tab) => {
                  const IconComponent = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id as AnalyticsTab)}
                      className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap ${
                        isActive
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`${tab.id}-panel`}
                    >
                      <IconComponent className="h-4 w-4" />
                      <span>{tab.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div 
              className="p-6"
              role="tabpanel"
              id={`${activeTab}-panel`}
              aria-labelledby={`${activeTab}-tab`}
            >
              {renderTabContent()}
            </div>
          </div>
        </div>
      </AnalyticsProvider>
    </Layout>
  );
}