import React from 'react';
import { Eye, EyeOff, Check, X, Play, RotateCcw } from 'lucide-react';

interface QuizControlsProps {
  isFullScreen: boolean;
  showAnswer: boolean;
  hasTimeExpired: boolean;
  themeClasses: any;
  onShowAnswer: () => void;
  onShowQuestion: () => void;
  onCorrect: () => void;
  onIncorrect: () => void;
}

export function QuizControls({
  isFullScreen,
  showAnswer,
  hasTimeExpired,
  themeClasses,
  onShowAnswer,
  onShowQuestion,
  onCorrect,
  onIncorrect
}: QuizControlsProps) {
  if (isFullScreen) {
    return (
      <div className="fixed bottom-4 sm:bottom-6 left-0 right-0 z-20 px-4 sm:px-6">
        {showAnswer ? (
          <>
            {/* Mobile layout - stacked buttons */}
            <div className="sm:hidden flex flex-col items-center space-y-3">
              <button
                onClick={onShowQuestion}
                className={`${themeClasses.button} px-6 py-3 rounded-lg transition-colors duration-200 flex items-center space-x-2 text-lg w-full max-w-xs justify-center`}
              >
                <EyeOff className="h-5 w-5" />
                <span>Show Question</span>
              </button>
              
              <div className="flex space-x-3 w-full max-w-xs">
                <button
                  onClick={onCorrect}
                  className="bg-[#58c16c] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#4a9f5a] transition-colors duration-200 flex items-center justify-center text-lg flex-1"
                >
                  <Check className="h-5 w-5" />
                </button>
                
                <button
                  onClick={onIncorrect}
                  className="bg-[#F93F54] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#e6394c] transition-colors duration-200 flex items-center justify-center text-lg flex-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Desktop layout - horizontal buttons */}
            <div className="hidden sm:flex items-center justify-center space-x-8">
              <button
                onClick={onCorrect}
                className="bg-[#58c16c] text-white px-8 py-4 rounded-lg font-medium hover:bg-[#4a9f5a] transition-colors duration-200 flex items-center space-x-2 text-[2.5vw]"
              >
                <Check className="h-[2vw] w-[2vw]" />
                <span>Correct</span>
              </button>
              
              <button
                onClick={onShowQuestion}
                className={`${themeClasses.button} px-8 py-4 rounded-lg transition-colors duration-200 flex items-center space-x-2 text-[2.5vw]`}
              >
                <EyeOff className="h-[2vw] w-[2vw]" />
                <span>Show Question</span>
              </button>
              
              <button
                onClick={onIncorrect}
                className="bg-[#F93F54] text-white px-8 py-4 rounded-lg font-medium hover:bg-[#e6394c] transition-colors duration-200 flex items-center space-x-2 text-[2.5vw]"
              >
                <X className="h-[2vw] w-[2vw]" />
                <span>Incorrect</span>
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Show Answer button for mobile */}
            <div className="sm:hidden flex justify-center">
              <button
                onClick={onShowAnswer}
                className={`${themeClasses.button} px-6 py-3 rounded-lg transition-colors duration-200 flex items-center space-x-2 text-lg w-full max-w-xs justify-center`}
              >
                <Eye className="h-5 w-5" />
                <span>{hasTimeExpired ? 'Show Answer to Mark' : 'Show Answer'}</span>
              </button>
            </div>

            {/* Desktop show answer button */}
            <div className="hidden sm:flex justify-center">
              <button
                onClick={onShowAnswer}
                className={`${themeClasses.button} px-8 py-4 rounded-lg transition-colors duration-200 flex items-center space-x-2 text-[2.5vw]`}
              >
                <Eye className="h-[2vw] w-[2vw]" />
                <span>{hasTimeExpired ? 'Show Answer to Mark' : 'Show Answer'}</span>
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Regular buttons for non-fullscreen mode
  return (
    <div className="flex justify-center mt-6">
      {!showAnswer ? (
        <button
          onClick={onShowAnswer}
          className="bg-indigo-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-indigo-700 transition-colors duration-200 flex items-center space-x-2"
        >
          <Eye className="h-5 w-5" />
          <span>{hasTimeExpired ? 'Show Answer to Mark' : 'Show Answer'}</span>
        </button>
      ) : (
        <div className="space-y-4 w-full max-w-md">
          <button
            onClick={onShowQuestion}
            className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors duration-200 flex items-center space-x-2 mx-auto mb-6"
          >
            <EyeOff className="h-4 w-4" />
            <span>Show Question</span>
          </button>
          
          <div className="flex gap-4 justify-center">
            <button
              onClick={onCorrect}
              className="bg-[#58c16c] text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-[#4a9f5a] transition-colors duration-200 flex items-center space-x-2 justify-center flex-1"
            >
              <Check className="h-5 w-5" />
              <span className="hidden sm:inline">Correct</span>
            </button>
            
            <button
              onClick={onIncorrect}
              className="bg-[#F93F54] text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-[#e6394c] transition-colors duration-200 flex items-center space-x-2 justify-center flex-1"
            >
              <X className="h-5 w-5" />
              <span className="hidden sm:inline">Incorrect</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}