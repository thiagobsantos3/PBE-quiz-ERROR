import React, { useState } from 'react';
import { Table, TableColumn } from '../common/Table';
import { formatDateForDisplay } from '../../utils/dateUtils';
import { formatStudyItemsForAssignment } from '../../utils/quizHelpers';
import { StudyAssignment } from '../../types';
import { 
  Calendar, 
  BookOpen, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  FileText,
  Target
} from 'lucide-react';
import { QuizDetailsModal } from './QuizDetailsModal';

interface StudyScheduleAnalysisTableProps {
  data: StudyAssignment[];
  loading: boolean;
  error: string | null;
}

export function StudyScheduleAnalysisTable({ data, loading, error }: StudyScheduleAnalysisTableProps) {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedQuizSessionId, setSelectedQuizSessionId] = useState<string | null>(null);
  const [selectedQuizTitle, setSelectedQuizTitle] = useState<string>('');

  const handleRowClick = (assignment: StudyAssignment) => {
    // Only allow clicking on completed assignments that have quiz session data
    if (assignment.completed && assignment.quiz_session_id) {
      setSelectedQuizSessionId(assignment.quiz_session_id);
      setSelectedQuizTitle(`Study Assignment - ${formatStudyItemsForAssignment(assignment.study_items)}`);
      setShowDetailsModal(true);
    }
  };

  // Function to determine if a row is clickable
  const getRowClassName = (assignment: StudyAssignment): string => {
    const baseClass = wasCompletedLate(assignment) 
      ? 'bg-orange-50 border-l-4 border-orange-400' 
      : '';
    
    // Add cursor pointer for clickable rows
    if (assignment.completed && assignment.quiz_session_id) {
      return `${baseClass} cursor-pointer hover:bg-gray-50`.trim();
    }
    
    return baseClass;
  };

  // Helper function to get score color based on percentage
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Helper function to check if assignment was completed late
  const wasCompletedLate = (assignment: StudyAssignment): boolean => {
    if (!assignment.completed || !assignment.completed_at) {
      return false; // Not completed yet, so can't be late
    }
    
    // Get the scheduled date (assignment.date) at end of day
    const scheduledDate = new Date(assignment.date);
    scheduledDate.setHours(23, 59, 59, 999); // End of scheduled day
    
    // Get the completion date
    const completedDate = new Date(assignment.completed_at);
    
    // Return true if completed after the scheduled day
    return completedDate > scheduledDate;
  };

  const columns: TableColumn<StudyAssignment>[] = [
    {
      key: 'study_items',
      header: 'Study Items',
      render: (assignment) => (
        <div className="max-w-xs">
          <div className="font-medium text-gray-900">
            {formatStudyItemsForAssignment(assignment.study_items)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {assignment.study_items.length} item{assignment.study_items.length !== 1 ? 's' : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (assignment) => (
        <div className="text-sm text-gray-900">
          {formatDateForDisplay(assignment.date, { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          })}
        </div>
      ),
      className: 'whitespace-nowrap',
    },
    {
      key: 'completed_at',
      header: 'Completed',
      render: (assignment) => (
        <div className="text-sm text-gray-600">
          {assignment.completed_at ? (
            <div className={wasCompletedLate(assignment) ? 'text-orange-700 font-medium' : ''}>
              {formatDateForDisplay(new Date(assignment.completed_at), {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
              {wasCompletedLate(assignment) && (
                <div className="text-xs text-orange-600 mt-1">
                  (Late completion)
                </div>
              )}
            </div>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </div>
      ),
      className: 'whitespace-nowrap',
    },
    {
      key: 'score',
      header: 'Score',
      render: (assignment) => (
        <div className="text-center">
          {assignment.completed && assignment.total_points_earned !== undefined && assignment.max_points_possible !== undefined ? (
            <div className={`font-bold text-lg ${getScoreColor(assignment.max_points_possible > 0 ? (assignment.total_points_earned / assignment.max_points_possible) * 100 : 0)}`}>
              {assignment.max_points_possible > 0 
                ? `${Math.round((assignment.total_points_earned / assignment.max_points_possible) * 100)}%`
                : '0%'
              }
            </div>
          ) : (
            <div className="text-sm text-gray-400">
              —
            </div>
          )}
        </div>
      ),
      className: 'text-center',
    },
    {
      key: 'questions',
      header: 'Questions',
      render: (assignment) => (
        <div className="text-center">
          {assignment.completed && assignment.total_questions_answered !== undefined ? (
            <div className="flex items-center justify-center space-x-1">
              <Target className="h-4 w-4 text-purple-600" />
              <span className="font-medium text-gray-900">{assignment.total_questions_answered}</span>
            </div>
          ) : (
            <div className="text-sm text-gray-400">
              —
            </div>
          )}
        </div>
      ),
      className: 'text-center',
    },
    {
      key: 'time',
      header: 'Time',
      render: (assignment) => (
        <div className="text-center">
          {assignment.completed && assignment.total_time_spent_minutes !== undefined ? (
            <div className="flex items-center justify-center space-x-1">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="font-medium text-gray-900">
                {assignment.total_time_spent_minutes}m
              </span>
            </div>
          ) : (
            <div className="text-sm text-gray-400">
              —
            </div>
          )}
        </div>
      ),
      className: 'text-center',
    },
    {
      key: 'completed',
      header: 'Status',
      render: (assignment) => (
        <div className="flex items-center space-x-2">
          {assignment.completed ? (
            <div className={`flex items-center space-x-2 ${wasCompletedLate(assignment) ? 'text-orange-700' : ''}`}>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className={`text-sm font-medium ${wasCompletedLate(assignment) ? 'text-orange-700' : 'text-green-700'}`}>
                {wasCompletedLate(assignment) ? 'Completed Late' : 'Completed'}
              </span>
            </div>
          ) : (
            <>
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-700">Pending</span>
            </>
          )}
        </div>
      ),
      className: 'whitespace-nowrap',
    },
  ];

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="text-red-600 mb-4">
          <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
          <h3 className="text-lg font-semibold">Error Loading Study Schedule</h3>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Calendar className="h-6 w-6 text-purple-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Study Schedule Analysis</h2>
            <p className="text-sm text-gray-600">
              Detailed breakdown of study assignments and completion status.
            </p>
          </div>
        </div>
      </div>
      
      <Table
        columns={columns}
        data={data}
        loading={loading}
        onRowClick={handleRowClick}
        getRowClassName={getRowClassName}
        emptyState={{
          icon: Calendar,
          title: "No Study Assignments",
          description: "No study assignments found for the selected date range. Study assignments are created through the Study Schedule feature."
        }}
      />
      
      {data.length > 0 && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center mb-4">
            <div>
              <div className="text-lg font-bold text-gray-900">{data.length}</div>
              <div className="text-sm text-gray-600">Total Assignments</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">
                {data.filter(a => a.completed).length}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-600">
                {data.filter(a => !a.completed).length}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Click on completed assignments to view detailed quiz results.
            </p>
          </div>
        </div>
      )}

      <QuizDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedQuizSessionId(null);
          setSelectedQuizTitle('');
        }}
        quizSessionId={selectedQuizSessionId}
        quizTitle={selectedQuizTitle}
      />
    </div>
  );
}