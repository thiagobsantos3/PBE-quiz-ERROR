import { StudyItem, Question } from '../types';
import { getAccessibleQuestions, filterQuestionsByStudyItems } from './quizUtils';
import { getVersesForChapter } from './quizUtils';
import { getUtcMidnight } from './dateUtils';

/**
 * Format an array of numbers into compact ranges
 * @param numbers - Array of numbers to format
 * @returns Formatted string with ranges (e.g., "1-3, 5, 7-10")
 */
export function formatNumberRanges(numbers: number[]): string {
  if (!numbers || numbers.length === 0) return '';
  
  const sortedNumbers = [...numbers].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sortedNumbers[0];
  let end = sortedNumbers[0];
  
  for (let i = 1; i < sortedNumbers.length; i++) {
    if (sortedNumbers[i] === end + 1) {
      end = sortedNumbers[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = end = sortedNumbers[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  
  return ranges.join(', ');
}

/**
 * Calculate total questions for study items based on user's subscription tier
 * @param studyItems - Array of study items to calculate questions for
 * @param questions - Array of all available questions
 * @param userPlan - User's subscription plan
 * @param developerLog - Optional logging function for developer mode
 * @returns Total number of accessible questions for the study items
 */
export function calculateTotalQuestionsForStudyItems(
  studyItems: StudyItem[],
  questions: Question[],
  userPlan: 'free' | 'pro' | 'enterprise' = 'free',
  developerLog?: (...args: any[]) => void
): number {
  developerLog?.('*** Entering calculateTotalQuestionsForStudyItems ***');
  developerLog?.('*** Input studyItems:', studyItems);
  developerLog?.('*** Total questions available:', questions.length);
  
  developerLog?.('🔍 calculateTotalQuestionsForStudyItems: Input studyItems:', studyItems);
  developerLog?.('🔍 calculateTotalQuestionsForStudyItems: Total questions in database:', questions.length);
  developerLog?.('🔍 calculateTotalQuestionsForStudyItems: User subscription plan:', userPlan);
  
  // Use the utility function to filter questions by study items (handles books, chapters, and verses)
  const filteredQuestions = filterQuestionsByStudyItems(questions, studyItems);
  
  // Filter by user's accessible tiers
  const accessibleQuestions = getAccessibleQuestions(
    filteredQuestions, 
    userPlan
  );
  
  developerLog?.('*** Final count:', accessibleQuestions.length);
  developerLog?.('🔍 calculateTotalQuestionsForStudyItems: Total count:', accessibleQuestions.length);
  return accessibleQuestions.length;
}

/**
 * Calculate current study streak based on completed quiz sessions
 * @param sessions - Array of completed quiz sessions with completed_at timestamps
 * @returns Number of consecutive days with completed assignments
 */
export function calculateCurrentStudyStreak(sessions: any[]): number {
  if (!sessions || sessions.length === 0) return 0;
  
  // Get unique study dates from completed sessions, normalized to London timezone
  const studyDateTimestamps = [...new Set(
    sessions.map(session => {
      const date = new Date(session.completed_at);
      // Get midnight of this date in London timezone
      const londonMidnight = getUtcMidnight(date);
      return londonMidnight.getTime();
    })
  )].sort((a, b) => b - a); // Sort descending (most recent first)
  
  if (studyDateTimestamps.length === 0) return 0;
  
  let streak = 0;
  const todayTimestamp = getUtcMidnight(new Date()).getTime();
  const yesterdayTimestamp = todayTimestamp - (24 * 60 * 60 * 1000);
  
  // Check if streak should start from today or yesterday
  let expectedTimestamp = todayTimestamp;
  const mostRecentStudyTimestamp = studyDateTimestamps[0];
  
  // If most recent study was yesterday, start streak from yesterday
  if (mostRecentStudyTimestamp === yesterdayTimestamp) {
    expectedTimestamp = yesterdayTimestamp;
  } else if (mostRecentStudyTimestamp !== todayTimestamp) {
    // If most recent study was not today or yesterday, no current streak
    return 0;
  }
  
  // Calculate consecutive days
  for (const studyTimestamp of studyDateTimestamps) {
    if (studyTimestamp === expectedTimestamp) {
      streak++;
      // Move to previous day in London timezone
      expectedTimestamp -= (24 * 60 * 60 * 1000);
    } else {
      break;
    }
  }
  
  return streak;
}

/**
 * Calculate longest study streak from all completed quiz sessions
 * @param sessions - Array of completed quiz sessions with completed_at timestamps
 * @returns Number representing the longest consecutive study streak
 */
export function calculateLongestStudyStreak(sessions: any[]): number {
  if (!sessions || sessions.length === 0) return 0;
  
  // Get unique study dates from completed sessions, normalized to London timezone
  const studyDateTimestamps = [...new Set(
    sessions.map(session => {
      const date = new Date(session.completed_at);
      // Get midnight of this date in London timezone
      const londonMidnight = getUtcMidnight(date);
      return londonMidnight.getTime();
    })
  )].sort((a, b) => a - b); // Sort ascending (oldest first)
  
  if (studyDateTimestamps.length === 0) return 0;
  if (studyDateTimestamps.length === 1) return 1;
  
  let longestStreak = 1;
  let currentStreak = 1;
  
  for (let i = 1; i < studyDateTimestamps.length; i++) {
    const currentTimestamp = studyDateTimestamps[i];
    const previousTimestamp = studyDateTimestamps[i - 1];
    
    // Check if current date is exactly one day after previous date (24 hours in milliseconds)
    const expectedNextTimestamp = previousTimestamp + (24 * 60 * 60 * 1000);
    
    if (currentTimestamp === expectedNextTimestamp) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 1; // Reset streak
    }
  }
  
  return longestStreak;
}

/**

 * Legacy function name for backward compatibility
 * @deprecated Use calculateCurrentStudyStreak instead
 */
export function calculateStudyStreak(sessions: any[]): number {
  return calculateCurrentStudyStreak(sessions);
}

/**
 * Format total time spent in a readable format
 * @param minutes - Total minutes spent
 * @returns Formatted time string
 */
export function formatTotalTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format study items for display in assignment tables
 * @param studyItems - Array of study items
 * @param allQuestions - Array of all available questions (needed to determine verse ranges)
 * @returns Formatted string representation
 */
export function formatStudyItemsForAssignment(studyItems: StudyItem[], allQuestions: Question[] = []): string {
  if (!studyItems || studyItems.length === 0) return '';
  
  return studyItems.map(item => {
    if (item.verses && item.verses.length > 0) {
      // User explicitly selected specific verses - show them
      const verseRanges = formatNumberRanges(item.verses);
      if (item.chapters.length === 1) {
        return `${item.book} ${item.chapters[0]}:${verseRanges}`;
      } else {
        const chapterRanges = formatNumberRanges(item.chapters);
        return `${item.book} (Ch. ${chapterRanges}, Verses: ${verseRanges})`;
      }
    } else {
      // User selected whole chapters - show chapter ranges only
      const chapterRanges = formatNumberRanges(item.chapters);
      
      if (item.chapters.length === 1) {
        // Single chapter - show just the chapter
        return `${item.book} ${item.chapters[0]}`;
      } else {
        // Multiple chapters - show chapter ranges
        return `${item.book} (Ch. ${chapterRanges})`;
      }
    }
  }).join(', ');
}