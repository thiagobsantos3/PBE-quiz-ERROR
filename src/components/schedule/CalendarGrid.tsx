import React from 'react';
import { ChevronLeft, ChevronRight, Play, RotateCcw } from 'lucide-react';
import { formatDateForDisplay } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  assignment?: any;
}

interface CalendarGridProps {
  currentDate: Date;
  calendarDays: CalendarDay[];
  dayNames: string[];
  monthNames: string[];
  onNavigateMonth: (direction: 'prev' | 'next') => void;
  onDateClick: (day: CalendarDay) => void;
  onToday: () => void;
  formatStudyItems: (items: any[]) => string;
  normalizeAssignment: (assignment: any) => any;
  getSessionForAssignment?: (assignmentId: string, userId: string) => any;
  onStartQuiz?: (assignment: any) => void;
  onResumeQuiz?: (assignment: any) => void;
  user?: any;
  canManageSchedules?: boolean;
}

export function CalendarGrid({
  currentDate,
  calendarDays,
  dayNames,
  monthNames,
  onNavigateMonth,
  onDateClick,
  onToday,
  formatStudyItems,
  normalizeAssignment,
  getSessionForAssignment,
  onStartQuiz,
  onResumeQuiz,
  user,
  canManageSchedules = false,
  questions = []
}: CalendarGridProps) {
  const { developerLog } = useAuth();

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigateMonth('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <button
            onClick={onToday}
            className="px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-200"
          >
            Today
          </button>
          <button
            onClick={() => onNavigateMonth('next')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {/* Day Headers */}
        {dayNames.map((day) => (
          <div key={day} className="p-2 text-center text-xs sm:text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {calendarDays.map((day, index) => {
          const hasActiveSession = day.assignment && user && getSessionForAssignment && 
            getSessionForAssignment(day.assignment.id, user.id);
          
          // Debug logging for calendar day rendering
          if (day.assignment) {
            developerLog('🗓️ Calendar Day Debug:', {
              date: day.date.toDateString(),
              assignmentId: day.assignment?.id,
              assignmentUserId: day.assignment?.user_id,
              currentUserId: user?.id,
              hasActiveSession: !!hasActiveSession,
              activeSessionId: hasActiveSession?.id,
              assignmentCompleted: day.assignment?.completed,
              isUserAssignment: day.assignment?.user_id === user?.id,
              onStartQuizExists: !!onStartQuiz,
              onResumeQuizExists: !!onResumeQuiz
            });
          }

          // Determine if this day is clickable
          const isClickable = day.isCurrentMonth && (
            canManageSchedules || 
            (day.assignment && day.assignment.user_id === user?.id)
          );
          
          // Debug logging for calendar grid rendering
          // Note: This component doesn't have access to useAuth hook since it's a pure component
          // Debug logging removed to avoid uncontrolled console output
          
          return (
            <button
              key={index}
              onClick={() => isClickable ? onDateClick(day) : undefined}
              onClick={(e) => {
                // Check if the click was on a quiz action button or its children
                const target = e.target as HTMLElement;
                const isQuizButtonClick = target.closest('.quiz-action-button');
                
                developerLog('🖱️ Calendar day clicked:', {
                  date: day.date.toDateString(),
                  isClickable,
                  isQuizButtonClick: !!isQuizButtonClick,
                  targetElement: target.tagName,
                  targetClasses: target.className
                });
                
                // Only handle day click if it wasn't a quiz button click
                if (!isQuizButtonClick && isClickable) {
                  onDateClick(day);
                }
              }}
              className={`
                relative p-2 sm:p-3 h-20 sm:h-24 text-left rounded-lg transition-all duration-200
                ${day.isCurrentMonth 
                  ? (isClickable ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default')
                  : 'text-gray-300 cursor-default'
                }
                ${day.isToday ? 'bg-indigo-50 border-2 border-indigo-200' : 'border border-gray-100'}
                ${day.assignment ? (day.assignment.completed ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200') : ''}
              `}
            >
              <div className={`text-xs sm:text-sm font-medium ${
                day.isToday ? 'text-indigo-600' : 
                day.isCurrentMonth ? 'text-gray-900' : 'text-gray-300'
              }`}>
                {day.date.getDate()}
              </div>
              
              {day.assignment && (
                <div className="mt-1">
                  <div className={`text-xs font-medium truncate hidden sm:block ${
                    day.assignment.completed ? 'text-green-700' : 'text-yellow-700'
                  }`}>
                    {formatStudyItems(normalizeAssignment(day.assignment).study_items)}
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                    {day.assignment.completed ? (
                      <span className="text-xs text-green-600 hidden sm:inline">✓ Completed</span>
                    ) : day.assignment.user_id === user?.id && onStartQuiz && onResumeQuiz ? (
                      <button
                        className="quiz-action-button flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-all duration-200 bg-green-600 text-white hover:bg-green-700"
                        onClick={(e) => {
                          e.stopPropagation();
                        developerLog('🎯 Calendar Quiz Button Clicked:', {
                          date: day.date.toDateString(),
                          assignmentId: day.assignment!.id,
                          hasActiveSession: !!hasActiveSession,
                          activeSessionId: hasActiveSession?.id,
                          action: hasActiveSession ? 'resume' : 'start'
                        });
                        
                          if (hasActiveSession) {
                            onResumeQuiz(day.assignment!);
                          developerLog('🔄 Calling onResumeQuiz with assignment:', day.assignment!.id);
                          } else {
                            onStartQuiz(day.assignment!);
                          developerLog('▶️ Calling onStartQuiz with assignment:', day.assignment!.id);
                          }
                        }}
                        title={hasActiveSession ? 'Resume Quiz' : 'Start Quiz'}
                      >
                        {hasActiveSession ? (
                          <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
                        ) : (
                          <Play className="h-3 w-3 sm:h-4 sm:w-4" />
                        )}
                        <span className="hidden sm:inline">
                          {hasActiveSession ? 'Resume' : 'Start'}
                        </span>
                      </button>
                    ) : hasActiveSession ? (
                      <span className="text-xs text-blue-600 hidden sm:inline">Active</span>
                    ) : (
                      <span className="text-xs text-yellow-600 hidden sm:inline">Pending</span>
                    )}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}