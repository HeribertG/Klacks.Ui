// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Single validation entry from the backend (collision, rest time, working time).
 * @param type - 'error', 'warning', or 'info'
 * @param comment - Translation key
 * @param commentParams - Parameters for the translation
 */
export interface IScheduleValidationNotification {
  type: 'error' | 'warning' | 'info';
  clientId: string;
  clientName: string;
  date: string;
  comment: string;
  commentParams: Record<string, string>;
}
