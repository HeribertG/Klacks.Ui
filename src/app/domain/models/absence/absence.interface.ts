// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { MultiLanguage } from '../translation/multi-language-class';

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
  isOnCall: boolean;
}
