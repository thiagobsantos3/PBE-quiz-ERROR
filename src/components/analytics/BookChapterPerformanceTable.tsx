import React, { useState } from 'react';
import { Table, TableColumn } from '../common/Table';
import { 
  BookOpen, 
  Target, 
  Clock, 
  TrendingUp,
  AlertTriangle,
  Award,
  BarChart3
} from 'lucide-react';

interface BookChapterPerformanceData {
  book_of_bible: string;
  chapter: number;
  total_attempts: number;
  correct_attempts: number;
  incorrect_attempts: number;
  accuracy_rate: number;
  average_time_spent: number;
  total_points_earned: number;
  total_points_possible: number;
  points_efficiency: number;
}

interface BookChapterPerformanceTableProps {
  data: BookChapterPerformanceData[];
  loading: boolean;
  error: string | null;
  showIndividual: boolean; // Whether showing individual or team data
}

export function BookChapterPerformanceTable({ 
  data, 
  loading, 
  error, 
  showIndividual 
}: BookChapterPerformanceTableProps) {
  const [sortField, setSortField] = useState<keyof BookChapterPerformanceData>('accuracy_rate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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

  const handleSort = (field: keyof BookChapterPerformanceData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection(field === 'accuracy_rate' ? 'asc' : 'desc'); // Default to ascending for accuracy (worst first)
    }
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

  const columns: TableColumn<BookChapterPerformanceData>[] = [
    {
      key: 'book_of_bible',
      header: 'Book',
      render: (item) => (
        <div className="font-medium text-gray-900">{item.book_of_bible}</div>
      ),
      sortable: true,
    },
    {
      key: 'chapter',
      header: 'Chapter',
      render: (item) => (
        <div className="text-center">
          <span className="font-medium text-gray-900">{item.chapter}</span>
        </div>
      ),
      className: 'text-center',
      headerClassName: 'text-center',
      sortable: true,
    },
    {
      key: 'accuracy_rate',
      header: 'Accuracy',
      render: (item) => (
        <div className="text-center">
          <div className={`text-2xl font-bold ${getAccuracyColor(item.accuracy_rate)}`}>
            {item.accuracy_rate}%
          </div>
          <div className="text-xs text-gray-500">
            {item.correct_attempts}/{item.total_attempts}
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
      render: (item) => (
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1">
            <Target className="h-4 w-4 text-purple-600" />
            <span className="font-medium text-gray-900">{item.total_attempts}</span>
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
      render: (item) => (
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1">
            <Clock className="h-4 w-4 text-orange-600" />
            <span className="font-medium text-gray-900">
              {formatTime(item.average_time_spent)}
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
      render: (item) => (
        <div className="text-center">
          <div className={`font-bold ${getAccuracyColor(item.points_efficiency)}`}>
            {item.points_efficiency}%
          </div>
          <div className="text-xs text-gray-500">
            {item.total_points_earned}/{item.total_points_possible}
          </div>
        </div>
      ),
      className: 'text-center',
      headerClassName: 'text-center',
      sortable: true,
    },
  ];

  // Make columns sortable by adding click handlers
  const sortableColumns = columns.map(column => ({
    ...column,
    header: column.sortable ? (
      <button
        onClick={() => handleSort(column.key as keyof BookChapterPerformanceData)}
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

  // Calculate summary statistics
  const totalBooks = new Set(data.map(d => d.book_of_bible)).size;
  const totalChapters = data.length;
  const overallAccuracy = data.length > 0 
    ? Math.round(data.reduce((sum, d) => sum + d.accuracy_rate, 0) / data.length)
    : 0;
  const totalAttempts = data.reduce((sum, d) => sum + d.total_attempts, 0);

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="text-red-600 mb-4">
          <BarChart3 className="h-12 w-12 mx-auto mb-2" />
          <h3 className="text-lg font-semibold">Error Loading Book/Chapter Performance</h3>
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
            <h2 className="text-xl font-bold text-gray-900">Book & Chapter Performance</h2>
            <p className="text-sm text-gray-600">
              {showIndividual 
                ? 'Individual performance breakdown by Bible book and chapter'
                : 'Team performance breakdown by Bible book and chapter'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-900">{totalBooks}</div>
            <div className="text-sm text-blue-700">Books Analyzed</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-900">{totalChapters}</div>
            <div className="text-sm text-green-700">Chapters Analyzed</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-900">{overallAccuracy}%</div>
            <div className="text-sm text-purple-700">Overall Accuracy</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-900">{totalAttempts}</div>
            <div className="text-sm text-orange-700">Total Attempts</div>
          </div>
        </div>
      </div>
      
      <Table
        columns={sortableColumns}
        data={sortedData}
        loading={loading}
        emptyState={{
          icon: BookOpen,
          title: "No Book/Chapter Data",
          description: "No book and chapter performance data available yet. Complete some quizzes to see detailed analysis!"
        }}
        getRowClassName={(item) => {
          // Highlight problematic chapters (low accuracy)
          if (item.accuracy_rate < 50) {
            return 'bg-red-50 border-l-4 border-red-400';
          } else if (item.accuracy_rate < 70) {
            return 'bg-yellow-50 border-l-4 border-yellow-400';
          }
          return '';
        }}
      />
      
      {data.length > 0 && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center mb-4">
            <div>
              <div className="text-lg font-bold text-red-600">
                {data.filter(d => d.accuracy_rate < 50).length}
              </div>
              <div className="text-sm text-gray-600">Struggling ({'<50%'})</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-600">
                {data.filter(d => d.accuracy_rate >= 50 && d.accuracy_rate < 70).length}
              </div>
              <div className="text-sm text-gray-600">Needs Work ({'50-70%'})</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-600">
                {data.filter(d => d.accuracy_rate >= 70 && d.accuracy_rate < 90).length}
              </div>
              <div className="text-sm text-gray-600">Good ({'70-90%'})</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">
                {data.filter(d => d.accuracy_rate >= 90).length}
              </div>
              <div className="text-sm text-gray-600">Excellent ({'>90%'})</div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Click column headers to sort • Focus study time on chapters with low accuracy rates
            </p>
          </div>
        </div>
      )}
    </div>
  );
}