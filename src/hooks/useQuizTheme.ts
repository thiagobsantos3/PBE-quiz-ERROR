import { useState, useMemo } from 'react';

interface ThemeClasses {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  button: string;
  timerButton: string;
  progressBar: string;
}

export function useQuizTheme(isFullScreen: boolean) {
  const [isDarkMode, setIsDarkMode] = useState(true);

  const themeClasses: ThemeClasses = useMemo(() => {
    if (!isFullScreen) {
      return {
        background: 'bg-gray-50',
        card: 'bg-white',
        text: 'text-gray-900',
        textSecondary: 'text-gray-600',
        border: 'border-gray-200',
        button: 'bg-indigo-600 hover:bg-indigo-700',
        timerButton: 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700',
        progressBar: 'bg-green-600',
      };
    }

    if (isDarkMode) {
      return {
        background: 'bg-gradient-to-b from-[#1a255b] to-[#0e132f]',
        card: 'bg-transparent',
        text: 'text-white',
        textSecondary: 'text-white/80',
        border: 'border-white/20',
        button: 'bg-[#1a255b] hover:bg-[#1a255b]/90 text-white',
        timerButton: 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm',
        progressBar: 'bg-white',
      };
    } else {
      return {
        background: 'bg-[#FAFAFA]',
        card: 'bg-transparent',
        text: 'text-[#1a255b]',
        textSecondary: 'text-[#1a255b]/80',
        border: 'border-[#1a255b]/20',
        button: 'bg-[#1a255b] hover:bg-[#1a255b]/90 text-white',
        timerButton: 'bg-[#1a255b]/20 hover:bg-[#1a255b]/30 text-[#1a255b] backdrop-blur-sm',
        progressBar: 'bg-[#1a255b]',
      };
    }
  }, [isFullScreen, isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return {
    isDarkMode,
    themeClasses,
    toggleDarkMode
  };
}