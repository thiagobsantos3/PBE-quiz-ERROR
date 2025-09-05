import React, { memo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Question } from '../../types';

interface QuizQuestionProps {
  question: Question;
  hasTimeExpired: boolean;
  isFullScreen: boolean;
  isDarkMode: boolean;
  themeClasses: any;
}

export function QuizQuestion({ 
  question, 
  hasTimeExpired, 
  isFullScreen, 
  isDarkMode, 
  themeClasses 
}: QuizQuestionProps) {
  return (
    <div className="text-center">
      <div className="mb-6 sm:mb-8">
        <div className={`font-medium mb-2 sm:mb-4 ${isFullScreen ? (isDarkMode ? 'text-blue-300' : 'text-[#1a255b]') : 'text-indigo-600'} ${isFullScreen ? 'text-[2.5vw]' : 'text-lg'}`}>
          {question.points} points
        </div>
        <h2 className={`font-semibold ${themeClasses.text} leading-relaxed ${isFullScreen ? 'text-[3.5vw]' : 'text-lg sm:text-2xl'}`}>
          {question.question}
        </h2>
      </div>
      
      {hasTimeExpired && (
        <div className={`mb-6 p-4 border-2 ${isFullScreen ? 'border-red-300 bg-red-500/20' : 'border-red-200 bg-red-50'} rounded-lg`}>
          <div className={`flex items-center justify-center space-x-2 ${isFullScreen ? 'text-red-300' : 'text-red-700'}`}>
            <AlertTriangle className="h-5 w-5" />
            <span className="font-semibold text-lg">Time's Up!</span>
          </div>
          <p className={`${isFullScreen ? 'text-red-200' : 'text-red-600'} text-sm mt-1`}>
            Click "Show Answer" to reveal the answer and mark your response
          </p>
        </div>
      )}
    </div>
  );
}

export default memo(QuizQuestion);