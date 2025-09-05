import React from 'react';
import { ArrowLeft, Maximize, Minimize, Sun, Moon, Clock } from 'lucide-react';

interface QuizHeaderProps {
  isFullScreen: boolean;
  isDarkMode: boolean;
  currentQuestionIndex: number;
  totalQuestions: number;
  progressPercentage: number;
  timeLeft: number;
  timerStarted: boolean;
  showAnswer: boolean;
  themeClasses: any;
  onBack: () => void;
  onToggleFullScreen: () => void;
  onToggleDarkMode: () => void;
  onStartTimer: () => void;
  formatTime: (seconds: number) => string;
}

export function QuizHeader({
  isFullScreen,
  isDarkMode,
  currentQuestionIndex,
  totalQuestions,
  progressPercentage,
  timeLeft,
  timerStarted,
  showAnswer,
  themeClasses,
  onBack,
  onToggleFullScreen,
  onToggleDarkMode,
  onStartTimer,
  formatTime
}: QuizHeaderProps) {
  if (isFullScreen) {
    return (
      <>
        {/* PBE Header - only in full screen mode */}
        <div className="absolute top-0 left-0 right-0 z-10">
          <div className="flex items-center justify-between p-4 sm:p-6">
            <div className="flex items-center">
              <img 
                src="/PBE-logo_600px.png" 
                alt="Pathfinder Bible Experience" 
                className="h-24 sm:h-32 md:h-40 w-auto"
              />
            </div>
            <div className={`text-center ${themeClasses.text} hidden sm:block`}>
              <div className="text-sm sm:text-lg font-semibold">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </div>
              <div className="text-xs sm:text-sm opacity-75">
                {progressPercentage}% correct so far
              </div>
              {/* Progress bar in header */}
              <div className={`w-32 sm:w-64 ${themeClasses.timerButton} rounded-full h-2 mt-2 mx-auto`}>
                <div
                  className={`${themeClasses.progressBar} h-2 rounded-full transition-all duration-300`}
                  style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={onStartTimer}
                disabled={timerStarted || showAnswer}
                className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 rounded-lg transition-all duration-200 ${themeClasses.timerButton}`}
              >
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className={`font-mono text-sm sm:text-lg ${timeLeft <= 10 ? 'text-red-300' : ''}`}>
                  {formatTime(timeLeft)}
                </span>
              </button>
              
              {/* Only show full screen toggle on desktop */}
              {window.innerWidth >= 640 && (
                <button
                  onClick={onToggleFullScreen}
                  className={`p-2 ${themeClasses.text} hover:bg-white/10 rounded-lg transition-all duration-200 backdrop-blur-sm`}
                  title="Exit full screen"
                >
                  <Minimize className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Dark/Light Mode Toggle - bottom left */}
        <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 z-30">
          <div className="flex items-center space-x-2">
            <button
              onClick={onToggleDarkMode}
              className={`p-2 sm:p-3 rounded-full ${isDarkMode ? 'bg-gray-700 text-yellow-400' : 'bg-gray-600 text-white'} backdrop-blur-sm transition-all duration-200 hover:scale-110`}
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <Sun className="h-4 w-4 sm:h-5 sm:w-5" /> : <Moon className="h-4 w-4 sm:h-5 sm:w-5" />}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className={`${themeClasses.card} rounded-xl shadow-sm p-6 mb-6`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className={`text-lg font-semibold ${themeClasses.text}`}>
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={onStartTimer}
            disabled={timerStarted || showAnswer}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${themeClasses.timerButton}`}
          >
            <Clock className="h-4 w-4" />
            <span className={`font-mono text-lg ${timeLeft <= 10 ? 'text-red-600' : ''}`}>
              {formatTime(timeLeft)}
            </span>
          </button>
          
          {/* Only show full screen toggle on desktop */}
          {window.innerWidth >= 640 && (
            <button
              onClick={onToggleFullScreen}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              title="Enter full screen"
            >
              <Maximize className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${themeClasses.progressBar} h-2 rounded-full transition-all duration-300`}
          style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
        ></div>
      </div>
      
      {/* Progress percentage */}
      <div className="text-center mt-4">
        <div className={`text-sm ${themeClasses.textSecondary}`}>
          {progressPercentage}% correct so far
        </div>
      </div>
    </div>
  );
}