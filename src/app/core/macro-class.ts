import { CreateEntriesEnum } from '../helpers/enums/client-enum';
import { BaseEntity, IBaseEntity } from './general-class';
import { MultiLanguage } from './multi-language-class';

export interface IMacro extends IBaseEntity {
  id: string | undefined;
  name: string | undefined;
  content: string | undefined;
  description?: MultiLanguage | undefined;
  type: number;
  isDirty: number;
}

export class Macro extends BaseEntity implements IMacro {
  id = '';
  name = '';
  content = '';
  description?: MultiLanguage | undefined = undefined;
  type = 0;
  isDirty = CreateEntriesEnum.new;
}
