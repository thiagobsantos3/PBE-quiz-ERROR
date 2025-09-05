import { Question } from '../types';
import { Zap, Edit, Calendar, Trophy } from 'lucide-react';
import { StudyItem } from '../types';

/**
 * Filters questions based on user's subscription tier access
 * @param questionList - Array of questions to filter
 * @param userTier - User's subscription tier ('free', 'pro', 'enterprise')
 * @param developerLog - Optional logging function for developer mode
 * @returns Filtered array of questions the user can access
 */
export function getAccessibleQuestions(
  questionList: Question[], 
  userTier: 'free' | 'pro' | 'enterprise' = 'free',
  developerLog?: (...args: any[]) => void
): Question[] {
  const tierHierarchy = { free: 0, pro: 1, enterprise: 2 };
  const userTierLevel = tierHierarchy[userTier];
  
  developerLog?.('🔍 getAccessibleQuestions: Input parameters:', {
    totalQuestions: questionList.length,
    userTier,
    userTierLevel
  });
  
  if (questionList.length === 0) {
    developerLog?.('🔍 getAccessibleQuestions: No questions provided, returning empty array');
    return [];
  }
  
  // Log tier distribution of input questions
  const tierDistribution = questionList.reduce((acc, q) => {
    acc[q.tier] = (acc[q.tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  developerLog?.('🔍 getAccessibleQuestions: Input questions by tier:', tierDistribution);
  
  return questionList.filter(q => {
    const questionTierLevel = tierHierarchy[q.tier];
    const isAccessible = questionTierLevel <= userTierLevel;
    
    if (!isAccessible) {
      developerLog?.(`🔍 getAccessibleQuestions: Filtering out question with tier '${q.tier}' (level ${questionTierLevel}) for user tier '${userTier}' (level ${userTierLevel})`);
    }
    
    return isAccessible;
  });
}

/**
 * Filter questions based on study items (books, chapters, and optionally verses)
 * @param questions - Array of all available questions
 * @param studyItems - Array of study items with books, chapters, and optional verses
 * @param developerLog - Optional logging function for developer mode
 * @returns Filtered array of questions matching the study items
 */
export function filterQuestionsByStudyItems(
  questions: Question[],
  studyItems: StudyItem[],
  developerLog?: (...args: any[]) => void
): Question[] {
  if (!questions || questions.length === 0) {
    developerLog?.('🔍 filterQuestionsByStudyItems: No questions provided, returning empty array');
    return [];
  }

  if (!studyItems || studyItems.length === 0) {
    developerLog?.('🔍 filterQuestionsByStudyItems: No study items provided, returning empty array');
    return [];
  }

  developerLog?.('🔍 filterQuestionsByStudyItems: Filtering', questions.length, 'questions with', studyItems.length, 'study items');

  let filteredQuestions: Question[] = [];

  studyItems.forEach((item, itemIndex) => {
    developerLog?.(`🔍 filterQuestionsByStudyItems: Processing study item ${itemIndex + 1}:`, {
      book: item.book,
      chapters: item.chapters,
      verses: item.verses,
      hasVerses: !!item.verses && item.verses.length > 0
    });

    item.chapters.forEach(chapter => {
      // Filter questions for this book and chapter
      const bookChapterQuestions = questions.filter(q => 
        q.book_of_bible === item.book && q.chapter === chapter
      );

      developerLog?.(`🔍 filterQuestionsByStudyItems: Found ${bookChapterQuestions.length} questions for ${item.book} Chapter ${chapter}`);

      if (item.verses && item.verses.length > 0) {
        // Filter by specific verses if provided
        const verseFilteredQuestions = bookChapterQuestions.filter(q => {
          const questionVerse = q.verse || 1; // Default to verse 1 if not specified
          return item.verses!.includes(questionVerse);
        });

        developerLog?.(`🔍 filterQuestionsByStudyItems: After verse filtering (verses ${item.verses.join(', ')}): ${verseFilteredQuestions.length} questions`);
        filteredQuestions = [...filteredQuestions, ...verseFilteredQuestions];
      } else {
        // Include all questions from this chapter if no specific verses
        developerLog?.(`🔍 filterQuestionsByStudyItems: Including all questions from ${item.book} Chapter ${chapter}`);
        filteredQuestions = [...filteredQuestions, ...bookChapterQuestions];
      }
    });
  });

  // Remove duplicates (in case the same question appears in multiple study items)
  const uniqueQuestions = filteredQuestions.filter((question, index, self) => 
    index === self.findIndex(q => q.id === question.id)
  );

  developerLog?.('🔍 filterQuestionsByStudyItems: Final result:', {
    totalFiltered: filteredQuestions.length,
    uniqueQuestions: uniqueQuestions.length,
    duplicatesRemoved: filteredQuestions.length - uniqueQuestions.length
  });

  return uniqueQuestions;
}

/**
 * Get chapters available for a specific book from questions
 * @param book - Bible book name
 * @param questions - Array of questions to search
 * @returns Sorted array of chapter numbers
 */
export function getChaptersForBook(book: string, questions: Question[]): number[] {
  const bookQuestions = questions.filter(q => q.book_of_bible === book);
  const chapters = [...new Set(bookQuestions.map(q => q.chapter))].sort((a, b) => a - b);
  return chapters;
}

/**
 * Get verses available for a specific book and chapter from questions
 * @param book - Bible book name
 * @param chapter - Chapter number
 * @param questions - Array of questions to search
 * @returns Sorted array of verse numbers
 */
export function getVersesForChapter(book: string, chapter: number, questions: Question[]): number[] {
  const chapterQuestions = questions.filter(q => 
    q.book_of_bible === book && q.chapter === chapter
  );
  const verses = [...new Set(chapterQuestions.map(q => q.verse || 1))].sort((a, b) => a - b);
  return verses;
}

/**
 * Get available Bible books from questions
 * @param questions - Array of questions to analyze
 * @returns Sorted array of unique book names
 */
export function getAvailableBooksFromQuestions(questions: Question[]): string[] {
  const books = [...new Set(questions.map(q => q.book_of_bible))].sort();
  return books;
}

/**
 * Get display name for quiz type
 * @param type - The quiz type string
 * @returns A human-readable string for the quiz type
 */
export function getQuizTypeDisplayName(type: string): string {
  switch (type) {
    case 'quick-start':
      return 'Quick Start';
    case 'custom':
      return 'Custom Quiz';
    case 'study-assignment':
      return 'Study Assignment';
    default:
      return 'Quiz';
  }
}

/**
 * Get icon component for quiz type
 */
export function getQuizTypeIcon(type: string) {
  switch (type) {
    case 'quick-start':
      return Zap;
    case 'custom':
      return Edit;
    case 'study-assignment':
      return Calendar;
    default:
      return Trophy;
  }
}