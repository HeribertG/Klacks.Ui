// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Client } from '../client/client-class';
import { MultiLanguage } from '../translation/multi-language-class';
import { IPeriodHours } from '../schedule/period-hours.interface';
import { IScheduleCell } from '../schedule/schedule-cell.interface';

export interface IBreak {
  id: string | undefined;
  clientId: string;
  client: Client | undefined;
  absenceId: string;
  currentDate: Date;
  information: string | undefined;
  description?: MultiLanguage;
  lockLevel: number;
  sealedAt?: string;
  sealedBy?: string;
  workTime: number;
  surcharges: number;
  startTime: string;
  endTime: string;
  periodHours: IPeriodHours | undefined;
  periodStart: string | undefined;
  periodEnd: string | undefined;
  paymentInterval?: number;
  scheduleEntries: IScheduleCell[] | undefined;
  analyseToken?: string;
}
