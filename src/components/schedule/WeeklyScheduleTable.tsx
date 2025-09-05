import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableColumn } from '../common/Table';
import { formatDateForDisplay, getUtcMidnight } from '../../utils/dateUtils';
import { formatStudyItemsForAssignment, calculateTotalQuestionsForStudyItems } from '../../utils/quizHelpers';
import { StudyAssignment, Question, User } from '../../types';
import { 
  CalendarIcon,
  CheckCircle,
  Clock,
  Target
} from 'lucide-react';

interface WeeklyScheduleTableProps {
  allAssignments: StudyAssignment[]; // Now receives all assignments
  loading: boolean;
  user: User | null;
  questions: Question[];
  getSessionForAssignment: (assignmentId: string, userId: string) => any;
  developerLog?: (...args: any[]) => void;
}

export function WeeklyScheduleTable({ 
  allAssignments, 
  loading, 
  user, 
  questions, 
  getSessionForAssignment,
  developerLog 
}: WeeklyScheduleTableProps) {
  const navigate = useNavigate();
  
  // Calculate weekly assignments internally
  const weeklyAssignments = useMemo(() => {
    const today = getUtcMidnight(new Date());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday

    return allAssignments.filter(a => {
      const assignmentDate = getUtcMidnight(a.date);
      return assignmentDate >= startOfWeek && assignmentDate <= endOfWeek;
    }).sort((a, b) => a.date.getTime() - b.date.getTime()); // Sort by date ascending
  }, [allAssignments]); // Recalculate only when allAssignments changes

  // Handle start quiz button click
  const handleStartQuizClick = (assignment: StudyAssignment) => {
    // Navigate directly to quiz with all study items
    navigate(`/quiz/study-assignment/${assignment.id}`, {
      state: { selectedStudyItems: assignment.study_items }
    });
  };

  // Memoized helper to calculate total questions for a study assignment
  const calculateTotalQuestionsForStudyItemsLocal = React.useCallback((studyItems: any[]): number => {
    return calculateTotalQuestionsForStudyItems(
      studyItems,
      questions,
      user?.subscription?.plan || 'free',
      developerLog
    );
  }, [questions, user?.subscription?.plan, developerLog]);

  // Memoized columns for the weekly schedule table
  const weeklyScheduleColumns = React.useMemo((): TableColumn<StudyAssignment>[] => [
    {
      // Day column
      key: 'day',
      header: 'Day',
      render: (assignment) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            {formatDateForDisplay(assignment.date, { weekday: 'long' })}
          </div>
          <div className="text-gray-500 text-xs">
            {formatDateForDisplay(assignment.date, { month: 'short', day: 'numeric' })}
          </div>
        </div>
      ),
      className: 'whitespace-nowrap',
    },
    {
      key: 'book_chapters',
      header: 'Book and Chapters',
      render: (assignment) => (
        <div className="text-sm text-gray-900 break-words">
          {formatStudyItemsForAssignment(assignment.study_items, questions)} ({calculateTotalQuestionsForStudyItemsLocal(assignment.study_items)} Qs)
        </div>
      ),
    },
    {
      key: 'questions_count',
      header: 'Questions',
      render: (assignment) => (
        <div className="text-center">
          {assignment.completed && assignment.total_questions_answered !== undefined ? (
            (() => {
              developerLog?.('🔍 Completed assignment questions data:', {
                assignmentId: assignment.id,
                total_questions_answered: assignment.total_questions_answered,
                completed: assignment.completed
              });
              return (
                <div className="flex items-center justify-center space-x-1">
                  <Target className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-gray-900">{assignment.total_questions_answered}</span>
                </div>
              );
            })()
          ) : (
            <div className="flex items-center justify-center space-x-1">
              <Target className="h-4 w-4 text-purple-600" />
              <span className="font-medium text-gray-900">{calculateTotalQuestionsForStudyItemsLocal(assignment.study_items)}</span>
            </div>
          )}
        </div>
      ),
      className: 'text-center hidden md:table-cell',
      headerClassName: 'text-center hidden md:table-cell',
    },
    {
      key: 'score',
      header: 'Score',
      render: (assignment) => (
        <div className="text-center">
          {assignment.completed && assignment.total_points_earned !== undefined && assignment.max_points_possible !== undefined ? (
            (() => {
              developerLog?.('🔍 Completed assignment score data:', {
                assignmentId: assignment.id,
                total_points_earned: assignment.total_points_earned,
                max_points_possible: assignment.max_points_possible,
                completed: assignment.completed
              });
              const scorePercentage = assignment.max_points_possible > 0 
                ? Math.round((assignment.total_points_earned / assignment.max_points_possible) * 100)
                : 0;
              return (
                <div className={`font-bold text-lg ${
                  scorePercentage >= 90 ? 'text-green-600' :
                  scorePercentage >= 70 ? 'text-blue-600' :
                  'text-red-600'
                }`}>
                  {scorePercentage}%
                </div>
              );
            })()
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </div>
      ),
      className: 'text-center hidden md:table-cell',
      headerClassName: 'text-center hidden md:table-cell',
    },
    {
      key: 'time',
      header: 'Time',
      render: (assignment) => (
        <div className="text-center">
          {assignment.completed && assignment.total_time_spent_minutes !== undefined ? (
            (() => {
              developerLog?.('🔍 Completed assignment time data:', {
                assignmentId: assignment.id,
                total_time_spent_minutes: assignment.total_time_spent_minutes,
                completed: assignment.completed
              });
              return (
                <div className="flex items-center justify-center space-x-1">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-gray-900">{assignment.total_time_spent_minutes}m</span>
                </div>
              );
            })()
          ) : (
            <div className="flex items-center justify-center space-x-1">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-gray-400">—</span>
            </div>
          )}
        </div>
      ),
      className: 'text-center hidden md:table-cell',
      headerClassName: 'text-center hidden md:table-cell',
    },
    {
      key: 'start',
      header: 'Start',
      render: (assignment) => (
        <div className="text-center">
          {assignment.completed ? (
            <span className="text-green-600 text-sm font-medium">Completed</span>
          ) : user ? (
            (() => {
              const existingSession = getSessionForAssignment(assignment.id, user.id);
              if (existingSession) {
                return (
                  <button
                    onClick={() => navigate(`/quiz/runner/${existingSession.id}`)}
                    className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-colors duration-200"
                  >
                    Resume
                  </button>
                );
              } else {
                return (
                  <button
                    onClick={() => handleStartQuizClick(assignment)}
                    className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-indigo-700 transition-colors duration-200"
                  >
                    Start
                  </button>
                );
              }
            })()
          ) : null}
        </div>
      ),
      className: 'text-center',
      headerClassName: 'text-center',
    },
  ], [calculateTotalQuestionsForStudyItemsLocal, user, getSessionForAssignment, navigate, handleStartQuizClick, developerLog]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center space-x-3 mb-6">
        <CalendarIcon className="h-6 w-6 text-purple-600" />
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Your Weekly Schedule</h2>
          <p className="text-sm text-gray-600">Study assignments for this week</p>
        </div>
      </div>
      
      <Table
        columns={weeklyScheduleColumns} // This uses the memoized weeklyAssignments
        data={weeklyAssignments} 
        loading={loading}
        emptyState={{
          icon: CalendarIcon,
          title: "No Assignments This Week",
          description: "You don't have any study assignments scheduled for this week. Check your full schedule or contact your team admin."
        }}
      />
    </div>
  );
}