import { useState, useMemo } from 'react';
import { StudyAssignment } from '../types';
import { getUtcMidnight, isSameDay } from '../utils/dateUtils';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  assignment?: StudyAssignment;
}

export function useCalendar(assignments: StudyAssignment[]) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const calendarDays = useMemo((): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = getUtcMidnight(new Date());
    
    const firstDay = getUtcMidnight(new Date(year, month, 1));
    const lastDay = getUtcMidnight(new Date(year, month + 1, 0));
    const startDate = getUtcMidnight(new Date(firstDay));
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: CalendarDay[] = [];
    const currentDay = getUtcMidnight(new Date(startDate));
    
    for (let i = 0; i < 42; i++) {
      const assignment = assignments.find(a => isSameDay(a.date, currentDay));
      
      // Debug logging for calendar day processing
      // Note: This hook doesn't have access to useAuth since it's a utility hook
      // Debug logging removed to avoid uncontrolled console output
      
      days.push({
        date: new Date(currentDay),
        isCurrentMonth: currentDay.getMonth() === month,
        isToday: isSameDay(currentDay, today),
        assignment,
      });
      
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return days;
  }, [currentDate, assignments]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return {
    currentDate,
    setCurrentDate,
    calendarDays,
    navigateMonth,
    monthNames,
    dayNames
  };
}