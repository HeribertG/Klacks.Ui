// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { MultiLanguage } from '../translation/multi-language-class';

export interface ICountry {
  id: string | undefined;
  abbreviation: string;
  name?: MultiLanguage | undefined;
  prefix: string;
  select: boolean;
  isDirty: number;
}
