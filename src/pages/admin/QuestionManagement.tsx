import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/layout/Layout';
import { useQuestion } from '../../contexts/QuestionContext';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { StatsCard } from '../../components/common/StatsCard';
import { Table, TableColumn } from '../../components/common/Table';
import { bibleBooks } from '../../constants/bibleBooks';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Clock,
  Award,
  Tag,
  Save,
} from 'lucide-react';
import { Question } from '../../types';


export function QuestionManagement() {
  const { questions, loading, fetchQuestions, createQuestion, updateQuestion, deleteQuestion } = useQuestion();
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBook, setSelectedBook] = useState<string>('all');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [formData, setFormData] = useState({
    book_of_bible: '',
    chapter: 1,
    question: '',
    answer: '',
    points: 10,
    time_to_answer: 30,
    tier: 'free' as 'free' | 'pro' | 'enterprise',
  });

  // Load questions on component mount
  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Filter questions based on search and filters
  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         question.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         question.book_of_bible.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBook = selectedBook === 'all' || question.book_of_bible === selectedBook;
    const matchesTier = selectedTier === 'all' || question.tier === selectedTier;
    
    return matchesSearch && matchesBook && matchesTier;
  });

  // Paginate filtered results
  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedQuestions = filteredQuestions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Get unique books from questions
  const availableBooks = Array.from(new Set(questions.map(q => q.book_of_bible))).sort();

  // Define table columns
  const columns: TableColumn<Question>[] = [
    {
      key: 'question',
      header: 'Question',
      render: (question) => (
        <div className="max-w-xs">
          <p className="text-sm font-medium text-gray-900 line-clamp-2">
            {question.question}
          </p>
        </div>
      ),
    },
    {
      key: 'book_chapter',
      header: 'Book & Chapter',
      render: (question) => (
        <div className="text-sm text-gray-900">
          <div className="font-medium">{question.book_of_bible}</div>
          <div className="text-gray-500">Chapter {question.chapter}</div>
        </div>
      ),
      className: 'whitespace-nowrap',
    },
    {
      key: 'answer',
      header: 'Answer',
      render: (question) => (
        <div className="max-w-xs">
          <p className="text-sm text-gray-900 line-clamp-2">
            {question.answer}
          </p>
        </div>
      ),
    },
    {
      key: 'points',
      header: 'Points',
      render: (question) => (
        <div className="flex items-center">
          <Award className="h-4 w-4 text-yellow-500 mr-1" />
          <span className="text-sm font-medium text-gray-900">{question.points}</span>
        </div>
      ),
      className: 'whitespace-nowrap',
    },
    {
      key: 'time_to_answer',
      header: 'Time',
      render: (question) => (
        <div className="flex items-center">
          <Clock className="h-4 w-4 text-gray-500 mr-1" />
          <span className="text-sm text-gray-900">{question.time_to_answer}s</span>
        </div>
      ),
      className: 'whitespace-nowrap',
    },
    {
      key: 'tier',
      header: 'Tier',
      render: (question) => <Badge type="tier" value={question.tier} showIcon />,
      className: 'whitespace-nowrap',
    },
    {
      key: 'actions',
      header: '',
      render: (question) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleEditQuestion(question)}
            className="text-indigo-600 hover:text-indigo-700 transition-colors duration-200"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDeleteQuestion(question.id)}
            className="text-red-600 hover:text-red-700 transition-colors duration-200"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
      className: 'whitespace-nowrap text-right text-sm font-medium',
      headerClassName: 'relative',
    },
  ];

  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setFormData({
      book_of_bible: '',
      chapter: 1,
      question: '',
      answer: '',
      points: 10,
      time_to_answer: 30,
      tier: 'free',
    });
    setShowQuestionModal(true);
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setFormData({
      book_of_bible: question.book_of_bible,
      chapter: question.chapter,
      question: question.question,
      answer: question.answer,
      points: question.points,
      time_to_answer: question.time_to_answer,
      tier: question.tier,
    });
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = async () => {
    try {
      if (editingQuestion) {
        // Update existing question
        await updateQuestion(editingQuestion.id, formData);
      } else {
        // Add new question
        await createQuestion(formData);
      }
      setShowQuestionModal(false);
    } catch (error) {
      console.error('Error saving question:', error);
      // You could add error handling UI here
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (confirm('Are you sure you want to delete this question?')) {
      try {
        await deleteQuestion(questionId);
      } catch (error) {
        console.error('Error deleting question:', error);
        // You could add error handling UI here
      }
    }
  };

  const stats = {
    total: questions.length,
    free: questions.filter(q => q.tier === 'free').length,
    pro: questions.filter(q => q.tier === 'pro').length,
    enterprise: questions.filter(q => q.tier === 'enterprise').length,
    books: availableBooks.length,
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner fullScreen text="Loading questions..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Question Management</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage quiz questions for the Pathfinder Bible Experience.</p>
          </div>
          <button
            onClick={handleAddQuestion}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors duration-200 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Add Question</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <StatsCard
            title="Total Questions"
            value={stats.total}
            icon={BookOpen}
            iconColor="text-indigo-600"
          />
          <StatsCard
            title="Free"
            value={stats.free}
            icon={Tag}
            iconColor="text-green-600"
          />
          <StatsCard
            title="Pro"
            value={stats.pro}
            icon={Award}
            iconColor="text-blue-600"
          />
          <StatsCard
            title="Enterprise"
            value={stats.enterprise}
            icon={Award}
            iconColor="text-purple-600"
          />
          <StatsCard
            title="Bible Books"
            value={stats.books}
            icon={BookOpen}
            iconColor="text-gray-600"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6">
          <div className="flex flex-col space-y-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search questions by text, answer, or book..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <select
                value={selectedBook}
                onChange={(e) => setSelectedBook(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
              >
                <option value="all">All Books</option>
                {availableBooks.map((book) => (
                  <option key={book} value={book}>
                    {book}
                  </option>
                ))}
              </select>
              
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
              >
                <option value="all">All Tiers</option>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
              
              <div className="flex items-center text-sm text-gray-600">
                <Filter className="h-4 w-4 mr-2" />
                <span>{filteredQuestions.length} of {questions.length} questions</span>
              </div>
            </div>
          </div>
        </div>

        {/* Questions Table */}
        <Table
          columns={columns}
          data={pagedQuestions}
          loading={loading}
          emptyState={{
            icon: BookOpen,
            title: "No Questions Found",
            description: "No questions found matching your criteria"
          }}
        />

        {/* Pagination Controls */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredQuestions.length)} of {filteredQuestions.length}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

        {/* Question Modal */}
        <Modal
          isOpen={showQuestionModal}
          onClose={() => setShowQuestionModal(false)}
          title={editingQuestion ? 'Edit Question' : 'Add New Question'}
          maxWidth="2xl"
          footer={
            <>
              <button
                onClick={() => setShowQuestionModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuestion}
                disabled={!formData.book_of_bible || !formData.question || !formData.answer}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                <Save className="h-4 w-4" />
                <span>{editingQuestion ? 'Update Question' : 'Add Question'}</span>
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Book of the Bible
                </label>
                <select
                  value={formData.book_of_bible}
                  onChange={(e) => setFormData({ ...formData, book_of_bible: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
                  required
                >
                  <option value="">Select a book</option>
                  {bibleBooks.map((book) => (
                    <option key={book} value={book}>{book}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chapter
                </label>
                <input
                  type="number"
                  min="1"
                  max="150"
                  value={formData.chapter}
                  onChange={(e) => setFormData({ ...formData, chapter: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question
              </label>
              <textarea
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
                placeholder="Enter the quiz question..."
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Answer
              </label>
              <textarea
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
                placeholder="Enter the correct answer..."
                required
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Points
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 10 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time (seconds)
                </label>
                <input
                  type="number"
                  min="10"
                  max="300"
                  value={formData.time_to_answer}
                  onChange={(e) => setFormData({ ...formData, time_to_answer: parseInt(e.target.value) || 30 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tier
                </label>
                <select
                  value={formData.tier}
                  onChange={(e) => setFormData({ ...formData, tier: e.target.value as 'free' | 'pro' | 'enterprise' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
                  required
                >
                  <option value="free">🆓 Free</option>
                  <option value="pro">⭐ Pro</option>
                  <option value="enterprise">👑 Enterprise</option>
                </select>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}