import React from 'react';
import { useAnalyticsContext } from '../../contexts/AnalyticsContext';
import { QuestionPerformanceTable } from './QuestionPerformanceTable';

export function QuestionPerformanceTab() {
  const {
    selectedMemberId,
    user,
    questionPerformanceData,
    questionPerformanceLoading,
    questionPerformanceError
  } = useAnalyticsContext();

  return (
    <QuestionPerformanceTable
      data={questionPerformanceData}
      loading={questionPerformanceLoading}
      error={questionPerformanceError}
      showIndividual={selectedMemberId !== undefined}
      user={user}
    />
  );
}