// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { MultiLanguage } from '../translation/multi-language-class';

export interface ICalendarRule {
  id: string | undefined;
  name?: MultiLanguage | undefined;
  description?: MultiLanguage | undefined;
  rule: string | undefined;
  subRule: string | undefined;
  isMandatory: boolean;
  isPaid: boolean;
  state: string;
  country: string;
}
