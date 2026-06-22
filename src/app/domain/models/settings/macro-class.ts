// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { MacroCategoryEnum } from 'src/app/domain/enums/macro-category.enum';
import { BaseEntity, IBaseEntity } from '../general-class';
import { MultiLanguage } from '../translation/multi-language-class';

export interface IMacro extends IBaseEntity {
  id: string | undefined;
  name: string | undefined;
  content: string | undefined;
  description?: MultiLanguage | undefined;
  type: number;
  category: MacroCategoryEnum;
  isDirty: number;
}

export class Macro extends BaseEntity implements IMacro {
  id = '';
  name = '';
  content = '';
  description?: MultiLanguage | undefined = undefined;
  type = 0;
  category = MacroCategoryEnum.Unspecified;
  isDirty = CreateEntriesEnum.new;
}
