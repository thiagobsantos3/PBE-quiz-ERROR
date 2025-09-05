import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQuestion } from '../contexts/QuestionContext';
import { useQuizSession } from '../contexts/QuizSessionContext';
import { QuizRunner } from '../components/quiz/QuizRunner';
import { 
  ArrowLeft,
  BookOpen,
  Settings,
  Play,
  Check,
  AlertCircle,
  Crown,
  Star,
  Loader
} from 'lucide-react';
import { Question } from '../types';
import { getAccessibleQuestions, getChaptersForBook, getAvailableBooksFromQuestions } from '../utils/quizUtils';

interface BookChapterSelection {
  [book: string]: number[];
}

export function CreateOwnQuiz() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { questions, loading: questionsLoading, fetchQuestions } = useQuestion();
  const { createQuizSession } = useQuizSession();
  const [quizSessionId, setQuizSessionId] = useState<string | null>(null);
  
  // Redirect if user does not have access to this quiz type
  useEffect(() => {
    if (!user) return; // Wait for user to load
    if (user.planSettings && !user.planSettings.allow_create_own_quiz) {
      navigate('/quiz', { replace: true });
    }
  }, [user, navigate]);

  // Quiz configuration state - now supporting multiple books
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [bookChapterSelections, setBookChapterSelections] = useState<BookChapterSelection>({});
  const [maxQuestions, setMaxQuestions] = useState<number>(20);

  // Load questions when component mounts
  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Get available books from questions
  const availableBooks = React.useMemo(() => 
    getAvailableBooksFromQuestions(questions), 
    [questions]
  );

  // Memoized helper functions
  const getFilteredQuestions = React.useCallback((): Question[] => {
    if (selectedBooks.length === 0) return [];
    
    let filtered: Question[] = [];
    
    // Collect questions from all selected books and chapters
    selectedBooks.forEach(book => {
      const bookChapters = bookChapterSelections[book] || [];
      if (bookChapters.length > 0) {
        const bookQuestions = questions.filter(q => 
          q.book_of_bible === book && bookChapters.includes(q.chapter)
        );
        filtered = [...filtered, ...bookQuestions];
      }
    });

    // Filter by user's tier access
    filtered = getAccessibleQuestions(filtered, user?.subscription?.plan || 'free');

    // Shuffle and limit
    const shuffled = [...filtered].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(maxQuestions, filtered.length));
  }, [selectedBooks, bookChapterSelections, questions, user?.subscription?.plan, maxQuestions]);

  const getAvailableQuestionsCount = React.useCallback((): number => {
    if (selectedBooks.length === 0) return 0;
    
    let count = 0;
    selectedBooks.forEach(book => {
      const bookChapters = bookChapterSelections[book] || [];
      if (bookChapters.length > 0) {
        const bookQuestions = questions.filter(q => 
          q.book_of_bible === book && bookChapters.includes(q.chapter)
        );
        count += getAccessibleQuestions(bookQuestions, user?.subscription?.plan || 'free').length;
      }
    });
    
    return count;
  }, [selectedBooks, bookChapterSelections, questions, user?.subscription?.plan]);

  const getQuizTitle = React.useCallback(() => {
    if (selectedBooks.length === 0) return 'Custom Quiz';
    if (selectedBooks.length === 1) return `${selectedBooks[0]} Quiz`;
    if (selectedBooks.length === 2) return `${selectedBooks[0]} & ${selectedBooks[1]} Quiz`;
    return `Multi-Book Quiz (${selectedBooks.length} books)`;
  }, [selectedBooks]);

  const filteredQuestions = getFilteredQuestions();
  
  const getQuizDescription = React.useCallback(() => {
    if (selectedBooks.length === 0) return 'Custom quiz';
    
    const totalChapters = Object.values(bookChapterSelections).reduce((sum, chapters) => sum + chapters.length, 0);
    const booksList = selectedBooks.length <= 2 
      ? selectedBooks.join(' & ')
      : `${selectedBooks.slice(0, 2).join(', ')} and ${selectedBooks.length - 2} more`;
    
    return `Custom quiz covering ${booksList} with ${totalChapters} chapters and ${filteredQuestions.length} questions.`;
  }, [selectedBooks, bookChapterSelections, filteredQuestions.length]);

  // Get user's subscription plan limits
  // Use user.planSettings.max_questions_custom_quiz
  const getQuestionLimit = () => {
    return user?.planSettings?.max_questions_custom_quiz || 20; // Default to 20 if not set
  };

  const questionLimit = getQuestionLimit();
  const userPlan = user?.subscription?.plan || 'free';

  // Handle book selection (multiple books)
  const handleBookToggle = React.useCallback((book: string) => {
    setSelectedBooks(prev => {
      const newBooks = prev.includes(book)
        ? prev.filter(b => b !== book)
        : [...prev, book];
      
      // If removing a book, also remove its chapter selections
      if (!newBooks.includes(book)) {
        setBookChapterSelections(prev => {
          const newSelections = { ...prev };
          delete newSelections[book];
          return newSelections;
        });
      }
      
      return newBooks;
    });
  }, []);

  // Handle chapter selection for a specific book
  const handleChapterToggle = React.useCallback((book: string, chapter: number) => {
    setBookChapterSelections(prev => {
      const bookChapters = prev[book] || [];
      const newChapters = bookChapters.includes(chapter)
        ? bookChapters.filter(c => c !== chapter)
        : [...bookChapters, chapter];
      
      return {
        ...prev,
        [book]: newChapters
      };
    });
  }, []);

  // Handle select all chapters for a book
  const handleSelectAllChaptersForBook = React.useCallback((book: string) => {
    const availableChapters = getChaptersForBook(book, questions);
    const currentChapters = bookChapterSelections[book] || [];
    const allSelected = currentChapters.length === availableChapters.length;
    
    setBookChapterSelections(prev => ({
      ...prev,
      [book]: allSelected ? [] : availableChapters
    }));
  }, [questions, bookChapterSelections]);

  const availableQuestionsCount = getAvailableQuestionsCount();

  // Start the quiz
  const handleStartQuiz = React.useCallback(async () => {
    if (filteredQuestions.length === 0 || !user) return;
    
    // Calculate quiz metadata
    const totalPoints = filteredQuestions.reduce((sum, q) => sum + q.points, 0);
    const estimatedSeconds = filteredQuestions.reduce((sum, q) => sum + q.time_to_answer, 0);

    // Generate quiz title and description
    const title = getQuizTitle();
    const description = getQuizDescription();

    // Create quiz session
    try {
      const sessionId = await createQuizSession({
        type: 'custom',
        title,
        description,
        user_id: user.id,
        team_id: user.teamId,
        questions: filteredQuestions,
        current_question_index: 0,
        results: [],
        status: 'active',
        show_answer: false,
        time_left: filteredQuestions[0]?.time_to_answer || 30,
        timer_active: false,
        timer_started: false,
        has_time_expired: false,
        total_points: 0,
        max_points: totalPoints,
        total_actual_time_spent_seconds: 0, // Will be calculated when completed
      });

      setQuizSessionId(sessionId);
    } catch (error) {
      console.error('Error creating quiz session:', error);
    }
  }, [filteredQuestions, user, getQuizTitle, getQuizDescription, createQuizSession]);

  // Calculate estimated time
  const estimatedMinutes = Math.round(filteredQuestions.reduce((sum, q) => sum + q.time_to_answer, 0) / 60);
  const maxPoints = filteredQuestions.reduce((sum, q) => sum + q.points, 0);

  const handleSessionDeleted = () => {
    setQuizSessionId(null);
    // Reset form or redirect
  };

  // If quiz is started, render QuizRunner
  if (quizSessionId) {
    return (
      <QuizRunner
        quizSessionId={quizSessionId}
        backUrl="/quiz"
        onSessionDeleted={handleSessionDeleted}
      />
    );
  }

  // Show loading state while questions are being fetched
  if (questionsLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50">
          <div className="p-4 sm:p-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center mb-6">
                <button
                  onClick={() => navigate('/quiz')}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Quiz Center</span>
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 text-center">
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-6">
                  <Loader className="h-6 w-6 text-blue-600 animate-spin" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Loading Questions...</h1>
                <p className="text-gray-600">Please wait while we fetch the available questions.</p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="p-4 sm:p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center mb-6">
              <button
                onClick={() => navigate('/quiz')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Quiz Center</span>
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 mb-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Settings className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Create Your Own Quiz</h1>
                  <p className="text-gray-600">Customize your study experience by selecting specific books and chapters.</p>
                </div>
              </div>

              {/* Debug info */}
              {questions.length === 0 && !questionsLoading && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <div>
                      <h3 className="text-sm font-medium text-yellow-900">No Questions Available</h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        No questions were found in the database. Please check if questions have been added to the system.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Available Books Info */}
              {availableBooks.length === 0 && questions.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    <div>
                      <h3 className="text-sm font-medium text-blue-900">Loading Books</h3>
                      <p className="text-sm text-blue-700 mt-1">
                        Analyzing available Bible books from the question database...
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Subscription Plan Info */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {userPlan === 'enterprise' ? (
                      <Crown className="h-5 w-5 text-purple-600" />
                    ) : userPlan === 'pro' ? (
                      <Star className="h-5 w-5 text-blue-600" />
                    ) : (
                      <BookOpen className="h-5 w-5 text-gray-600" />
                    )}
                    <div>
                      <div className="font-medium text-gray-900 capitalize">{userPlan} Plan</div>
                      <div className="text-sm text-gray-600">
                        {userPlan === 'enterprise' 
                          ? 'Unlimited questions per quiz'
                          : `Up to ${questionLimit} questions per quiz`
                        }
                      </div>
                    </div>
                  </div>
                  {userPlan === 'free' && (
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      Upgrade Plan
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Configuration Panel */}
                <div className="space-y-6">
                  {/* Book Selection - Multiple Books */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Select Bible Books
                    </label>
                    {availableBooks.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <BookOpen className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p>No books available</p>
                        <p className="text-sm">Questions need to be added to the system</p>
                      </div>
                    ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {availableBooks.map((book) => {
                        const bookQuestionCount = getAccessibleQuestions(
                          questions.filter(q => q.book_of_bible === book),
                          user?.subscription?.plan || 'free'
                        ).length;
                        
                        return (
                          <button
                            key={book}
                            onClick={() => handleBookToggle(book)}
                            className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                              selectedBooks.includes(book)
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">{book}</div>
                                <div className="text-sm text-gray-500">
                                  {bookQuestionCount} questions available
                                </div>
                              </div>
                              {selectedBooks.includes(book) && (
                                <Check className="h-5 w-5 text-blue-600" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    )}
                    {selectedBooks.length > 0 && (
                      <div className="mt-2 text-sm text-gray-600">
                        {selectedBooks.length} book{selectedBooks.length !== 1 ? 's' : ''} selected
                      </div>
                    )}
                  </div>

                  {/* Chapter Selection for Each Book */}
                  {selectedBooks.map((book) => (
                    <div key={book}>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-gray-700">
                          {book} Chapters
                        </label>
                        <button
                          onClick={() => handleSelectAllChaptersForBook(book)}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {(bookChapterSelections[book] || []).length === getChaptersForBook(book, questions).length 
                            ? 'Deselect All' 
                            : 'Select All'
                          }
                        </button>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-4">
                        {getChaptersForBook(book, questions).map((chapter) => {
                          const chapterQuestionCount = getAccessibleQuestions(
                            questions.filter(q => 
                              q.book_of_bible === book && q.chapter === chapter
                            ),
                            user?.subscription?.plan || 'free'
                          ).length;
                          
                          const isSelected = (bookChapterSelections[book] || []).includes(chapter);
                          
                          return (
                            <button
                              key={`${book}-${chapter}`}
                              onClick={() => handleChapterToggle(book, chapter)}
                              className={`p-3 rounded-lg border-2 text-center transition-all duration-200 ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                              title={`${book} Chapter ${chapter} - ${chapterQuestionCount} questions`}
                            >
                              <div className="font-medium">{chapter}</div>
                              <div className="text-xs text-gray-500">{chapterQuestionCount}q</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Question Limit */}
                  {availableQuestionsCount > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Maximum Questions
                      </label>
                      <div className="space-y-3">
                        <input
                          type="range"
                          min="1"
                          max={Math.min(questionLimit, availableQuestionsCount)}
                          value={Math.min(maxQuestions, availableQuestionsCount)}
                          onChange={(e) => setMaxQuestions(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                        />
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            {Math.min(maxQuestions, availableQuestionsCount)} question{Math.min(maxQuestions, availableQuestionsCount) !== 1 ? 's' : ''}
                          </span>
                          <span className="text-gray-500">
                            {availableQuestionsCount} available
                          </span>
                        </div>
                        {maxQuestions > availableQuestionsCount && (
                          <div className="flex items-center space-x-2 text-amber-600 text-sm">
                            <AlertCircle className="h-4 w-4" />
                            <span>Not enough questions available. Maximum: {availableQuestionsCount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Preview Panel */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Quiz Preview</h3>
                  
                  {filteredQuestions.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{filteredQuestions.length}</div>
                          <div className="text-sm text-gray-600">Questions</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">~{estimatedMinutes}</div>
                          <div className="text-sm text-gray-600">Minutes</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">{maxPoints}</div>
                          <div className="text-sm text-gray-600">Max Points</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">{selectedBooks.length}</div>
                          <div className="text-sm text-gray-600">Book{selectedBooks.length !== 1 ? 's' : ''}</div>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Coverage</h4>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div><strong>Books:</strong> {selectedBooks.join(', ')}</div>
                          <div><strong>Total Chapters:</strong> {Object.values(bookChapterSelections).reduce((sum, chapters) => sum + chapters.length, 0)}</div>
                          <div><strong>Difficulty:</strong> Mixed levels</div>
                        </div>
                      </div>

                      <button
                        onClick={handleStartQuiz}
                        className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center space-x-2"
                      >
                        <Play className="h-5 w-5" />
                        <span>Start Custom Quiz</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm text-gray-400">
                        Select books and chapters to see your quiz preview
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}