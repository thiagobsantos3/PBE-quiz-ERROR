import React from 'react';
import { Save, Trash2, Plus, BookOpen, Users, Check } from 'lucide-react';
import { Modal } from '../common/Modal';
import { StudyAssignment, StudyItem, Question, TeamMemberForSchedule } from '../../types';
import { getAvailableBooksFromQuestions, getChaptersForBook } from '../../utils/quizUtils';
import { formatDateForDisplay } from '../../utils/dateUtils';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  teamMembers: TeamMemberForSchedule[];
  isNewAssignment: boolean;
  initialSelectedMembers: string[];
  editingAssignment: StudyAssignment | null;
  studyItems: StudyItem[];
  currentBook: string;
  currentChapters: number[];
  currentVerses: number[];
  description: string;
  onBookChange: (book: string) => void;
  onDescriptionChange: (description: string) => void;
  onToggleChapter: (chapter: number) => void;
  onSelectAllChapters: () => void;
  onClearChapters: () => void;
  onToggleVerse: (verse: number) => void;
  onSelectAllVerses: () => void;
  onClearVerses: () => void;
  selectVerseRange: () => void;
  startVerseInput: string;
  endVerseInput: string;
  updateStartVerseInput: (value: string) => void;
  updateEndVerseInput: (value: string) => void;
  onAddStudyItem: () => void;
  onRemoveStudyItem: (index: number) => void;
  onSave: (selectedMembers: string[], studyItems: StudyItem[], description: string) => void;
  onDelete: () => void;
  getMaxChapters: (book: string) => number;
  getVersesForBookChapter: (book: string, chapter: number) => number[];
  questions: Question[];
  currentUserId?: string;
}

export function AssignmentModal({
  isOpen,
  onClose,
  selectedDate,
  teamMembers,
  isNewAssignment,
  initialSelectedMembers,
  editingAssignment,
  studyItems,
  currentBook,
  currentChapters,
  currentVerses,
  description,
  onBookChange,
  onDescriptionChange,
  onToggleChapter,
  onSelectAllChapters,
  onClearChapters,
  onToggleVerse,
  onSelectAllVerses,
  onClearVerses,
  selectVerseRange,
  startVerseInput,
  endVerseInput,
  updateStartVerseInput,
  updateEndVerseInput,
  onAddStudyItem,
  onRemoveStudyItem,
  onSave,
  onDelete,
  getMaxChapters,
  getVersesForBookChapter,
  questions,
  currentUserId
}: AssignmentModalProps) {
  const [selectedAssignmentMembers, setSelectedAssignmentMembers] = React.useState<string[]>(initialSelectedMembers);

  // Update selected members when initialSelectedMembers changes
  React.useEffect(() => {
    setSelectedAssignmentMembers(initialSelectedMembers);
  }, [initialSelectedMembers]);

  if (!selectedDate) return null;

  const handleMemberToggle = (memberId: string) => {
    setSelectedAssignmentMembers(prev => 
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSelectAllMembers = () => {
    setSelectedAssignmentMembers(teamMembers.map(m => m.userId));
  };

  const handleClearMembers = () => {
    setSelectedAssignmentMembers([]);
  };

  const getSelectedMemberNames = () => {
    if (selectedAssignmentMembers.length === 0) return 'No members selected';
    if (selectedAssignmentMembers.length === 1) {
      const member = teamMembers.find(m => m.userId === selectedAssignmentMembers[0]);
      return member?.user.name || 'Unknown member';
    }
    return `${selectedAssignmentMembers.length} members selected`;
  };

  // Get available books from questions using utility function
  const availableBooks = React.useMemo(() => 
    getAvailableBooksFromQuestions(questions), 
    [questions]
  );

  // Check if verse selection should be enabled (only when exactly one chapter is selected)
  const canSelectVerses = currentBook && currentChapters.length === 1;
  const availableVerses = canSelectVerses 
    ? getVersesForBookChapter(currentBook, currentChapters[0])
    : [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingAssignment ? 'Edit Assignment' : 'Add Study Assignment'}
      maxWidth="4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {editingAssignment && (
              <button
                onClick={onDelete}
                className="flex items-center space-x-2 px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors duration-200"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(selectedAssignmentMembers, studyItems, description)}
              disabled={studyItems.length === 0 || selectedAssignmentMembers.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <Save className="h-4 w-4" />
              <span>{editingAssignment ? 'Update' : 'Save'} Assignment</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 mb-6">
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="text-sm font-medium text-blue-900">
            Assignment for: {getSelectedMemberNames()}
          </div>
          <div className="text-sm text-blue-700">
            {formatDateForDisplay(selectedDate, { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric'
            })}
          </div>
        </div>

        {/* Team Member Selection - Only show for new assignments */}
        {isNewAssignment && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-semibold text-gray-900 flex items-center space-x-2">
                <Users className="h-5 w-5 text-gray-600" />
                <span>Select Team Members</span>
              </h3>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleSelectAllMembers}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleClearMembers}
                  className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                >
                  Clear
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
              {teamMembers.map((member) => (
                <button
                  key={member.userId}
                  type="button"
                  onClick={() => handleMemberToggle(member.userId)}
                  className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                    selectedAssignmentMembers.includes(member.userId)
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-indigo-600">
                      {member.user.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{member.user.name}</div>
                    <div className="text-sm text-gray-500 capitalize">
                      {member.role}
                      {currentUserId && member.userId === currentUserId && (
                        <span className="text-indigo-600 font-medium"> (You)</span>
                      )}
                    </div>
                  </div>
                  {selectedAssignmentMembers.includes(member.userId) && (
                    <Check className="h-5 w-5 text-indigo-600 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
            
            {selectedAssignmentMembers.length > 0 && (
              <div className="mt-3 text-sm text-gray-600">
                {selectedAssignmentMembers.length} member{selectedAssignmentMembers.length !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add Study Item Section */}
        <div className="space-y-4">
          <h3 className="text-md font-semibold text-gray-900">Add Study Item</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bible Book
            </label>
            <select
              value={currentBook}
              onChange={(e) => onBookChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
            >
              <option value="">Select a book</option>
              {availableBooks.map((book) => (
                <option key={book} value={book}>{book}</option>
              ))}
            </select>
            {availableBooks.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">
                No books available. Questions need to be added to the system.
              </p>
            )}
          </div>
          
          {currentBook && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Chapters
                </label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={onSelectAllChapters}
                    className="text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={onClearChapters}
                    className="text-xs text-gray-600 hover:text-gray-700"
                  >
                    Clear
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {getChaptersForBook(currentBook, questions).map((chapter) => (
                  <button
                    key={chapter}
                    type="button"
                    onClick={() => onToggleChapter(chapter)}
                    className={`p-2 text-sm rounded transition-colors duration-200 ${
                      currentChapters.includes(chapter)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {chapter}
                  </button>
                ))}
              </div>
              
              {getChaptersForBook(currentBook, questions).length === 0 && (
                <p className="text-sm text-gray-500">
                  No chapters available for {currentBook}. Questions need to be added for this book.
                </p>
              )}
              
              {currentChapters.length > 0 && (
                <div className="text-sm text-gray-600">
                  Selected: {currentChapters.join(', ')} ({currentChapters.length} chapter{currentChapters.length !== 1 ? 's' : ''})
                </div>
              )}
            </div>
          )}
          
          {/* Verse Selection - Only show when exactly one chapter is selected */}
          {canSelectVerses && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Verses (Optional)
                </label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={onSelectAllVerses}
                    className="text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={onClearVerses}
                    className="text-xs text-gray-600 hover:text-gray-700"
                  >
                    Clear
                  </button>
                </div>
              </div>
              
              {availableVerses.length > 0 ? (
                <>
                  {/* Verse Range Selection */}
                  <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="text-sm font-medium text-purple-900 mb-2">Quick Range Selection</div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        max={Math.max(...availableVerses)}
                        value={startVerseInput}
                        onChange={(e) => updateStartVerseInput(e.target.value)}
                        placeholder="Start"
                        className="w-20 px-2 py-1 text-sm border border-purple-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      />
                      <span className="text-purple-700 font-medium">to</span>
                      <input
                        type="number"
                        min="1"
                        max={Math.max(...availableVerses)}
                        value={endVerseInput}
                        onChange={(e) => updateEndVerseInput(e.target.value)}
                        placeholder="End"
                        className="w-20 px-2 py-1 text-sm border border-purple-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      />
                      <button
                        type="button"
                        onClick={selectVerseRange}
                        disabled={!startVerseInput || !endVerseInput}
                        className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                      >
                        Select Range
                      </button>
                    </div>
                    <div className="text-xs text-purple-600 mt-1">
                      Example: Enter 1 to 15 to select verses 1-15
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-8 gap-1 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {availableVerses.map((verse) => (
                      <button
                        key={verse}
                        type="button"
                        onClick={() => onToggleVerse(verse)}
                        className={`p-1 text-xs rounded transition-colors duration-200 ${
                          currentVerses.includes(verse)
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {verse}
                      </button>
                    ))}
                  </div>
                  
                  {currentVerses.length > 0 && (
                    <div className="text-sm text-gray-600 mt-2">
                      Selected verses: {currentVerses.join(', ')} ({currentVerses.length} verse{currentVerses.length !== 1 ? 's' : ''})
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 mt-1">
                    Leave empty to include all verses in {currentBook} Chapter {currentChapters[0]}
                  </div>
                  
                  <div className="text-xs text-purple-600 mt-2 p-2 bg-purple-50 rounded">
                    💡 <strong>Tip:</strong> Use the range selector above for consecutive verses (e.g., 1-15), or click individual verses below for specific selections
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
                  No verses available for {currentBook} Chapter {currentChapters[0]}. Questions need to be added for this chapter.
                </div>
              )}
            </div>
          )}
          
          {/* Helper text for verse selection */}
          {currentBook && currentChapters.length > 1 && (
            <div className="text-xs text-gray-500 p-2 bg-blue-50 rounded-lg">
              💡 Select exactly one chapter to enable verse-specific selection
            </div>
          )}
          
          <button
            type="button"
            onClick={onAddStudyItem}
            disabled={!currentBook || currentChapters.length === 0 || availableBooks.length === 0}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <Plus className="h-4 w-4" />
            <span>Add to Assignment</span>
          </button>
        </div>
        
        {/* Current Assignment Items */}
        <div className="space-y-4">
          <h3 className="text-md font-semibold text-gray-900">Assignment Items</h3>
          
          {studyItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No study items added yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {studyItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{item.book}</div>
                    <div className="text-sm text-gray-600">
                      Chapters: {item.chapters.join(', ')} ({item.chapters.length} chapter{item.chapters.length !== 1 ? 's' : ''})
                      {item.verses && item.verses.length > 0 && (
                        <div className="text-xs text-purple-600 mt-1">
                          Verses: {item.verses.join(', ')} ({item.verses.length} verse{item.verses.length !== 1 ? 's' : ''})
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveStudyItem(index)}
                    className="text-red-600 hover:text-red-700 transition-colors duration-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Study Notes (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
              placeholder="Add study focus, themes, or special instructions..."
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}