import { MultiLanguage } from './multi-language-class';

export interface IBreakContext {
  id: string | undefined;
  absenceId: string;
  startBreak: string;
  endBreak: string;
  detailName?: MultiLanguage | undefined;
}

export class BreakContext implements IBreakContext {
  id: string | undefined = undefined;
  absenceId = '';
  startBreak = '00:00';
  endBreak = '23:59';
  detailName?: MultiLanguage | undefined = undefined;
}
