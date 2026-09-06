// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Constants for the undo offer shown after a single work entry was deleted in the schedule grid.
 * @param TOAST_DELAY_MS - How long the undo offer stays visible, well inside the 60s backend window
 * @param TITLE_KEY / LABEL_KEY / FAILED_KEY - Translation keys for headline, action label and failure
 * @param CONFLICT_KEY / CONFLICT_STATUS - Message and HTTP status for a slot that was taken meanwhile
 */
export const SCHEDULE_UNDO = {
  TOAST_DELAY_MS: 15000,
  TITLE_KEY: 'schedule.undo.workDeleted',
  LABEL_KEY: 'schedule.undo.restore',
  FAILED_KEY: 'schedule.undo.failed',
  CONFLICT_KEY: 'schedule.undo.conflict',
  CONFLICT_STATUS: 409,
} as const;
