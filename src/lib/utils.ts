/**
 * Utility functions for common operations
 * String formatting, styling, and data transformation helpers
 */

import clsx, { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines classNames using clsx and tailwind-merge
 * Safely merges Tailwind CSS classes, handling conflicts properly
 *
 * @param inputs - Class names or class objects to combine
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number as currency
 * Uses US dollar format by default, extensible for other locales
 *
 * @param value - Numeric value to format
 * @param currency - Currency code (default: 'USD')
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number | null | undefined,
  currency: string = 'USD',
  decimals: number = 0,
): string {
  if (value === null || value === undefined) {
    return '-';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formats a number in millions or billions with appropriate suffix
 * Useful for displaying large funding amounts and valuations
 *
 * @param value - Numeric value to format
 * @returns Formatted string with M/B suffix
 */
export function formatCompactNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '-';
  }

  if (Math.abs(value) >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  }

  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }

  if (Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }

  return `$${value.toFixed(0)}`;
}

/**
 * Formats a date string or Date object
 *
 * @param date - Date to format
 * @param format - Format style ('short', 'medium', 'long')
 * @returns Formatted date string
 */
export function formatDate(
  date: string | Date | null | undefined,
  format: 'short' | 'medium' | 'long' = 'medium',
): string {
  if (!date) {
    return '-';
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return '-';
  }

  const options: Record<string, Intl.DateTimeFormatOptions> = {
    short: { year: '2-digit', month: '2-digit', day: '2-digit' },
    medium: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
  };

  return dateObj.toLocaleDateString('en-US', options[format]);
}

/**
 * Formats a time duration (e.g., "2 hours ago")
 * Useful for displaying "last scored at" timestamps
 *
 * @param date - Date to format as relative time
 * @returns Relative time string
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) {
    return '-';
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return '-';
  }

  try {
    const rtf = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });
    const now = new Date();
    const diffMs = dateObj.getTime() - now.getTime();
    const diffSeconds = Math.round(diffMs / 1000);

    if (Math.abs(diffSeconds) < 60) {
      return rtf.format(diffSeconds, 'second');
    }

    const diffMinutes = Math.round(diffSeconds / 60);
    if (Math.abs(diffMinutes) < 60) {
      return rtf.format(diffMinutes, 'minute');
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 24) {
      return rtf.format(diffHours, 'hour');
    }

    const diffDays = Math.round(diffHours / 24);
    if (Math.abs(diffDays) < 7) {
      return rtf.format(diffDays, 'day');
    }

    const diffWeeks = Math.round(diffDays / 7);
    if (Math.abs(diffWeeks) < 4) {
      return rtf.format(diffWeeks, 'week');
    }

    const diffMonths = Math.round(diffDays / 30);
    if (Math.abs(diffMonths) < 12) {
      return rtf.format(diffMonths, 'month');
    }

    const diffYears = Math.round(diffMonths / 12);
    return rtf.format(diffYears, 'year');
  } catch (error) {
    return formatDate(date, 'short');
  }
}

/**
 * Formats a percentage value
 *
 * @param value - Numeric percentage (0-100)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercentage(
  value: number | null | undefined,
  decimals: number = 1,
): string {
  if (value === null || value === undefined) {
    return '-';
  }

  return `${value.toFixed(decimals)}%`;
}

/**
 * Gets a Tailwind color class based on score range
 * Used for visual indicators in scoring displays
 *
 * @param score - Score value (0-100)
 * @returns Tailwind color class name
 */
export function getScoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined) {
    return 'text-gray-500';
  }

  if (score >= 80) {
    return 'text-green-600';
  }

  if (score >= 60) {
    return 'text-blue-600';
  }

  if (score >= 40) {
    return 'text-yellow-600';
  }

  if (score >= 20) {
    return 'text-orange-600';
  }

  return 'text-red-600';
}

/**
 * Gets background color class for score
 * Lighter variant for use as background
 */
export function getScoreBackgroundColor(score: number | null | undefined): string {
  if (score === null || score === undefined) {
    return 'bg-gray-100';
  }

  if (score >= 80) {
    return 'bg-green-100';
  }

  if (score >= 60) {
    return 'bg-blue-100';
  }

  if (score >= 40) {
    return 'bg-yellow-100';
  }

  if (score >= 20) {
    return 'bg-orange-100';
  }

  return 'bg-red-100';
}

/**
 * Gets a score rating label
 */
export function getScoreRating(score: number | null | undefined): string {
  if (score === null || score === undefined) {
    return 'Not Scored';
  }

  if (score >= 80) {
    return 'Excellent';
  }

  if (score >= 60) {
    return 'Good';
  }

  if (score >= 40) {
    return 'Average';
  }

  if (score >= 20) {
    return 'Below Average';
  }

  return 'Poor';
}

/**
 * Truncates text to a maximum length with ellipsis
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text
 */
export function truncateText(text: string | null | undefined, maxLength: number = 100): string {
  if (!text) {
    return '-';
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.substring(0, maxLength)}...`;
}

/**
 * Capitalizes the first letter of a string
 */
export function capitalize(text: string | null | undefined): string {
  if (!text) {
    return '';
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Converts snake_case to Title Case
 * Useful for displaying enum values
 */
export function snakeCaseToTitleCase(text: string): string {
  return text
    .split('_')
    .map((word) => capitalize(word))
    .join(' ');
}

/**
 * Generates a readable summary of an object
 * Useful for logging and debugging
 */
export function summarizeObject(obj: unknown, maxDepth: number = 2, depth: number = 0): string {
  if (depth > maxDepth) {
    return '...';
  }

  if (obj === null) {
    return 'null';
  }

  if (typeof obj !== 'object') {
    return String(obj);
  }

  if (Array.isArray(obj)) {
    return `[${obj.length} items]`;
  }

  const entries = Object.entries(obj).slice(0, 3);
  const summary = entries.map(([key, value]) => `${key}: ${summarizeObject(value, maxDepth, depth + 1)}`);

  return `{${summary.join(', ')}${Object.keys(obj).length > 3 ? ', ...' : ''}}`;
}

/**
 * Safe JSON stringify that handles circular references
 */
export function safeStringify(obj: unknown): string {
  const seen = new WeakSet();

  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  });
}

/**
 * Validates an email address with basic regex
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates a URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Determines fundraising urgency based on raising_target_close date.
 * Returns null if not raising or no target close date.
 */
export interface RaisingUrgency {
  label: string
  color: string       // Tailwind badge classes
  daysUntil: number
}

export function getRaisingUrgency(
  targetClose: string | null | undefined,
  isRaising: boolean | null | undefined,
): RaisingUrgency | null {
  if (!isRaising || !targetClose) return null

  const now = new Date()
  const close = new Date(targetClose)
  if (isNaN(close.getTime())) return null

  const daysUntil = Math.ceil((close.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntil < 0) return { label: 'Round Closed', color: 'bg-gray-100 text-gray-600', daysUntil }
  if (daysUntil <= 30) return { label: 'Closing Soon', color: 'bg-red-100 text-red-700', daysUntil }
  if (daysUntil <= 60) return { label: 'Active', color: 'bg-amber-100 text-amber-700', daysUntil }
  return { label: 'Open', color: 'bg-green-100 text-green-700', daysUntil }
}
