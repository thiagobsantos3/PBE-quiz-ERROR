import React, { useState } from 'react';
import { Table, TableColumn } from '../common/Table';
import { formatTotalTime } from '../../utils/quizHelpers';
import { getQuizTypeDisplayName } from '../../utils/quizUtils'; // Assuming this utility exists or will be added
import { BookOpen, Calendar, Target, Trophy, Clock, AlertTriangle, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { QuizDetailsModal } from './QuizDetailsModal';
import { useQuizSession } from '../../contexts/QuizSessionContext';
import { useAuth } from '../../contexts/AuthContext';

// Re-define QuizHistoryEntry to match the data returned by the hook
interface QuizHistoryEntry {
  id: string;
  title: string;
  type: 'quick-start' | 'custom' | 'study-assignment';
  completed_at: string;
  created_at: string; // Add created_at to the type
  total_points: number;
  max_points: number;
  total_actual_time_spent_seconds: number;
  questions_count: number;
  approval_status?: 'approved' | 'pending' | 'rejected';
}

interface QuizHistoryTableProps {
  data: QuizHistoryEntry[];
  loading: boolean;
  error: string | null;
  updateLocalQuizHistoryEntry: (sessionId: string, updates: Partial<QuizHistoryEntry>) => void;
  refreshData?: () => Promise<void>;
}

export function QuizHistoryTable({ data, loading, error, updateLocalQuizHistoryEntry, refreshData }: QuizHistoryTableProps) {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedQuizSessionId, setSelectedQuizSessionId] = useState<string | null>(null);
  const [selectedQuizTitle, setSelectedQuizTitle] = useState<string>('');
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [deletingQuizId, setDeletingQuizId] = useState<string | null>(null);

  const { updateQuizApprovalStatus, deleteQuizSession } = useQuizSession();
  const { user } = useAuth();

  const handleRowClick = (entry: QuizHistoryEntry) => {
    setSelectedQuizSessionId(entry.id);
    setSelectedQuizTitle(entry.title);
    setShowDetailsModal(true);
  };

  const handleStatusChange = async (sessionId: string, newStatus: 'approved' | 'pending' | 'rejected') => {
    if (!user || (user.role !== 'admin' && user.teamRole !== 'owner')) {
      alert('You do not have permission to change the approval status.');
      return;
    }

    setUpdatingStatusId(sessionId);
    try {
      // Update local state immediately for instant UI feedback
      updateLocalQuizHistoryEntry(sessionId, { approval_status: newStatus });
      
      await updateQuizApprovalStatus(sessionId, newStatus);
    } catch (err) {
      console.error('Failed to update quiz approval status:', err);
      // Revert local state on error
      const originalEntry = data.find(entry => entry.id === sessionId);
      if (originalEntry) {
        updateLocalQuizHistoryEntry(sessionId, { approval_status: originalEntry.approval_status });
      }
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleDeleteQuiz = async (sessionId: string, quizTitle: string) => {
    if (!user || user.teamRole !== 'owner') {
      alert('You do not have permission to delete quiz sessions.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete the quiz "${quizTitle}"?\n\n` +
      'This action will:\n' +
      '• Permanently delete the quiz session and all its data\n' +
      '• Recalculate the user\'s XP, level, and study streak\n' +
      '• Remove any achievements that are no longer valid\n\n' +
      'This action cannot be undone.'
    );

    if (!confirmed) return;

    setDeletingQuizId(sessionId);
    try {
      await deleteQuizSession(sessionId);
      
      // Refresh the quiz history data to remove the deleted entry
      if (refreshData) {
        await refreshData();
      }
      
      console.log('✅ Quiz session deleted successfully');
    } catch (err) {
      console.error('Failed to delete quiz session:', err);
      alert('Failed to delete quiz session. Please try again.');
    } finally {
      setDeletingQuizId(null);
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const columns: TableColumn<QuizHistoryEntry>[] = [
    {
      key: 'title',
      header: 'Quiz Title',
      render: (entry) => (
        <div className="font-medium text-gray-900">{entry.title}</div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (entry) => (
        <div className="flex items-center space-x-2">
          {/* Assuming getQuizTypeIcon is available or can be added */}
          {/* {getQuizTypeIcon(entry.type)} */}
          <span className="text-sm text-gray-600 capitalize">{getQuizTypeDisplayName(entry.type)}</span>
        </div>
      ),
    },
    {
      key: 'start_time',
      header: 'Start Time',
      render: (entry) => (
        <span className="text-sm text-gray-600">
          {new Date(entry.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'end_time',
      header: 'End Time',
      render: (entry) => (
        <span className="text-sm text-gray-600">
          {new Date(entry.completed_at).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      render: (entry) => {
        const score = entry.max_points > 0 ? (entry.total_points / entry.max_points) * 100 : 0;
        const scoreColor = score >= 90 ? 'text-green-600' : score >= 70 ? 'text-blue-600' : 'text-red-600';
        return (
          <div className={`font-bold text-lg ${scoreColor}`}>
            {score.toFixed(1)}%
          </div>
        );
      },
      className: 'text-center',
      headerClassName: 'text-center',
    },
    {
      key: 'questions_count',
      header: 'Questions',
      render: (entry) => (
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1">
            <Target className="h-4 w-4 text-purple-600" />
            <span className="font-medium text-gray-900">{entry.questions_count}</span>
          </div>
        </div>
      ),
      className: 'text-center',
      headerClassName: 'text-center',
    },
    {
      key: 'estimated_minutes',
      header: 'Time',
      render: (entry) => (
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1">
            <Clock className="h-4 w-4 text-orange-600" />
            <span className="font-medium text-gray-900">
              {formatTotalTime(Math.round(entry.total_actual_time_spent_seconds / 60))}
            </span>
          </div>
        </div>
      ),
      className: 'text-center',
      headerClassName: 'text-center',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (entry) => {
        const canEditStatus = user && (user.role === 'admin' || user.teamRole === 'owner');
        const canDelete = user && user.teamRole === 'owner';
        const currentStatus = entry.approval_status || 'approved';
        
        return (
          <div className="flex items-center justify-center space-x-2">
            {canEditStatus ? (
              <select
                value={currentStatus}
                onChange={(e) => {
                  e.stopPropagation();
                  handleStatusChange(entry.id, e.target.value as 'approved' | 'rejected');
                }}
                disabled={updatingStatusId === entry.id}
                className={`px-3 py-1 rounded-lg text-sm font-medium border transition-colors duration-200 ${getStatusColor(currentStatus)} ${
                  updatingStatusId === entry.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            ) : (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(currentStatus)}`}>
                {currentStatus === 'approved' ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <XCircle className="h-3 w-3 mr-1" />
                )}
                <span className="capitalize">{currentStatus}</span>
              </span>
            )}
            
            {canDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteQuiz(entry.id, entry.title);
                }}
                disabled={deletingQuizId === entry.id}
                className="text-red-600 hover:text-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete quiz session"
              >
                {deletingQuizId === entry.id ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        );
      },
      className: 'whitespace-nowrap',
      headerClassName: 'text-left',
    },
  ];

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="text-red-600 mb-4">
          <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
          <h3 className="text-lg font-semibold">Error Loading Quiz History</h3>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <BookOpen className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Completed Quizzes</h2>
            <p className="text-sm text-gray-600">
              Detailed breakdown of quizzes completed by this team member.
            </p>
          </div>
        </div>
      </div>
      
      <Table
        columns={columns}
        data={data}
        loading={loading}
        onRowClick={handleRowClick}
        emptyState={{
          icon: BookOpen,
          title: "No Quizzes Completed",
          description: "This team member has not completed any quizzes in the selected date range."
        }}
      />
      
      {data.length > 0 && (
        <div className="p-4 bg-gray-50 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            Showing latest completed quizzes. Click on a row to view detailed results.
          </p>
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