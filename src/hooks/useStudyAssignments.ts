import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { StudyAssignment, TeamMemberForSchedule } from '../types';
import { parseDbDateToUtc, formatDateForDb } from '../utils/dateUtils';

export function useStudyAssignments() {
  const { user, developerLog } = useAuth();
  const [assignments, setAssignments] = useState<StudyAssignment[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberForSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureStudyItemsArray = (assignment: any): StudyAssignment => {
    developerLog('🔧 ensureStudyItemsArray: Raw assignment from DB:', assignment);
    
    const normalized = {
      ...assignment,
      date: typeof assignment.date === 'string' ? parseDbDateToUtc(assignment.date) : assignment.date,
      study_items: assignment.study_items || []
    };
    
    developerLog('✅ ensureStudyItemsArray: Normalized assignment:', normalized);
    return normalized;
  };

  // Export as normalizeAssignment for external use
  const normalizeAssignment = ensureStudyItemsArray;

  const legacyNormalizeAssignment = (assignment: StudyAssignment): StudyAssignment => {
    if (assignment.study_items) {
      return assignment;
    }
    // Convert legacy format
    return {
      ...assignment,
      study_items: []
    };
  };

  const loadTeamMembers = useCallback(async () => {
    if (!user?.id) return;

    try {
      developerLog('📥 Loading team members for user:', user.id);
      
      // Use database function to get team members (bypasses RLS recursion issues)
      const { data: teamMembersResult, error: membersError } = await supabase
        .rpc('get_team_members_for_user', { p_user_id: user.id });

      if (membersError) {
        console.error('❌ Error loading team members:', membersError);
        setError('Failed to load team members');
        return;
      }

      developerLog('📊 Team members function result:', teamMembersResult);

      if (!teamMembersResult?.success) {
        console.error('❌ Team members function failed:', teamMembersResult?.error);
        setError('Failed to load team members');
        return;
      }

      // The function returns data in our expected format
      const transformedMembers: TeamMemberForSchedule[] = teamMembersResult.team_members || [];

      developerLog('✅ Team members loaded:', transformedMembers);
      setTeamMembers(transformedMembers);
    } catch (error) {
      console.error('💥 Error loading team members:', error);
      setError('Failed to load team members');
    }
  }, [user?.id, developerLog]);

  const loadAssignments = useCallback(async () => {
    if (!user?.teamId) return;

    try {
      developerLog('📥 Loading study assignments for team:', user.teamId);
      
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('study_assignments')
        .select('id, team_id, user_id, date, study_items, description, completed, completed_at, created_at')
        .eq('team_id', user.teamId)
        .order('date', { ascending: true })
        .limit(100);

      if (assignmentsError) {
        console.error('❌ Error loading assignments:', assignmentsError);
        setError('Failed to load assignments');
        return;
      }

      developerLog('📊 Raw assignments data from DB:', assignmentsData);

      // Transform the data to match our interface
      const transformedAssignments: StudyAssignment[] = [];
      
      for (const assignment of assignmentsData || []) {
        const transformedAssignment = ensureStudyItemsArray(assignment);
        
        developerLog('🔍 Processing assignment:', {
          id: assignment.id,
          completed: assignment.completed,
          date: assignment.date,
          study_items: assignment.study_items
        });
        
        // If assignment is completed, fetch the latest completed quiz session for this assignment
        if (assignment.completed) {
          try {
            developerLog('🔍 Fetching quiz session data for completed assignment:', assignment.id);
            
            const { data: quizSession, error: sessionError } = await supabase
              .from('quiz_sessions')
              .select('id, total_points, max_points, total_actual_time_spent_seconds, completed_at, questions')
              .eq('assignment_id', assignment.id)
              .eq('status', 'completed')
              .order('completed_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (!sessionError && quizSession) {
              developerLog('✅ Found quiz session data for assignment:', assignment.id, quizSession);
              
              // Populate assignment with quiz session data
              transformedAssignment.quiz_session_id = quizSession.id;
              transformedAssignment.total_points_earned = quizSession.total_points;
              transformedAssignment.max_points_possible = quizSession.max_points;
              transformedAssignment.total_questions_answered = Array.isArray(quizSession.questions) 
                ? quizSession.questions.length 
                : 0;
              transformedAssignment.total_time_spent_minutes = quizSession.total_actual_time_spent_seconds 
                ? Math.round(quizSession.total_actual_time_spent_seconds / 60)
                : 0;
              
              developerLog('✅ Assignment populated with quiz data:', {
                assignmentId: assignment.id,
                quiz_session_id: transformedAssignment.quiz_session_id,
                total_points_earned: transformedAssignment.total_points_earned,
                max_points_possible: transformedAssignment.max_points_possible,
                total_questions_answered: transformedAssignment.total_questions_answered,
                total_time_spent_minutes: transformedAssignment.total_time_spent_minutes
              });
            } else {
              developerLog('⚠️ No quiz session found for completed assignment:', assignment.id, sessionError);
            }
          } catch (error) {
            developerLog('💥 Error fetching quiz session for assignment:', assignment.id, error);
            // Continue without quiz session data rather than failing completely
          }
        } else {
          developerLog('ℹ️ Assignment not completed, skipping quiz session fetch:', assignment.id);
        }
        
        transformedAssignments.push(transformedAssignment);
      }
      developerLog('✅ Transformed assignments:', transformedAssignments);
      setAssignments(transformedAssignments);
    } catch (error) {
      console.error('💥 Error loading assignments:', error);
      setError('Failed to load assignments');
    }
  }, [user?.teamId, developerLog]);

  const saveAssignment = useCallback(async (assignment: StudyAssignment) => {
    try {
      setLoading(true);
      setError(null);

      developerLog('💾 Saving assignment:', assignment);

      const assignmentData = {
        id: assignment.id,
        user_id: assignment.user_id,
        team_id: assignment.team_id,
        date: formatDateForDb(assignment.date),
        study_items: assignment.study_items,
        description: assignment.description,
        created_by: assignment.created_by || user?.id,
        completed: assignment.completed || false,
        completed_at: assignment.completed_at
      };

      // Check if assignment exists
      const { data: existingAssignment } = await supabase
        .from('study_assignments')
        .select('id')
        .eq('id', assignment.id)
        .maybeSingle();

      if (existingAssignment) {
        // Update existing assignment
        developerLog('📝 Updating existing assignment');
        const { error } = await supabase
          .from('study_assignments')
          .update({
            study_items: assignmentData.study_items,
            description: assignmentData.description,
            completed: assignmentData.completed,
            completed_at: assignmentData.completed_at,
            updated_at: new Date().toISOString()
          })
          .eq('id', assignment.id);

        if (error) {
          console.error('❌ Error updating assignment:', error);
          throw error;
        }

        // Update local state
        setAssignments(prev => prev.map(a => a.id === assignment.id ? assignment : a));
      } else {
        // Create new assignment
        developerLog('➕ Creating new assignment');
        const { error } = await supabase
          .from('study_assignments')
          .insert([assignmentData]);

        if (error) {
          console.error('❌ Error creating assignment:', error);
          throw error;
        }

        // Add to local state
        setAssignments(prev => [...prev, assignment]);
      }

      developerLog('✅ Assignment saved successfully');
    } catch (error) {
      console.error('💥 Error saving assignment:', error);
      setError('Failed to save assignment');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user?.id, developerLog]);

  const deleteAssignment = useCallback(async (assignmentId: string) => {
    try {
      setLoading(true);
      setError(null);

      developerLog('🗑️ Deleting assignment:', assignmentId);

      const { error } = await supabase
        .from('study_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) {
        console.error('❌ Error deleting assignment:', error);
        throw error;
      }

      // Remove from local state
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
      developerLog('✅ Assignment deleted successfully');
    } catch (error) {
      console.error('💥 Error deleting assignment:', error);
      setError('Failed to delete assignment');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [developerLog]);

  const getAssignmentById = useCallback(async (assignmentId: string): Promise<StudyAssignment | null> => {
    if (!user?.teamId || !assignmentId) return null;
    
    // Validate assignment ID format (basic UUID validation)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(assignmentId)) {
      throw new Error('Invalid assignment ID format');
    }

    try {
      developerLog('📥 Loading assignment by ID:', assignmentId);
      
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('study_assignments')
        .select('*')
        .eq('id', assignmentId)
        .eq('team_id', user.teamId) // Ensure user can only access assignments from their team
        .maybeSingle();

      if (assignmentError) {
        console.error('❌ Error loading assignment:', assignmentError);
        throw assignmentError;
      }

      if (!assignmentData) {
        console.warn('⚠️ Assignment not found:', assignmentId);
        return null;
      }
      
      // Additional authorization check
      if (assignmentData.team_id !== user.teamId) {
        throw new Error('Unauthorized access to assignment');
      }
      
      // Check if user has permission to view this assignment
      const hasPermission = assignmentData.user_id === user.id || 
                           user.teamRole === 'owner' || 
                           user.teamRole === 'admin';
      
      if (!hasPermission) {
        throw new Error('Insufficient permissions to view assignment');
      }

      developerLog('✅ Assignment loaded:', assignmentData);

      // Transform the data using our normalization function
      const transformedAssignment = ensureStudyItemsArray(assignmentData);

      return transformedAssignment;
    } catch (error) {
      console.error('💥 Error loading assignment by ID:', error);
      throw error;
    }
  }, [user?.teamId, developerLog]);
  const loadAllData = useCallback(async () => {
    if (!user?.teamId) {
      setTeamMembers([]);
      setAssignments([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Load both team members and assignments in parallel
      await Promise.all([
        loadTeamMembers(),
        loadAssignments()
      ]);
    } catch (error) {
      console.error('💥 Error loading data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [user?.teamId, loadTeamMembers, loadAssignments]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  return {
    assignments,
    teamMembers,
    loading,
    error,
    normalizeAssignment, // This is now ensureStudyItemsArray
    saveAssignment,
    deleteAssignment,
    getAssignmentById,
    loadAssignments: loadAllData
  };
}