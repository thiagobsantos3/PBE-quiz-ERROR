import React from 'react';
import { useAnalyticsContext } from '../../contexts/AnalyticsContext';
import { StudyScheduleAnalysisTable } from './StudyScheduleAnalysisTable';

export function StudyScheduleTab() {
  const {
    studyScheduleData,
    studyScheduleLoading,
    studyScheduleError
  } = useAnalyticsContext();

  return (
    <StudyScheduleAnalysisTable
      data={studyScheduleData}
      loading={studyScheduleLoading}
      error={studyScheduleError}
    />
  );
}