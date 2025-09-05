/**
 * Common formatting utilities used across the application
 */

/**
 * Format currency values with proper locale and currency symbol
 */
export function formatCurrency(amount: number, currency: string | null | undefined): string {
  // Provide fallback currency if null/undefined
  const safeCurrency = currency || 'GBP';
  
  // Additional validation to ensure amount is a valid number
  const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: safeCurrency,
  }).format(safeAmount);
}

/**
 * Format timestamp to readable date string
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString();
}

/**
 * Format seconds to MM:SS or HH:MM:SS format
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format date string to relative time (e.g., "2 hours ago", "3 days ago")
 */
export function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}