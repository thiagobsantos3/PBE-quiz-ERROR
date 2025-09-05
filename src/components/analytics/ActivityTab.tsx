import React from 'react';
import { useAnalyticsContext } from '../../contexts/AnalyticsContext';
import { EngagementActivityTable } from './EngagementActivityTable';

export function ActivityTab() {
  const {
    selectedMemberId,
    engagementData,
    engagementLoading,
    engagementError
  } = useAnalyticsContext();

  return (
    <EngagementActivityTable
      data={engagementData}
      loading={engagementLoading}
      error={engagementError}
      showIndividual={selectedMemberId !== undefined}
    />
  );
}