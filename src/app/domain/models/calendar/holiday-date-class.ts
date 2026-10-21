// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { MultiLanguage } from '../translation/multi-language-class';

export class HolidayDate {
  public currentDate = new Date(0);
  public currentName?: MultiLanguage | undefined = undefined;
  public officially = false;
  public formatDate = '';
  public description = '';
}
