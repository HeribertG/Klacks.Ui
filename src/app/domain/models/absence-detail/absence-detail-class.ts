// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { MultiLanguage } from '../translation/multi-language-class';

export enum AbsenceDetailMode {
  TimeRange = 0,
  Duration = 1,
}

export interface IAbsenceDetail {
  id: string | undefined;
  absenceId: string;
  mode: AbsenceDetailMode;
  startTime: string;
  endTime: string;
  duration: number;
  detailName?: MultiLanguage | undefined;
  description?: MultiLanguage | undefined;
}

export class AbsenceDetail implements IAbsenceDetail {
  id: string | undefined = undefined;
  absenceId = '';
  mode: AbsenceDetailMode = AbsenceDetailMode.TimeRange;
  startTime = '00:00:00';
  endTime = '23:59:00';
  duration = 0;
  detailName?: MultiLanguage | undefined = undefined;
  description?: MultiLanguage | undefined = undefined;
}
