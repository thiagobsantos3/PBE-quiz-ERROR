import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQuestion } from '../contexts/QuestionContext';
import { useQuizSession } from '../contexts/QuizSessionContext';
import { QuizRunner } from '../components/quiz/QuizRunner';

export function QuickStartQuiz() {
  const navigate = useNavigate();
  const { user, developerLog } = useAuth();
  const { questions, fetchQuestions } = useQuestion();
  const { createQuizSession, getActiveSessionsForUser } = useQuizSession();
  const [quizSessionId, setQuizSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initializationAttempted = useRef(false);

  useEffect(() => {
    // Fetch questions when component mounts
    fetchQuestions();
  }, [fetchQuestions]);

  useEffect(() => {
    // Prevent multiple initialization attempts
    if (initializationAttempted.current) {
      setLoading(false);
      return;
    }

    if (!user) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    // If we already have a quiz session ID, don't re-initialize
    if (quizSessionId) {
      setLoading(false);
      return;
    }

    if (questions.length === 0) {
      // Still waiting for questions to load
      return;
    }

    const initializeQuizSession = async () => {
      // Mark that we're attempting initialization
      initializationAttempted.current = true;
      setLoading(true);
      
      try {
        developerLog('🔍 Checking for existing active quick-start sessions...');
        
        // Check for existing active quick-start sessions
        const activeSessions = getActiveSessionsForUser(user.id);
        const existingQuickStartSession = activeSessions.find(session => 
          session.type === 'quick-start' && 
          (session.status === 'active' || session.status === 'paused')
        );

        if (existingQuickStartSession) {
          developerLog('✅ Found existing quick-start session, resuming:', existingQuickStartSession.id);
          // Navigate to the existing session instead of creating a new one
          navigate(`/quiz/runner/${existingQuickStartSession.id}`);
          return;
        }

        developerLog('🆕 No existing quick-start session found, creating new one...');
        developerLog('🎯 Initializing quiz session with', questions.length, 'total questions');
        
        // Filter questions based on user's tier access
        const accessibleTiers = user?.planSettings?.question_tier_access || ['free']; // Default to 'free' if not set
        
        developerLog('👤 User accessible tiers:', accessibleTiers);
        
        const accessibleQuestions = questions.filter(q => {
          return accessibleTiers.includes(q.tier);
        });

        developerLog('✅ Accessible questions:', accessibleQuestions.length);

        if (accessibleQuestions.length === 0) {
          setError('No questions available for your subscription tier');
          setLoading(false);
          return;
        }

        // Shuffle and select up to 90 questions
        const shuffled = [...accessibleQuestions].sort(() => 0.5 - Math.random());
        const selectedQuestions = shuffled.slice(0, Math.min(90, shuffled.length));

        developerLog('🎲 Selected questions for quiz:', selectedQuestions.length);

        // Calculate quiz metadata
        const totalPoints = selectedQuestions.reduce((sum, q) => sum + q.points, 0);
        const estimatedSeconds = selectedQuestions.reduce((sum, q) => sum + q.time_to_answer, 0);

        developerLog('📊 Quiz metadata - Points:', totalPoints, 'Minutes:', estimatedMinutes);

        // Create quiz session
        const sessionId = await createQuizSession({
          type: 'quick-start',
          title: 'Quick Start Quiz',
          description: 'Test your Pathfinder Bible Experience knowledge with random questions. Each question has a time limit and point value based on difficulty.',
          user_id: user.id,
          team_id: user.teamId,
          questions: selectedQuestions,
          current_question_index: 0,
          results: [],
          status: 'active',
          show_answer: false,
          time_left: selectedQuestions[0]?.time_to_answer || 30,
          timer_active: false,
          timer_started: false,
          has_time_expired: false,
          total_points: 0,
          max_points: totalPoints,
          total_actual_time_spent_seconds: 0, // Will be calculated when completed
        });

        developerLog('🎉 Quiz session created with ID:', sessionId);
        setQuizSessionId(sessionId);
        
        // Navigate to the quiz runner immediately
        navigate(`/quiz/runner/${sessionId}`);
      } catch (error) {
        developerLog('💥 Error initializing quiz session:', error);
        setError(error instanceof Error ? error.message : 'Failed to create quiz session');
        // Reset the flag on error so user can retry
        initializationAttempted.current = false;
        setLoading(false);
      }
    };

    initializeQuizSession();
  }, [user, questions, createQuizSession, getActiveSessionsForUser, navigate]);

  const handleSessionDeleted = () => {
    setQuizSessionId(null);
    // Could redirect back to quiz center or restart
    window.location.href = '/quiz';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Preparing your quiz...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-xl">⚠</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Start Quiz</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.href = '/quiz'}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
          >
            Back to Quiz Center
          </button>
        </div>
      </div>
    );
  }

  if (!quizSessionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Starting quiz session...</p>
        </div>
      </div>
    );
  }

  return (
    <QuizRunner
      quizSessionId={quizSessionId}
      backUrl="/quiz"
      onSessionDeleted={handleSessionDeleted}
    />
  );
}