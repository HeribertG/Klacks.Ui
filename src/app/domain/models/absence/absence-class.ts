// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import {
  BaseFilter,
  BaseTruncated,
  IBaseFilter,
  IBaseTruncated,
} from '../general-class';
import { MultiLanguage } from '../translation/multi-language-class';
import { DomainMessages } from 'src/app/domain/constants/messages';

export interface IAbsenceFilter extends IBaseFilter {
  language: string | undefined;
}

export class AbsenceFilter extends BaseFilter implements IAbsenceFilter {
  language = DomainMessages.DEFAULT_LANG;
}

export interface ITruncatedAbsence extends IBaseTruncated {
  absences: Absence[];
}

export class TruncatedAbsence
  extends BaseTruncated
  implements ITruncatedAbsence
{
  absences: Absence[] = [];
}

export interface IAbsence {
  id: string | undefined;
  abbreviation?: MultiLanguage | undefined;
  name?: MultiLanguage | undefined;
  description?: MultiLanguage | undefined;
  color: string | undefined;
  defaultLength: number;
  defaultValue: number;
  hideInGantt: boolean;
  macroId: string | undefined;
  undeletable: boolean;
  withSaturday: boolean;
  withSunday: boolean;
  withHoliday: boolean;
  appliesToContainer: boolean;
  isUnpaid: boolean;
}

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
}

export class CalendarHeaderDayRank {
  backColor = '';
  name = '';
  rect: Rectangle = new Rectangle(0, 0, 20, 20);
}
