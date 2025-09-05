import React, { createContext, useContext, ReactNode } from 'react';
import { User, TeamMemberForSchedule } from '../types';

export interface AnalyticsContextType {
  // User and team data
  user: User | null;
  selectedMemberId: string | undefined;
  setSelectedMemberId: (memberId: string | undefined) => void;
  teamMembers: TeamMemberForSchedule[];
  canSelectIndividuals: boolean;
  
  // Date range
  startDate: Date;
  setStartDate: (date: Date) => void;
  endDate: Date;
  setEndDate: (date: Date) => void;
  
  // Timeframe
  progressionTimeframe: 'weekly' | 'monthly';
  setProgressionTimeframe: (timeframe: 'weekly' | 'monthly') => void;
  
  // Analytics data
  analyticsData: any;
  analyticsLoading: boolean;
  analyticsError: string | null;
  
  // Knowledge gaps data
  knowledgeGapsData: any;
  knowledgeGapsLoading: boolean;
  knowledgeGapsError: string | null;
  
  // Progression data
  progressionData: any;
  progressionLoading: boolean;
  progressionError: string | null;
  
  // Quiz history data
  quizHistoryData: any;
  quizHistoryLoading: boolean;
  quizHistoryError: string | null;
  refreshQuizHistoryData: () => void;
  
  // Study schedule data
  studyScheduleData: any;
  studyScheduleLoading: boolean;
  studyScheduleError: string | null;
  
  // Question performance data
  questionPerformanceData: any;
  questionPerformanceLoading: boolean;
  questionPerformanceError: string | null;
  
  // Engagement data
  engagementData: any;
  engagementLoading: boolean;
  engagementError: string | null;
  
  // Team trends data
  teamTrendsData: any;
  teamTrendsLoading: boolean;
  teamTrendsError: string | null;
  
  // Book chapter data
  bookChapterData: any;
  bookChapterLoading: boolean;
  bookChapterError: string | null;
  
  // Computed values
  selectedMemberInfo: TeamMemberForSchedule | undefined;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

interface AnalyticsProviderProps {
  children: ReactNode;
  value: AnalyticsContextType;
}

export function AnalyticsProvider({ children, value }: AnalyticsProviderProps) {
  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalyticsContext() {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalyticsContext must be used within an AnalyticsProvider');
  }
  return context;
}