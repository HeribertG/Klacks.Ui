// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { IWorkNotification } from './work-notification.interface';

/**
 * One notification for a whole batch of newly created works, sent instead of one event per work when a
 * wizard result or another bulk insert is applied.
 * @param works - The created works, each in the same shape as a single work notification
 * @param startDate - Earliest period start across the batch
 * @param endDate - Latest period end across the batch
 * @param sourceConnectionId - Connection that caused the change
 * @param analyseToken - Scenario the batch belongs to; null or undefined is the main schedule
 */
export interface IWorksBulkCreatedNotification {
  works: IWorkNotification[];
  startDate: Date;
  endDate: Date;
  sourceConnectionId: string;
  analyseToken?: string | null;
}
