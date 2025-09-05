import React from 'react';
import { useAnalyticsContext } from '../../contexts/AnalyticsContext';
import { KnowledgeGapsSection } from './KnowledgeGapsSection';

export function KnowledgeGapsTab() {
  const {
    selectedMemberId,
    knowledgeGapsData,
    knowledgeGapsLoading,
    knowledgeGapsError
  } = useAnalyticsContext();

  return (
    <KnowledgeGapsSection
      data={knowledgeGapsData}
      loading={knowledgeGapsLoading}
      error={knowledgeGapsError}
      showIndividual={selectedMemberId !== undefined}
    />
  );
}