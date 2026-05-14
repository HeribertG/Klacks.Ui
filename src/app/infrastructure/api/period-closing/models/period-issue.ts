// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Aggregated problem/note for a single day in a billing period.
 * @param severity - 'error' | 'warning' | 'info' matches ScheduleValidationType
 * @param code - Stable identifier such as 'ScheduleNote'
 * @param messageKey - i18n key to translate the user-facing message
 * @param messageParams - Placeholder values for the translated message
 */
export interface PeriodIssue {
  date: string;
  clientId: string;
  clientName: string;
  severity: 'error' | 'warning' | 'info';
  code: string;
  messageKey: string;
  messageParams: Record<string, string>;
}
