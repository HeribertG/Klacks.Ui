// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ICoveredSlot } from './covered-slot.interface';
import { IUncoveredSlot } from './uncovered-slot.interface';
import { IScheduleValidationNotification } from 'src/app/domain/interfaces/schedule-validation-notification.interface';

export interface ICoverAbsenceOutcome {
  scenarioId: string;
  token: string;
  scenarioName: string;
  covered: ICoveredSlot[];
  uncovered: IUncoveredSlot[];
  complianceWarnings: IScheduleValidationNotification[];
  highestTier: number;
  harmonyDelta?: number | null;
}
