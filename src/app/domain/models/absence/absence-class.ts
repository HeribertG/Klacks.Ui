// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { MultiLanguage } from '../translation/multi-language-class';
import { IAbsence } from './absence.interface';

export class Absence implements IAbsence {
  id = undefined;
  abbreviation?: MultiLanguage | undefined = undefined;
  name?: MultiLanguage | undefined = undefined;
  description?: MultiLanguage | undefined = undefined;
  color = '';
  defaultLength = 0;
  defaultValue = 1;
  hideInGantt = false;
  macroId: string | undefined = undefined;
  undeletable = false;
  withSaturday = false;
  withSunday = false;
  withHoliday = false;
  appliesToContainer = false;
  isUnpaid = false;
  isOnCall = false;
}

export class CalendarHeaderDayRank {
  backColor = '';
  name = '';
  rect: Rectangle = new Rectangle(0, 0, 20, 20);
}
