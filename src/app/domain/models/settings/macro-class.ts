// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { MacroCategoryEnum } from 'src/app/domain/enums/macro-category.enum';
import { BaseEntity } from '../general-class';
import { IMacro } from './macro.interface';
import { MultiLanguage } from '../translation/multi-language-class';

export class Macro extends BaseEntity implements IMacro {
  id = '';
  name = '';
  content = '';
  description?: MultiLanguage | undefined = undefined;
  type = 0;
  category = MacroCategoryEnum.Unspecified;
  isDirty = CreateEntriesEnum.new;
}
