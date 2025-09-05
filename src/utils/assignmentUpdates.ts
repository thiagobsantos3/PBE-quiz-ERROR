import { supabase } from '../lib/supabase';
import { StudyItem } from '../types';

/**
 * Check if all chapters in a study assignment have been completed
 * and mark the assignment as completed if so
 * @param assignmentId - The ID of the assignment to mark as completed
 */
export async function checkAndMarkAssignmentCompleted(assignmentId: string): Promise<void> {
  try {
    console.log('🔍 Checking if assignment should be marked as completed:', assignmentId);
    
    // First, get the assignment details to know what chapters need to be completed
    const { data: assignment, error: assignmentError } = await supabase
      .from('study_assignments')
      .select('id, study_items, completed')
      .eq('id', assignmentId)
      .single();

    if (assignmentError) {
      console.error('❌ Error loading assignment for completion check:', assignmentError);
      throw assignmentError;
    }

    if (!assignment) {
      console.warn('⚠️ Assignment not found for completion check:', assignmentId);
      return;
    }

    if (assignment.completed) {
      console.log('ℹ️ Assignment already marked as completed:', assignmentId);
      return;
    }

    console.log('📚 Assignment study items:', assignment.study_items);

    // Get all quiz sessions for this assignment to see what has been completed
    const { data: quizSessions, error: sessionsError } = await supabase
      .from('quiz_sessions')
      .select('id, questions, status, completed_at')
      .eq('assignment_id', assignmentId)
      .eq('status', 'completed');

    if (sessionsError) {
      console.error('❌ Error loading quiz sessions for assignment:', sessionsError);
      throw sessionsError;
    }

    console.log('🎯 Completed quiz sessions for assignment:', quizSessions?.length || 0);

    if (!quizSessions || quizSessions.length === 0) {
      console.log('ℹ️ No completed quiz sessions found for assignment');
      return;
    }

    // Extract all chapters that have been quizzed from completed sessions
    const completedChapters = new Set<string>();
    
    quizSessions.forEach(session => {
      if (session.questions && Array.isArray(session.questions)) {
        session.questions.forEach((question: any) => {
          if (question.book_of_bible && question.chapter) {
            const chapterKey = `${question.book_of_bible}:${question.chapter}`;
            completedChapters.add(chapterKey);
          }
        });
      }
    });

    console.log('✅ Chapters completed through quizzes:', Array.from(completedChapters));

    // Check if all required chapters have been completed
    const studyItems: StudyItem[] = assignment.study_items || [];
    const requiredChapters = new Set<string>();
    
    studyItems.forEach(item => {
      item.chapters.forEach(chapter => {
        const chapterKey = `${item.book}:${chapter}`;
        requiredChapters.add(chapterKey);
      });
    });

    console.log('📋 Required chapters for assignment:', Array.from(requiredChapters));

    // Check if all required chapters have been completed
    const allChaptersCompleted = Array.from(requiredChapters).every(chapter => 
      completedChapters.has(chapter)
    );

    console.log('🎯 All chapters completed?', allChaptersCompleted);

    if (allChaptersCompleted) {
      console.log('🎉 All chapters completed! Marking assignment as completed:', assignmentId);
      
      const { error } = await supabase
        .from('study_assignments')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId);

      if (error) {
        console.error('❌ Error marking assignment as completed:', error);
        throw error;
      }

      console.log('✅ Assignment marked as completed successfully');
    } else {
      const completedCount = completedChapters.size;
      const totalCount = requiredChapters.size;
      console.log(`📊 Assignment progress: ${completedCount}/${totalCount} chapters completed`);
    }

  } catch (error) {
    console.error('💥 Failed to check/mark assignment completion:', error);
    throw error;
  }
}

/**
 * Legacy function name for backward compatibility
 * @deprecated Use checkAndMarkAssignmentCompleted instead
 */
export async function markAssignmentAsCompletedInDb(assignmentId: string): Promise<void> {
  return checkAndMarkAssignmentCompleted(assignmentId);
}