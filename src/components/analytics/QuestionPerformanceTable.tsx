import React, { useState } from 'react';
import { Table, TableColumn } from '../common/Table';
import { Badge } from '../common/Badge';
import { QuestionDetailModal } from './QuestionDetailModal';
import { 
  BookOpen, 
  Target, 
  Clock, 
  TrendingUp,
  AlertTriangle,
  Award,
  BarChart3
} from 'lucide-react';

interface QuestionPerformanceData {
  question_id: string;
  question_text: string;
  answer_text: string;
  book_of_bible: string;
  chapter: number;
  tier: string;
  points: number;
  total_attempts: number;
  correct_attempts: number;
  incorrect_attempts: number;
  accuracy_rate: number;
  average_time_spent: number;
  total_points_earned: number;
  total_points_possible: number;
}

interface QuestionPerformanceTableProps {
  data: QuestionPerformanceData[];
  loading: boolean;
  error: string | null;
  showIndividual: boolean; // Whether showing individual or team data
  user?: any; // Add user prop to access teamId
}

export function QuestionPerformanceTable({ data, loading, error, showIndividual, user }: QuestionPerformanceTableProps) {
  const [sortField, setSortField] = useState<keyof QuestionPerformanceData>('accuracy_rate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showQuestionDetailModal, setShowQuestionDetailModal] = useState(false);
  const [selectedQuestionForDetail, setSelectedQuestionForDetail] = useState<QuestionPerformanceData | null>(null);

  // Sort data based on current sort field and direction
  const sortedData = React.useMemo(() => {
    return [...data].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'desc' 
          ? bValue.localeCompare(aValue)
          : aValue.localeCompare(bValue);
      }
      
      return 0;
    });
  }, [data, sortField, sortDirection]);

  const handleSort = (field: keyof QuestionPerformanceData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection(field === 'accuracy_rate' ? 'asc' : 'desc'); // Default to ascending for accuracy (worst first)
    }
  };

  const handleRowClick = (question: QuestionPerformanceData) => {
    setSelectedQuestionForDetail(question);
    setShowQuestionDetailModal(true);
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return 'text-green-600';
    if (accuracy >= 70) return 'text-blue-600';
    if (accuracy >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAccuracyBgColor = (accuracy: number) => {
    if (accuracy >= 90) return 'bg-green-50 border-green-200';
    if (accuracy >= 70) return 'bg-blue-50 border-blue-200';
    if (accuracy >= 50) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const columns: TableColumn<QuestionPerformanceData>[] = [
    {
      key: 'question_text',
      header: 'Question',
      render: (question) => (
        <div className="max-w-xs">
          <div className="font-medium text-gray-900 line-clamp-2 mb-1">
            {question.question_text}
          </div>
          <div className="text-xs text-gray-500">
            {question.points} point{question.points !== 1 ? 's' : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'book_chapter',
      header: 'Book & Chapter',
      render: (question) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">{question.book_of_bible}</div>
          <div className="text-gray-500">Chapter {question.chapter}</div>
        </div>
      ),
      className: 'whitespace-nowrap',
    },
    {
      key: 'tier',
      header: 'Tier',
      render: (question) => <Badge type="tier" value={question.tier} showIcon />,
      className: 'text-center',
      headerClassName: 'text-center',
      sortable: true,
    },
    {
      key: 'accuracy_rate',
      header: 'Accuracy',
      render: (question) => (
        <div className="text-center">
          <div className={`text-2xl font-bold ${getAccuracyColor(question.accuracy_rate)}`}>
            {question.accuracy_rate}%
          </div>
          <div className="text-xs text-gray-500">
            {question.correct_attempts}/{question.total_attempts}
          </div>
        </div>
      ),
      className: 'text-center',
      headerClassName: 'text-center',
      sortable: true,
    },
    {
      key: 'total_attempts',
      header: 'Attempts',
      render: (question) => (
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1">
            <Target className="h-4 w-4 text-purple-600" />
            <span className="font-medium text-gray-900">{question.total_attempts}</span>
          </div>
        </div>
      ),
      className: 'text-center',
      headerClassName: 'text-center',
      sortable: true,
    },
    {
      key: 'average_time_spent',
      header: 'Avg Time',
      render: (question) => (
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1">
            <Clock className="h-4 w-4 text-orange-600" />
            <span className="font-medium text-gray-900">
              {formatTime(question.average_time_spent)}
            </span>
          </div>
        </div>
      ),
      className: 'text-center',
      headerClassName: 'text-center',
      sortable: true,
    },
    {
      key: 'points_efficiency',
      header: 'Points Efficiency',
      render: (question) => {
        const efficiency = question.total_points_possible > 0 
          ? Math.round((question.total_points_earned / question.total_points_possible) * 100)
          : 0;
        return (
          <div className="text-center">
            <div className={`font-bold ${getAccuracyColor(efficiency)}`}>
              {efficiency}%
            </div>
            <div className="text-xs text-gray-500">
              {question.total_points_earned}/{question.total_points_possible}
            </div>
          </div>
        );
      },
      className: 'text-center',
      headerClassName: 'text-center',
    },
  ];

  // Make columns sortable by adding click handlers
  const sortableColumns = columns.map(column => ({
    ...column,
    header: column.sortable ? (
      <button
        onClick={() => handleSort(column.key as keyof QuestionPerformanceData)}
        className="flex items-center justify-center space-x-1 hover:text-indigo-600 transition-colors duration-200 w-full"
      >
        <span>{column.header}</span>
        {sortField === column.key && (
          <TrendingUp 
            className={`h-3 w-3 transition-transform duration-200 ${
              sortDirection === 'desc' ? 'rotate-180' : ''
            }`} 
          />
        )}
      </button>
    ) : column.header
  }));

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="text-red-600 mb-4">
          <BarChart3 className="h-12 w-12 mx-auto mb-2" />
          <h3 className="text-lg font-semibold">Error Loading Question Performance</h3>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <BarChart3 className="h-6 w-6 text-purple-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Question Performance Analysis</h2>
            <p className="text-sm text-gray-600">
              {showIndividual 
                ? 'Individual question performance and difficulty analysis'
                : 'Team-wide question performance and difficulty analysis'
              }
            </p>
          </div>
        </div>
      </div>
      
      <Table
        columns={sortableColumns}
        data={sortedData}
        loading={loading}
        onRowClick={handleRowClick}
        emptyState={{
          icon: BarChart3,
          title: "No Question Data",
          description: "No question performance data available yet. Complete some quizzes to see question analysis!"
        }}
        getRowClassName={(question) => {
          // Highlight problematic questions (low accuracy)
          if (question.accuracy_rate < 50) {
            return 'bg-red-50 border-l-4 border-red-400';
          } else if (question.accuracy_rate < 70) {
            return 'bg-yellow-50 border-l-4 border-yellow-400';
          }
          return '';
        }}
      />
      
      {data.length > 0 && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center mb-4">
            <div>
              <div className="text-lg font-bold text-gray-900">{data.length}</div>
              <div className="text-sm text-gray-600">Questions Analyzed</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-600">
                {data.filter(q => q.accuracy_rate < 50).length}
              </div>
              <div className="text-sm text-gray-600">Difficult (&lt;50%)</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-600">
                {data.filter(q => q.accuracy_rate >= 50 && q.accuracy_rate < 70).length}
              </div>
              <div className="text-sm text-gray-600">Moderate (50-70%)</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">
                {data.filter(q => q.accuracy_rate >= 90).length}
              </div>
              <div className="text-sm text-gray-600">Easy (&gt;90%)</div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Click column headers to sort • Questions with low accuracy rates may need review
            </p>
          </div>
        </div>
      )}
      
      <QuestionDetailModal
        isOpen={showQuestionDetailModal}
        onClose={() => {
          setShowQuestionDetailModal(false);
          setSelectedQuestionForDetail(null);
        }}
        question={selectedQuestionForDetail}
        teamId={user?.teamId}
      />
    </div>
  );
}