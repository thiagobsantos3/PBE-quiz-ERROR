import { useState, useCallback } from 'react';
import { StudyItem, Question } from '../types';
import { getChaptersForBook, getVersesForChapter } from '../utils/quizUtils';

export function useStudyItemForm(questions: Question[]) {
  const [studyItems, setStudyItems] = useState<StudyItem[]>([]);
  const [currentBook, setCurrentBook] = useState('');
  const [currentChapters, setCurrentChapters] = useState<number[]>([]);
  const [currentVerses, setCurrentVerses] = useState<number[]>([]);
  const [startVerseInput, setStartVerseInput] = useState<string>('');
  const [endVerseInput, setEndVerseInput] = useState<string>('');
  const [description, setDescription] = useState('');

  // Get max chapters for a book based on actual questions in database
  const getMaxChapters = useCallback((book: string): number => {
    const bookQuestions = questions.filter(q => q.book_of_bible === book);
    if (bookQuestions.length === 0) return 1;
    
    const maxChapter = Math.max(...bookQuestions.map(q => q.chapter));
    return maxChapter;
  }, [questions]);

  // Get verses for a specific book and chapter based on actual questions in database
  const getVersesForBookChapter = useCallback((book: string, chapter: number): number[] => {
    return getVersesForChapter(book, chapter, questions);
  }, [questions]);

  const toggleChapter = useCallback((chapter: number) => {
    setCurrentChapters(prev => 
      prev.includes(chapter) 
        ? prev.filter(c => c !== chapter)
        : [...prev, chapter].sort((a, b) => a - b)
    );
    // Clear verses when chapters change
    setCurrentVerses([]);
  }, []);

  const selectAllChapters = useCallback(() => {
    if (!currentBook) return;
    const availableChapters = getChaptersForBook(currentBook, questions);
    setCurrentChapters(availableChapters);
    // Clear verses when selecting all chapters
    setCurrentVerses([]);
  }, [currentBook, questions]);

  const clearChapters = useCallback(() => {
    setCurrentChapters([]);
    setCurrentVerses([]);
  }, []);

  const toggleVerse = useCallback((verse: number) => {
    setCurrentVerses(prev => 
      prev.includes(verse) 
        ? prev.filter(v => v !== verse)
        : [...prev, verse].sort((a, b) => a - b)
    );
  }, []);

  const selectAllVerses = useCallback(() => {
    if (!currentBook || currentChapters.length !== 1) return;
    const availableVerses = getVersesForChapter(currentBook, currentChapters[0], questions);
    setCurrentVerses(availableVerses);
  }, [currentBook, currentChapters, questions]);

  const clearVerses = useCallback(() => {
    setCurrentVerses([]);
    setStartVerseInput('');
    setEndVerseInput('');
  }, []);

  const selectVerseRange = useCallback(() => {
    if (!currentBook || currentChapters.length !== 1) return;
    
    const startVerse = parseInt(startVerseInput);
    const endVerse = parseInt(endVerseInput);
    
    // Validation
    if (isNaN(startVerse) || isNaN(endVerse)) return;
    if (startVerse > endVerse) return;
    if (startVerse < 1) return;
    
    const availableVerses = getVersesForChapter(currentBook, currentChapters[0], questions);
    const maxVerse = Math.max(...availableVerses);
    
    if (endVerse > maxVerse) return;
    
    // Generate range of verses
    const rangeVerses: number[] = [];
    for (let verse = startVerse; verse <= endVerse; verse++) {
      if (availableVerses.includes(verse)) {
        rangeVerses.push(verse);
      }
    }
    
    setCurrentVerses(rangeVerses);
  }, [currentBook, currentChapters, startVerseInput, endVerseInput, questions]);

  const updateStartVerseInput = useCallback((value: string) => {
    setStartVerseInput(value);
  }, []);

  const updateEndVerseInput = useCallback((value: string) => {
    setEndVerseInput(value);
  }, []);
  const addStudyItem = useCallback(() => {
    if (!currentBook || currentChapters.length === 0) return;
    
    const newItem: StudyItem = {
      book: currentBook,
      chapters: [...currentChapters],
      verses: currentVerses.length > 0 ? [...currentVerses] : undefined
    };
    
    setStudyItems(prev => [...prev, newItem]);
    setCurrentBook('');
    setCurrentChapters([]);
    setCurrentVerses([]);
    setStartVerseInput('');
    setEndVerseInput('');
  }, [currentBook, currentChapters, currentVerses]);

  const removeStudyItem = useCallback((index: number) => {
    setStudyItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const resetForm = useCallback(() => {
    setStudyItems([]);
    setCurrentBook('');
    setCurrentChapters([]);
    setCurrentVerses([]);
    setStartVerseInput('');
    setEndVerseInput('');
    setDescription('');
  }, []);

  const initializeForm = useCallback((items: StudyItem[], desc: string = '') => {
    setStudyItems(items);
    setDescription(desc);
    setCurrentBook('');
    setCurrentChapters([]);
    setCurrentVerses([]);
    setStartVerseInput('');
    setEndVerseInput('');
  }, []);

  return {
    studyItems,
    currentBook,
    currentChapters,
    currentVerses,
    startVerseInput,
    endVerseInput,
    description,
    setCurrentBook,
    setDescription,
    toggleChapter,
    selectAllChapters,
    clearChapters,
    toggleVerse,
    selectAllVerses,
    clearVerses,
    selectVerseRange,
    updateStartVerseInput,
    updateEndVerseInput,
    addStudyItem,
    removeStudyItem,
    resetForm,
    initializeForm,
    getMaxChapters,
    getVersesForBookChapter
  };
}