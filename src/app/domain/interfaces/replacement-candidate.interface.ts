// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IScheduleValidationNotification } from './schedule-validation-notification.interface';

/**
 * A person who could stand in for an uncovered or proposed slot (GET Recovery/Candidates).
 * @param softConflicts - Rule notes that do not block the stand-in but should be read before calling
 * @param targetHoursDeficit - Hours the person is still below the target, a hint for fair distribution
 * @param phone - Mobile number before fixed line; null when none is stored
 */
export interface IReplacementCandidate {
  clientId: string;
  name: string;
  isPreferred: boolean;
  softConflicts: IScheduleValidationNotification[];
  targetHoursDeficit: number;
  isOnCall: boolean;
  phone?: string | null;
}
