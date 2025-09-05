import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Question, QuestionContextType } from '../types';
import { useAuth } from './AuthContext';

const QuestionContext = createContext<QuestionContextType | undefined>(undefined);

export function QuestionProvider({ children }: { children: ReactNode }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, developerLog, loading: authLoading } = useAuth();

  const fetchQuestions = useCallback(async () => {
    if (authLoading) {
      developerLog('🔍 QuestionContext: Auth still loading, skipping question fetch');
      return;
    }

    setLoading(true);
    try {
      developerLog('🔍 Fetching questions from Supabase...');
      
      const { data, error } = await supabase
        .from('questions')
        .select('id, book_of_bible, chapter, verse, question, answer, points, time_to_answer, tier, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        developerLog('❌ Error fetching questions:', error);
        throw error;
      }

      developerLog('✅ Questions fetched successfully:', data?.length || 0, 'questions');
      setQuestions(data || []);
    } catch (error) {
      developerLog('💥 Error in fetchQuestions:', error);
      // Set empty array on error to prevent undefined state
      setQuestions([]);
    } finally {
      // Always reset loading state, regardless of success or failure
      setLoading(false);
    }
  }, [authLoading, developerLog]);

  // Fetch questions when component mounts or when user authentication changes
  React.useEffect(() => {
    if (!authLoading) {
      developerLog('🔍 QuestionContext: Auth loaded, fetching questions');
      fetchQuestions();
    }
  }, [authLoading, fetchQuestions]);

  const createQuestion = useCallback(async (questionData: Omit<Question, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      developerLog('📝 Creating new question...');
      
      const { data, error } = await supabase
        .from('questions')
        .insert([{
          ...questionData,
          created_by: user.id,
        }])
        .select()
        .single();

      if (error) {
        developerLog('❌ Error creating question:', error);
        throw error;
      }

      developerLog('✅ Question created successfully:', data);
      setQuestions(prev => [data, ...prev]);
    } catch (error) {
      developerLog('💥 Error creating question:', error);
      throw error;
    }
  }, [user]);

  const updateQuestion = useCallback(async (id: string, questionData: Partial<Question>) => {
    try {
      developerLog('📝 Updating question:', id);
      
      const { data, error } = await supabase
        .from('questions')
        .update(questionData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        developerLog('❌ Error updating question:', error);
        throw error;
      }

      developerLog('✅ Question updated successfully:', data);
      setQuestions(prev => prev.map(q => q.id === id ? data : q));
    } catch (error) {
      developerLog('💥 Error updating question:', error);
      throw error;
    }
  }, []);

  const deleteQuestion = useCallback(async (id: string) => {
    try {
      developerLog('🗑️ Deleting question:', id);
      
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id);

      if (error) {
        developerLog('❌ Error deleting question:', error);
        throw error;
      }

      developerLog('✅ Question deleted successfully');
      setQuestions(prev => prev.filter(q => q.id !== id));
    } catch (error) {
      developerLog('💥 Error deleting question:', error);
      throw error;
    }
  }, []);

  const value: QuestionContextType = {
    questions,
    loading,
    fetchQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
  };

  return (
    <QuestionContext.Provider value={value}>
      {children}
    </QuestionContext.Provider>
  );
}

export function useQuestion() {
  const context = useContext(QuestionContext);
  if (context === undefined) {
    throw new Error('useQuestion must be used within a QuestionProvider');
  }
  return context;
}