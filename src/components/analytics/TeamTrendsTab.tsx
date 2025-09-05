import React from 'react';
import { useAnalyticsContext } from '../../contexts/AnalyticsContext';
import { TeamPerformanceTrendsReport } from './TeamPerformanceTrendsReport';

export function TeamTrendsTab() {
  const {
    progressionTimeframe,
    setProgressionTimeframe,
    teamTrendsData,
    teamTrendsLoading,
    teamTrendsError
  } = useAnalyticsContext();

  return (
    <TeamPerformanceTrendsReport
      data={teamTrendsData}
      loading={teamTrendsLoading}
      error={teamTrendsError}
      timeframe={progressionTimeframe}
      onTimeframeChange={setProgressionTimeframe}
    />
  );
}