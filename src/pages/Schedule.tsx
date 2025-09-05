import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useQuestion } from '../contexts/QuestionContext';
import { useQuizSession } from '../contexts/QuizSessionContext';
import { useNavigate } from 'react-router-dom';
import { StudyAssignment } from '../types';
import { useCalendar } from '../hooks/useCalendar';
import { useStudyAssignments } from '../hooks/useStudyAssignments';
import { useStudyItemForm } from '../hooks/useStudyItemForm';
import { formatStudyItemsForAssignment, calculateTotalQuestionsForStudyItems } from '../utils/quizHelpers';
import { formatDateForDb } from '../utils/dateUtils';
import { Calendar } from 'lucide-react';
import { CalendarGrid } from '../components/schedule/CalendarGrid';
import { TeamMemberSelector } from '../components/schedule/TeamMemberSelector';
import { ScheduleStats } from '../components/schedule/ScheduleStats';
import { AssignmentModal } from '../components/schedule/AssignmentModal';
import { UpcomingAssignmentsList } from '../components/schedule/UpcomingAssignmentsList';
import { WeeklyScheduleTable } from '../components/schedule/WeeklyScheduleTable';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  assignment?: StudyAssignment;
}

export function Schedule() {
  const { user, refreshUser } = useAuth();
  const { developerLog } = useAuth();
  const { questions, fetchQuestions } = useQuestion();
  const { getSessionForAssignment, deleteQuizSession } = useQuizSession();
  const navigate = useNavigate();
  
  // Custom hooks
  const { 
    assignments, 
    teamMembers, 
    loading, 
    error, 
    normalizeAssignment, 
    saveAssignment, 
    deleteAssignment 
  } = useStudyAssignments();
  
  const [selectedViewingMemberId, setSelectedViewingMemberId] = useState<string>('');
  const [selectedAssignmentMembers, setSelectedAssignmentMembers] = useState<string[]>([]);
  
  // Initialize selected member based on user's team role
  useEffect(() => {
    if (teamMembers.length > 0 && !selectedViewingMemberId && user) {
      // Always initialize to the current user's ID first
      setSelectedViewingMemberId(user.id);
    }
  }, [teamMembers, selectedViewingMemberId, user]);

  // Filter assignments by selected member
  const memberAssignments = assignments.filter(a => a.user_id === selectedViewingMemberId);
  
  const { 
    currentDate, 
    setCurrentDate, 
    calendarDays, 
    navigateMonth, 
    monthNames, 
    dayNames 
  } = useCalendar(memberAssignments);
  
  const {
    studyItems,
    currentBook,
    currentChapters,
    currentVerses,
    startVerseInput,
    endVerseInput,
    description,
    setCurrentBook,
    setDescription,
    toggleChapter,
    selectAllChapters,
    clearChapters,
    toggleVerse,
    selectAllVerses,
    clearVerses,
    selectVerseRange,
    updateStartVerseInput,
    updateEndVerseInput,
    addStudyItem,
    removeStudyItem,
    resetForm,
    initializeForm,
    getMaxChapters,
    getVersesForBookChapter
  } = useStudyItemForm(questions);

  // Load questions when component mounts
  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Modal and form state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<StudyAssignment | null>(null);
  const [isNewAssignment, setIsNewAssignment] = useState(false);

  // Get selected member info
  const selectedMember = teamMembers.find(m => m.userId === selectedViewingMemberId);

  // Check if current user can manage schedules (owners and admins only)
  const canManageSchedules = user?.teamRole === 'owner' || user?.teamRole === 'admin';

  // Debug logging for schedule access
  developerLog('🔍 Schedule: Current user:', user);
  developerLog('🔍 Schedule: User team info:', { teamId: user?.teamId, teamRole: user?.teamRole });
  developerLog('🔍 Schedule: Plan settings:', user?.planSettings);
  developerLog('🔍 Schedule: Schedule access:', user?.planSettings?.allow_study_schedule_quiz);

  // Check if user has access to study schedule feature
  const hasScheduleAccess = user?.planSettings?.allow_study_schedule_quiz ?? false;

  // If user doesn't have access to study schedule, show upgrade message
  if (!hasScheduleAccess) {
    return (
      <Layout>
        <div className="p-6">
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Study Schedule</h1>
            <p className="text-gray-600 mb-6">
              Study Schedule is a premium feature that helps you organize and track your Bible study progress with structured assignments.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">Upgrade to Pro Plan</h3>
              <p className="text-blue-800 text-sm">
                Get access to Study Schedule and other premium features by upgrading your subscription.
              </p>
            </div>
            <div className="flex justify-center space-x-4">
              <button
                onClick={async () => {
                  developerLog('🔄 Schedule: Manually refreshing user profile...');
                  await refreshUser();
                }}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors duration-200"
              >
                Refresh Permissions
              </button>
              <button
                onClick={() => navigate('/billing')}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors duration-200"
              >
                Upgrade Plan
              </button>
              <button
                onClick={() => navigate('/quiz')}
                className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Back to Quiz Center
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Debug logging for data consistency
  developerLog('Schedule: All assignments:', assignments);
  developerLog('Schedule: Selected viewing member ID:', selectedViewingMemberId);
  developerLog('Schedule: Filtered member assignments:', memberAssignments);

  // Statistics for selected member
  const stats = {
    totalAssignments: memberAssignments.length,
    thisMonth: memberAssignments.filter(a => {
      return a.date.getMonth() === currentDate.getMonth() && 
             a.date.getFullYear() === currentDate.getFullYear();
    }).length,
    completed: memberAssignments.filter(a => a.completed).length,
    booksScheduled: new Set(
      memberAssignments.flatMap(a => {
        const normalized = normalizeAssignment(a);
        return normalized.study_items.map(item => item.book);
      })
    ).size,
  };

  // Event handlers
  const handleDateClick = (day: CalendarDay) => {
    // Only allow date clicks if user can manage schedules
    if (!day.isCurrentMonth || !selectedViewingMemberId || !canManageSchedules) return;
    
    setSelectedDate(day.date);
    if (day.assignment) {
      // Editing existing assignment
      const normalized = normalizeAssignment(day.assignment);
      setEditingAssignment(normalized);
      initializeForm(normalized.study_items, normalized.description || '');
      setSelectedAssignmentMembers([normalized.user_id]);
      setIsNewAssignment(false);
    } else {
      // Creating new assignment
      setEditingAssignment(null);
      resetForm();
      setSelectedAssignmentMembers(selectedViewingMemberId ? [selectedViewingMemberId] : []);
      setIsNewAssignment(true);
    }
    setShowAssignmentModal(true);
  };

  const handleSaveAssignment = async (selectedMembers: string[], assignmentStudyItems: StudyItem[], assignmentDescription: string) => {
    if (!selectedDate || assignmentStudyItems.length === 0 || selectedMembers.length === 0 || !user) return;

    try {
      // Create assignments for each selected member
      for (const memberId of selectedMembers) {
        const assignment: StudyAssignment = {
          id: editingAssignment?.id || crypto.randomUUID(),
          user_id: memberId,
          team_id: user.teamId || '',
          date: selectedDate,
          study_items: [...assignmentStudyItems],
          description: assignmentDescription.trim() || undefined,
          created_by: user.id,
          created_at: editingAssignment?.created_at || new Date().toISOString(),
          completed: editingAssignment?.completed || false,
          completed_at: editingAssignment?.completed_at,
        };
        
        await saveAssignment(assignment);
      }
      
      setShowAssignmentModal(false);
      resetForm();
      setSelectedDate(null);
      setEditingAssignment(null);
      setSelectedAssignmentMembers([]);
      setIsNewAssignment(false);
    } catch (error) {
      console.error('Error saving assignment:', error);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!editingAssignment) return;
    
    try {
      await deleteAssignment(editingAssignment.id);
      setShowAssignmentModal(false);
      resetForm();
      setSelectedDate(null);
      setEditingAssignment(null);
      setSelectedAssignmentMembers([]);
      setIsNewAssignment(false);
    } catch (error) {
      console.error('Error deleting assignment:', error);
    }
  };

  const handleStartQuiz = (assignment: StudyAssignment) => {
    // Navigate directly to quiz with all study items
    navigate(`/quiz/study-assignment/${assignment.id}`, {
      state: { selectedStudyItems: assignment.study_items }
    });
  };

  const handleResumeQuiz = (assignment: StudyAssignment) => {
    navigate(`/quiz/study-assignment/${assignment.id}`);
  };

  const handleEditAssignment = (assignment: StudyAssignment) => {
    // Only allow editing if user can manage schedules
    if (!canManageSchedules) return;
    
    const date = new Date(assignment.date);
    setSelectedDate(date);
    const normalized = normalizeAssignment(assignment);
    setEditingAssignment(normalized);
    initializeForm(normalized.study_items, normalized.description || '');
    setSelectedAssignmentMembers([normalized.user_id]);
    setIsNewAssignment(false);
    setShowAssignmentModal(true);
  };

  const handleDeleteQuizSession = async (sessionId: string) => {
    try {
      await deleteQuizSession(sessionId);
      // The UI will automatically update as the quiz session context will refresh
    } catch (error) {
      console.error('Error deleting quiz session:', error);
      // You could add error handling UI here if needed
    }
  };

  const handleBookChange = (book: string) => {
    setCurrentBook(book);
    clearChapters();
  };

  const handleMemberSelect = (memberId: string) => {
    // Only allow member selection if user can manage schedules
    if (canManageSchedules) {
      setSelectedViewingMemberId(memberId);
    }
  };

  if (!user?.teamId) {
    return (
      <Layout>
        <div className="p-6">
          <TeamMemberSelector
            teamMembers={[]}
            selectedMemberId=""
            onSelectMember={() => {}}
            disabled={true}
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Study Schedule</h1>
          <p className="text-sm sm:text-base text-gray-600">
            {canManageSchedules 
              ? 'Plan and manage individual study assignments for your team members.'
              : 'View your personal study assignments and start quizzes.'
            }
          </p>
        </div>

        <TeamMemberSelector
          teamMembers={teamMembers}
          selectedMemberId={selectedViewingMemberId}
          onSelectMember={handleMemberSelect}
          selectedMemberInfo={selectedMember}
          disabled={!canManageSchedules}
        />

        <ScheduleStats stats={stats} />

        {/* Weekly Schedule Table */}
        <div className="mb-8">
          <WeeklyScheduleTable
            allAssignments={memberAssignments} // Pass memberAssignments to the component
            loading={loading}
            user={user}
            questions={questions}
            getSessionForAssignment={getSessionForAssignment}
            developerLog={developerLog}
          />
        </div>

        <CalendarGrid
          currentDate={currentDate}
          calendarDays={calendarDays}
          dayNames={dayNames}
          monthNames={monthNames}
          onNavigateMonth={navigateMonth}
          onDateClick={handleDateClick}
          onToday={() => setCurrentDate(new Date())}
          formatStudyItems={(items) => formatStudyItemsForAssignment(items)}
          normalizeAssignment={normalizeAssignment}
          getSessionForAssignment={getSessionForAssignment}
          onStartQuiz={handleStartQuiz}
          onResumeQuiz={handleResumeQuiz}
          user={user}
          canManageSchedules={canManageSchedules}
        />

        <UpcomingAssignmentsList
          memberAssignments={memberAssignments}
          selectedMember={selectedMember}
          user={user}
          getSessionForAssignment={getSessionForAssignment}
          onResumeQuiz={handleResumeQuiz}
          onStartQuiz={handleStartQuiz}
          onEditAssignment={handleEditAssignment}
          normalizeAssignment={normalizeAssignment}
          canManageSchedules={canManageSchedules}
          onDeleteQuizSession={handleDeleteQuizSession}
          questions={questions}
        />

        {/* Only show assignment modal if user can manage schedules */}
        {showAssignmentModal && canManageSchedules && (
          <AssignmentModal
            isOpen={showAssignmentModal}
            onClose={() => {
              setShowAssignmentModal(false);
              resetForm();
              setSelectedDate(null);
              setEditingAssignment(null);
              setSelectedAssignmentMembers([]);
              setIsNewAssignment(false);
            }}
            selectedDate={selectedDate}
            teamMembers={teamMembers}
            isNewAssignment={isNewAssignment}
            initialSelectedMembers={selectedAssignmentMembers}
            editingAssignment={editingAssignment}
            studyItems={studyItems}
            currentBook={currentBook}
            currentChapters={currentChapters}
            currentVerses={currentVerses}
            description={description}
            onBookChange={handleBookChange}
            onDescriptionChange={setDescription}
            onToggleChapter={toggleChapter}
            onSelectAllChapters={selectAllChapters}
            onClearChapters={clearChapters}
            onToggleVerse={toggleVerse}
            onSelectAllVerses={selectAllVerses}
            onClearVerses={clearVerses}
            selectVerseRange={selectVerseRange}
            startVerseInput={startVerseInput}
            endVerseInput={endVerseInput}
            updateStartVerseInput={updateStartVerseInput}
            updateEndVerseInput={updateEndVerseInput}
            onAddStudyItem={addStudyItem}
            onRemoveStudyItem={removeStudyItem}
            onSave={handleSaveAssignment}
            onDelete={handleDeleteAssignment}
            getMaxChapters={getMaxChapters}
            getVersesForBookChapter={getVersesForBookChapter}
            questions={questions}
            currentUserId={user?.id}
          />
        )}

      </div>
    </Layout>
  );
}