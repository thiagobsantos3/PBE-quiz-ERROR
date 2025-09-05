import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQuestion } from '../contexts/QuestionContext';
import { useQuizSession } from '../contexts/QuizSessionContext';
import { useStudyAssignments } from '../hooks/useStudyAssignments';
import { QuizRunner } from '../components/quiz/QuizRunner';
import { Layout } from '../components/layout/Layout';
import { 
  ArrowLeft,
  BookOpen,
  Play,
  RotateCcw,
  Clock,
  Target,
  AlertCircle,
  CheckCircle,
  Users
} from 'lucide-react';
import { StudyAssignment, StudyItem, Question } from '../types';
import { getAccessibleQuestions, filterQuestionsByStudyItems } from '../utils/quizUtils';
import { formatStudyItemsForAssignment } from '../utils/quizHelpers';

interface StudySelectionState {
  selectedStudyItems?: StudyItem[];
}

export function StudyScheduleQuiz() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { questions } = useQuestion();
  const { getAssignmentById } = useStudyAssignments();
  const { 
    createQuizSession, 
    loadQuizSession, 
    getSessionForAssignment,
    updateQuizSession 
  } = useQuizSession();

  const [assignment, setAssignment] = useState<StudyAssignment | null>(null);
  const [quizSessionId, setQuizSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questionOrder, setQuestionOrder] = useState<'verse' | 'random'>('random');

  // Get study selection from navigation state
  const studySelection = location.state as StudySelectionState | null;

  // Memoized helper functions
  const getQuestionsForAssignment = React.useCallback((): Question[] => {
    if (!assignment) return [];

    // Use selected study items if provided, otherwise use all assignment items
    const studyItems = studySelection?.selectedStudyItems || assignment.study_items;
    
    // Use the new filtering function that handles verses
    let filtered = filterQuestionsByStudyItems(questions, studyItems);

    // Filter by user's tier access
    filtered = getAccessibleQuestions(filtered, user?.subscription?.plan || 'free');

    // Sort questions based on selected order
    if (questionOrder === 'verse') {
      // Sort by book, then chapter, then verse
      return [...filtered].sort((a, b) => {
        // First sort by book
        if (a.book_of_bible !== b.book_of_bible) {
          return a.book_of_bible.localeCompare(b.book_of_bible);
        }
        // Then by chapter
        if (a.chapter !== b.chapter) {
          return a.chapter - b.chapter;
        }
        // Finally by verse (default to 1 if not specified)
        const aVerse = a.verse || 1;
        const bVerse = b.verse || 1;
        return aVerse - bVerse;
      });
    } else {
      // Shuffle questions randomly
      return [...filtered].sort(() => 0.5 - Math.random());
    }
  }, [assignment, studySelection?.selectedStudyItems, questions, user?.subscription?.plan, questionOrder]);

  // Enhanced format function to show verses when available
  const formatStudyItemsWithVerses = React.useCallback((items: StudyItem[]): string => {
    if (!items || items.length === 0) return '';
    
    return items.map(item => {
      if (item.verses && item.verses.length > 0) {
        // Format with specific verses
        const verseRanges = formatVerseRanges(item.verses);
        if (item.chapters.length === 1) {
          return `${item.book} ${item.chapters[0]}:${verseRanges}`;
        } else {
          return `${item.book} (Ch. ${item.chapters.join(', ')}, Verses: ${verseRanges})`;
        }
      } else {
        // Format without verses (whole chapters)
        if (item.chapters.length === 1) {
          return `${item.book} Chapter ${item.chapters[0]}`;
        } else {
          return `${item.book} (Ch. ${item.chapters.join(', ')})`;
        }
      }
    }).join(', ');
  }, []);

  // Helper function to format verse ranges
  const formatVerseRanges = React.useCallback((verses: number[]): string => {
    if (!verses || verses.length === 0) return '';
    
    const sortedVerses = [...verses].sort((a, b) => a - b);
    const ranges: string[] = [];
    let start = sortedVerses[0];
    let end = sortedVerses[0];
    
    for (let i = 1; i < sortedVerses.length; i++) {
      if (sortedVerses[i] === end + 1) {
        end = sortedVerses[i];
      } else {
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        start = end = sortedVerses[i];
      }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    
    return ranges.join(', ');
  }, []);
  const handleStartNewQuiz = React.useCallback(async () => {
    if (!assignment || !user) return;

    const assignmentQuestions = getQuestionsForAssignment();
    if (assignmentQuestions.length === 0) {
      setError('No questions available for this assignment');
      return;
    }

    // Calculate quiz metadata
    const totalPoints = assignmentQuestions.reduce((sum, q) => sum + q.points, 0);
    const estimatedSeconds = assignmentQuestions.reduce((sum, q) => sum + q.time_to_answer, 0);

    // Generate quiz title and description
    const studyItems = studySelection?.selectedStudyItems || assignment.study_items;
    const title = studyItems.length === 1 
      ? `${studyItems[0].book} Study Quiz`
      : `Multi-Book Study Quiz`;
    
    const description = `Study quiz for assignment: ${assignment.description || 'Study assignment'}`;

    // Create new quiz session
    try {
      const sessionId = await createQuizSession({
        type: 'study-assignment',
        title,
        description,
        user_id: user.id,
        team_id: user.teamId,
        assignment_id: assignment.id,
        questions: assignmentQuestions,
        current_question_index: 0,
        results: [],
        status: 'active',
        show_answer: false,
        time_left: assignmentQuestions[0]?.time_to_answer || 30,
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
      setError('Failed to create quiz session');
    }
  }, [assignment, user, getQuestionsForAssignment, studySelection?.selectedStudyItems, createQuizSession]);

  const handleResumeQuiz = React.useCallback(() => {
    const existingSession = getSessionForAssignment(assignmentId!, user!.id);
    if (existingSession) {
      setQuizSessionId(existingSession.id);
    }
  }, [assignmentId, user, getSessionForAssignment]);

  const handleDeleteSession = React.useCallback(() => {
    // This would be handled by QuizRunner when user chooses to restart
    setQuizSessionId(null);
  }, []);

  const formatStudyItems = React.useCallback((items: StudyItem[]): string => {
    if (items.length === 0) return '';
    if (items.length === 1) {
      const item = items[0];
      return `${item.book} (Ch. ${item.chapters.join(', ')})`;
    }
    return `${items.length} books`;
  }, []);

  // Redirect if user does not have access to this quiz type
  useEffect(() => {
    if (!user) return; // Wait for user to load
    if (user.planSettings && !user.planSettings.allow_study_schedule_quiz) {
      navigate('/quiz', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!assignmentId || !user) {
      setError('Assignment not found');
      setLoading(false);
      return;
    }

    const loadAssignment = async () => {
      try {
        console.log('📥 Loading assignment:', assignmentId);
        const assignmentData = await getAssignmentById(assignmentId);
        
        if (!assignmentData) {
          setError('Assignment not found');
          setLoading(false);
          return;
        }

        // Check if user has access to this assignment
        const hasAccess = assignmentData.user_id === user.id || 
                          (user.teamRole && ['owner', 'admin'].includes(user.teamRole));
        
        if (!hasAccess) {
          setError('You do not have access to this assignment');
          setLoading(false);
          return;
        }

        console.log('✅ Assignment loaded successfully:', assignmentData);
        setAssignment(assignmentData);

        // Check for existing quiz session for this assignment
        const existingSession = getSessionForAssignment(assignmentId, user.id);
        if (existingSession) {
          setQuizSessionId(existingSession.id);
        }

        setLoading(false);
      } catch (error) {
        console.error('💥 Error loading assignment:', error);
        setError('Failed to load assignment');
        setLoading(false);
      }
    };

    loadAssignment();
  }, [assignmentId, user, getSessionForAssignment, getAssignmentById]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading assignment...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50">
          <div className="p-6">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center mb-6">
                <button
                  onClick={() => navigate('/schedule')}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Schedule</span>
                </button>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
                <p className="text-gray-600 mb-6">{error}</p>
                <button
                  onClick={() => navigate('/schedule')}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                >
                  Return to Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // If quiz session is active, render QuizRunner
  if (quizSessionId) {
    return (
      <QuizRunner
        quizSessionId={quizSessionId}
        backUrl="/schedule"
        onSessionDeleted={handleDeleteSession}
      />
    );
  }

  // Render quiz preparation screen
  if (!assignment) return null;

  const studyItems = studySelection?.selectedStudyItems || assignment.study_items;
  const assignmentQuestions = getQuestionsForAssignment();
  const existingSession = getSessionForAssignment(assignmentId!, user!.id);
  const totalPoints = assignmentQuestions.reduce((sum, q) => sum + q.points, 0);
  const estimatedMinutes = Math.round(assignmentQuestions.reduce((sum, q) => sum + q.time_to_answer, 0) / 60);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="p-4 sm:p-6">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center mb-6">
              <button
                onClick={() => navigate('/schedule')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Schedule</span>
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 mb-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Study Assignment Quiz</h1>
                  <p className="text-gray-600">
                    {assignment.description || 'Complete your study assignment'}
                  </p>
                </div>
              </div>

              {/* Assignment Details */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-blue-900 mb-2">Assignment Details</h3>
                <div className="text-sm text-blue-800 space-y-1">
                  <div><strong>Date:</strong> {new Date(assignment.date).toLocaleDateString()}</div>
                  <div><strong>Study Items:</strong> {formatStudyItemsWithVerses(studyItems)}</div>
                  {studySelection?.selectedStudyItems && (
                    <div className="text-blue-600 text-xs mt-2">
                      ✓ Custom selection applied
                    </div>
                  )}
                </div>
              </div>

              {/* Question Order Selection */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-purple-900 mb-3">Question Order</h3>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="questionOrder"
                      value="verse"
                      checked={questionOrder === 'verse'}
                      onChange={(e) => setQuestionOrder(e.target.value as 'verse' | 'random')}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                    />
                    <span className="text-sm font-medium text-purple-900">By Verse Order</span>
                    <span className="text-xs text-purple-700">(Questions appear in biblical sequence)</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="questionOrder"
                      value="random"
                      checked={questionOrder === 'random'}
                      onChange={(e) => setQuestionOrder(e.target.value as 'verse' | 'random')}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                    />
                    <span className="text-sm font-medium text-purple-900">Random Order</span>
                    <span className="text-xs text-purple-700">(Questions appear in mixed order)</span>
                  </label>
                </div>
              </div>

              {/* Quiz Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-gray-900">{assignmentQuestions.length}</div>
                  <div className="text-sm text-gray-600">Questions</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-gray-900">~{estimatedMinutes}</div>
                  <div className="text-sm text-gray-600">Minutes</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-gray-900">{totalPoints}</div>
                  <div className="text-sm text-gray-600">Max Points</div>
                </div>
              </div>

              {assignmentQuestions.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">No questions available</p>
                  <p className="text-sm text-gray-400">
                    There are no questions available for the selected study items with your current subscription tier.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {existingSession ? (
                    <>
                      {/* Resume existing session */}
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center space-x-2 text-yellow-800">
                          <Clock className="h-5 w-5" />
                          <span className="font-medium">Quiz in Progress</span>
                        </div>
                        <p className="text-yellow-700 text-sm mt-1">
                          You have an active quiz session for this assignment. You can resume where you left off.
                        </p>
                        <div className="mt-3 text-sm text-yellow-700">
                          <div>Progress: {existingSession.results.length} of {existingSession.questions.length} questions</div>
                          <div>Current Score: {existingSession.total_points} points</div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={handleResumeQuiz}
                          className="flex items-center justify-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors duration-200 flex-1"
                        >
                          <Play className="h-5 w-5" />
                          <span>Resume Quiz</span>
                        </button>
                        <button
                          onClick={handleStartNewQuiz}
                          className="flex items-center justify-center space-x-2 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors duration-200 flex-1"
                        >
                          <RotateCcw className="h-5 w-5" />
                          <span>Start Over</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Start new session */}
                      <button
                        onClick={handleStartNewQuiz}
                        className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                      >
                        <Play className="h-5 w-5" />
                        <span>Start Study Quiz</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Study Items Breakdown */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Study Items</h3>
              <div className="space-y-3">
                {studyItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{item.book}</div>
                      <div className="text-sm text-gray-600">
                        {item.verses && item.verses.length > 0 ? (
                          <>
                            <div>Chapters: {item.chapters.join(', ')}</div>
                            <div className="text-purple-600 font-medium">
                              Verses: {formatVerseRanges(item.verses)}
                            </div>
                          </>
                        ) : (
                          <div>Chapters: {item.chapters.join(', ')} (All verses)</div>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {(() => {
                        let itemQuestions = questions.filter(q => 
                          q.book_of_bible === item.book && item.chapters.includes(q.chapter)
                        );
                        
                        if (item.verses && item.verses.length > 0) {
                          itemQuestions = itemQuestions.filter(q => {
                            const questionVerse = q.verse || 1;
                            return item.verses!.includes(questionVerse);
                          });
                        }
                        
                        return itemQuestions.length;
                      })()} question{(() => {
                        let itemQuestions = questions.filter(q => 
                          q.book_of_bible === item.book && item.chapters.includes(q.chapter)
                        );
                        
                        if (item.verses && item.verses.length > 0) {
                          itemQuestions = itemQuestions.filter(q => {
                            const questionVerse = q.verse || 1;
                            return item.verses!.includes(questionVerse);
                          });
                        }
                        
                        const count = itemQuestions.length;
                        return count !== 1 ? 's' : '';
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}