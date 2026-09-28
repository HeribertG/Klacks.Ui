// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { MultiLanguage } from '../translation/multi-language-class';

export interface IState {
  id: string | undefined;
  abbreviation: string;
  name?: MultiLanguage | undefined;
  countryPrefix: string;
  prefix: string;
  select: boolean;
  isDirty: number;
}
