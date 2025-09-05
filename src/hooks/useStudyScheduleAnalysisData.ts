import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { StudyAssignment } from '../types';
import { parseDbDateToUtc } from '../utils/dateUtils';

interface UseStudyScheduleAnalysisDataProps {
  teamId: string | undefined;
  userId?: string; // Optional, for individual analysis
  startDate?: Date;
  endDate?: Date;
}

export function useStudyScheduleAnalysisData({ teamId, userId, startDate, endDate }: UseStudyScheduleAnalysisDataProps) {
  const [data, setData] = useState<StudyAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudyScheduleData = useCallback(async () => {
    if (!teamId) {
      console.log('🔍 useStudyScheduleAnalysisData: No teamId provided, skipping data fetch');
      setLoading(false);
      setData([]);
      return;
    }

    console.log('🔍 useStudyScheduleAnalysisData: Starting study schedule analysis with params:', { teamId, userId, startDate, endDate });

    setLoading(true);
    setError(null);

    try {
      // Build the query
      let query = supabase
        .from('study_assignments')
        .select('*')
        .eq('team_id', teamId);

      // Filter by user if provided
      if (userId) {
        console.log('🔍 useStudyScheduleAnalysisData: Filtering by userId:', userId);
        query = query.eq('user_id', userId);
      }

      // Apply date range filters if provided
      if (startDate) {
        query = query.gte('date', startDate.toISOString().split('T')[0]);
      }
      if (endDate) {
        query = query.lte('date', endDate.toISOString().split('T')[0]);
      }

      // Order by date descending
      query = query.order('date', { ascending: false });

      const { data: assignments, error: assignmentsError } = await query;

      if (assignmentsError) {
        console.error('❌ useStudyScheduleAnalysisData: Error fetching assignments:', assignmentsError);
        throw assignmentsError;
      }

      console.log('✅ useStudyScheduleAnalysisData: Fetched assignments:', assignments?.length || 0);

      // Transform the data to ensure proper date parsing and study_items normalization
      const transformedAssignments: StudyAssignment[] = [];
      
      for (const assignment of assignments || []) {
        const transformedAssignment: StudyAssignment = {
          ...assignment,
          date: typeof assignment.date === 'string' ? parseDbDateToUtc(assignment.date) : assignment.date,
          study_items: assignment.study_items || []
        };
        
        // Fetch the latest completed quiz session for this assignment
        if (assignment.completed) {
          try {
            const { data: quizSession, error: sessionError } = await supabase
              .from('quiz_sessions')
              .select('id, total_points, max_points, questions, total_actual_time_spent_seconds')
              .eq('assignment_id', assignment.id)
              .eq('status', 'completed')
              .order('completed_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (!sessionError && quizSession) {
              transformedAssignment.quiz_session_id = quizSession.id;
              transformedAssignment.total_points_earned = quizSession.total_points;
              transformedAssignment.max_points_possible = quizSession.max_points;
              transformedAssignment.total_questions_answered = Array.isArray(quizSession.questions) 
                ? quizSession.questions.length 
                : 0;
              transformedAssignment.total_time_spent_minutes = quizSession.total_actual_time_spent_seconds 
                ? Math.round(quizSession.total_actual_time_spent_seconds / 60)
                : 0;
            }
          } catch (error) {
            console.warn('⚠️ Could not fetch quiz session data for assignment:', assignment.id, error);
          }
        }
        
        transformedAssignments.push(transformedAssignment);
      }

      console.log('✅ useStudyScheduleAnalysisData: Transformed assignments:', transformedAssignments.length);
      setData(transformedAssignments);

    } catch (err: any) {
      console.error('❌ useStudyScheduleAnalysisData: Error fetching study schedule data:', err);
      setError(err.message || 'Failed to load study schedule data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [teamId, userId, startDate, endDate]);

  useEffect(() => {
    fetchStudyScheduleData();
  }, [fetchStudyScheduleData]);

  return { data, loading, error, refreshData: fetchStudyScheduleData };
}