import React from 'react';
import { useAnalyticsContext } from '../../contexts/AnalyticsContext';
import { useQuizHistoryDataWithLocalUpdate } from '../../hooks/useQuizHistoryData';
import { QuizHistoryTable } from './QuizHistoryTable';

export function QuizHistoryTab() {
  const {
    selectedMemberId,
    startDate,
    endDate
  } = useAnalyticsContext();

  const { 
    data: quizHistoryData, 
    loading: quizHistoryLoading, 
    error: quizHistoryError,
    refreshData: refreshQuizHistoryData,
    updateLocalQuizHistoryEntry 
  } = useQuizHistoryDataWithLocalUpdate({
    userId: selectedMemberId,
    startDate,
    endDate
  });

  return (
    <QuizHistoryTable
      data={quizHistoryData}
      loading={quizHistoryLoading}
      error={quizHistoryError}
      updateLocalQuizHistoryEntry={updateLocalQuizHistoryEntry}
      refreshData={refreshQuizHistoryData}
    />
  );
}