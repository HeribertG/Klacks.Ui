// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IBaseEntity } from '../base-entity.interface';
import { MultiLanguage } from '../translation/multi-language-class';
import { MacroCategoryEnum } from 'src/app/domain/enums/macro-category.enum';

export interface IMacro extends IBaseEntity {
  id: string | undefined;
  name: string | undefined;
  content: string | undefined;
  description?: MultiLanguage | undefined;
  type: number;
  category: MacroCategoryEnum;
  isDirty: number;
}
