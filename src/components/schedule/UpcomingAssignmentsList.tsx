import React from 'react';
import { Calendar as CalendarIcon, BookOpen, Check, RotateCcw, Play, Edit, Trash2 } from 'lucide-react';
import { StudyAssignment } from '../../types';
import { formatStudyItemsForAssignment } from '../../utils/quizHelpers';
import { getUtcMidnight, formatDateForDisplay } from '../../utils/dateUtils';

interface UpcomingAssignmentsListProps {
  memberAssignments: StudyAssignment[];
  selectedMember: any;
  user: any;
  getSessionForAssignment?: (assignmentId: string, userId: string) => any;
  onResumeQuiz: (assignment: StudyAssignment) => void;
  onStartQuiz: (assignment: StudyAssignment) => void;
  onEditAssignment: (assignment: StudyAssignment) => void;
  normalizeAssignment: (assignment: StudyAssignment) => StudyAssignment;
  canManageSchedules?: boolean;
  onDeleteQuizSession?: (sessionId: string) => void;
}

export function UpcomingAssignmentsList({
  memberAssignments,
  selectedMember,
  user,
  getSessionForAssignment,
  onResumeQuiz,
  onStartQuiz,
  onEditAssignment,
  normalizeAssignment,
  canManageSchedules = false,
  onDeleteQuizSession,
  questions
}: UpcomingAssignmentsListProps) {
  // Fix date filtering to include assignments from today onwards
  const today = getUtcMidnight(new Date());
  
  const upcomingAssignments = memberAssignments
    .filter(a => {
      return a.date.getTime() >= today.getTime();
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  return (
    <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Upcoming Assignments {selectedMember ? `for ${selectedMember.user.name}` : ''}
      </h3>
      <div className="space-y-3">
        {upcomingAssignments.map((assignment) => {
          const normalized = normalizeAssignment(assignment);
          const hasActiveSession = user && getSessionForAssignment && getSessionForAssignment(assignment.id, user.id);
          const isUserAssignment = assignment.user_id === user?.id;
          
          // Debug logging for upcoming assignments
          // Note: This component doesn't have access to useAuth hook since it's a pure component
          // Debug logging removed to avoid uncontrolled console output
          
          return (
            <div key={assignment.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                  assignment.completed ? 'bg-green-100' : hasActiveSession ? 'bg-blue-100' : 'bg-yellow-100'
                }`}>
                  {assignment.completed ? (
                    <Check className="h-5 w-5 text-green-600" />
                  ) : hasActiveSession ? (
                    <RotateCcw className="h-5 w-5 text-blue-600" />
                  ) : (
                    <BookOpen className="h-5 w-5 text-yellow-600" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {formatStudyItemsForAssignment(normalized.study_items)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatDateForDisplay(assignment.date, { 
                      weekday: 'long', 
                      month: 'short', 
                      day: 'numeric'
                    })}
                    {assignment.completed && (
                      <span className="ml-2 text-green-600 font-medium">✓ Completed</span>
                    )}
                    {hasActiveSession && !assignment.completed && (
                      <span className="ml-2 text-blue-600 font-medium">• Quiz Active</span>
                    )}
                  </div>
                  {assignment.description && (
                    <div className="text-sm text-gray-500 mt-1">{assignment.description}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {/* Quiz button - only show if it's the user's assignment */}
                {!assignment.completed && isUserAssignment && (
                  <div className="flex items-center space-x-2">
                    {/* Delete Session button - only show if there's an active session */}
                    {hasActiveSession && onDeleteQuizSession && (
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this quiz session? All progress will be lost.')) {
                            onDeleteQuizSession(hasActiveSession.id);
                          }
                        }}
                        className="flex items-center space-x-1 px-2 py-1 rounded-lg text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors duration-200"
                        title="Delete quiz session"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                    
                    {/* Start/Resume Quiz button */}
                    <button
                      onClick={() => {
                        if (hasActiveSession) {
                          onResumeQuiz(assignment);
                        } else {
                          onStartQuiz(assignment);
                        }
                      }}
                      className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 ${
                        hasActiveSession
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {hasActiveSession ? (
                        <>
                          <RotateCcw className="h-3 w-3" />
                          <span>Resume</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3" />
                          <span>Quiz</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
                
                {/* Edit button - only show if user can manage schedules */}
                {canManageSchedules && (
                  <button
                    onClick={() => onEditAssignment(assignment)}
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        
        {upcomingAssignments.length === 0 && (
          <div className="text-center py-8">
            <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No upcoming assignments {selectedMember ? `for ${selectedMember.user.name}` : ''}</p>
            <p className="text-sm text-gray-400">
              {canManageSchedules 
                ? 'Click on a calendar date to add an assignment'
                : 'Your team admin will assign study schedules'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}