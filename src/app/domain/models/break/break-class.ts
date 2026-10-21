// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Client } from '../client/client-class';
import { MultiLanguage } from '../translation/multi-language-class';
import { IPeriodHours } from '../schedule/period-hours.interface';
import { IScheduleCell } from '../schedule/schedule-cell.interface';
import { IBreak } from './break.interface';


export class Break implements IBreak {
  id: string | undefined = undefined;
  clientId = '';
  client: Client | undefined = undefined;
  absenceId = '';
  currentDate: Date = new Date();
  information: string | undefined = undefined;
  description?: MultiLanguage = undefined;
  lockLevel = 0;
  sealedAt?: string = undefined;
  sealedBy?: string = undefined;
  workTime = 0;
  surcharges = 0;
  startTime = '00:00:00';
  endTime = '23:59:00';
  periodHours: IPeriodHours | undefined = undefined;
  periodStart: string | undefined = undefined;
  periodEnd: string | undefined = undefined;
  paymentInterval?: number = undefined;
  scheduleEntries: IScheduleCell[] | undefined = undefined;
  analyseToken?: string;
}
