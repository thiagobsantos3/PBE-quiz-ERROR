import React, { memo } from 'react';
import { Question } from '../../types';

interface QuizAnswerProps {
  question: Question;
  isFullScreen: boolean;
  isDarkMode: boolean;
  themeClasses: any;
}

export function QuizAnswer({ 
  question, 
  isFullScreen, 
  isDarkMode, 
  themeClasses 
}: QuizAnswerProps) {
  return (
    <div className="text-center">
      <div className="mb-6 sm:mb-8">
        <div className={`font-medium mb-2 ${isFullScreen ? (isDarkMode ? 'text-blue-300' : 'text-[#1a255b]') : 'text-indigo-600'} ${isFullScreen ? 'text-[2.5vw]' : 'text-lg'}`}>
          {question.points} points
        </div>
        <div className={`text-sm ${themeClasses.textSecondary} mb-2`}>Answer:</div>
        <div className={`font-semibold p-4 rounded-lg ${themeClasses.text} ${isFullScreen ? 'text-[3.5vw]' : 'text-lg sm:text-2xl'}`}>
          {question.answer}
        </div>
      </div>
    </div>
  );
}

export default memo(QuizAnswer);