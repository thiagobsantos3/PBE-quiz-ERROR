import React from 'react';
import { useAnalyticsContext } from '../../contexts/AnalyticsContext';
import { BookChapterPerformanceTable } from './BookChapterPerformanceTable';

export function BookChapterPerformanceTab() {
  const {
    selectedMemberId,
    bookChapterData,
    bookChapterLoading,
    bookChapterError
  } = useAnalyticsContext();

  return (
    <BookChapterPerformanceTable
      data={bookChapterData}
      loading={bookChapterLoading}
      error={bookChapterError}
      showIndividual={selectedMemberId !== undefined}
    />
  );
}