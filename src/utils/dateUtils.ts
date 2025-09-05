/**
 * Date utilities for consistent date handling across the application
 * All dates are handled in London timezone for consistent user experience
 */

/**
 * Parse a YYYY-MM-DD string from the database as a London timezone Date object at midnight
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object representing midnight London time of the given date
 */
export function parseDbDateToUtc(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  // Create a basic date object from the components
  const tempDate = new Date(year, month - 1, day);
  
  // Use getUtcMidnight to properly convert to UTC midnight of that London date
  return getUtcMidnight(tempDate);
}

/**
 * Get a Date object representing midnight of the given date in London timezone
 * @param date - Any Date object
 * @returns New Date object representing midnight London time of the given date
 */
export function getUtcMidnight(date: Date): Date {
  // Get the date components in London timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '1970');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1; // Month is 0-indexed
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
  
  // Create UTC date representing midnight of that London date
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

/**
 * Format a Date object for display in London timezone
 * @param date - Date object to format
 * @param options - Additional formatting options
 * @returns Formatted date string in London timezone
 */
export function formatDateForDisplay(
  date: Date, 
  options: Intl.DateTimeFormatOptions = {}
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Europe/London',
    ...options
  };
  
  return date.toLocaleDateString('en-GB', defaultOptions);
}

/**
 * Convert a Date object to YYYY-MM-DD string for database storage
 * Uses London timezone for consistent date representation
 * @param date - Date object to convert
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateForDb(date: Date): string {
  // Convert to London timezone first, then format
  const londonDateString = date.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
  return londonDateString; // en-CA locale gives YYYY-MM-DD format
}

/**
 * Check if two dates represent the same day (ignoring time)
 * Comparison is done in London timezone
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if both dates represent the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  // Compare dates in London timezone
  const london1 = date1.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
  const london2 = date2.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
  return london1 === london2;
}