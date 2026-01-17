import { OwnTime } from 'src/app/domain/models/schedule-class';
import { IBreakContext } from 'src/app/domain/models/break-context-class';
import {
  transformStringToOwnTimeStruct,
  transformOwnTimeToString,
} from 'src/app/domain/helpers/own-time.helper';

export class BreakContextFormModel {
  internalStartBreak: OwnTime;
  internalEndBreak: OwnTime;

  private _breakContext: IBreakContext;

  constructor(breakContext: IBreakContext) {
    this._breakContext = breakContext;

    this.internalStartBreak = transformStringToOwnTimeStruct(breakContext.startBreak);
    this.internalEndBreak = transformStringToOwnTimeStruct(breakContext.endBreak);
  }

  applyToBreakContext(): IBreakContext {
    this._breakContext.startBreak = transformOwnTimeToString(this.internalStartBreak);
    this._breakContext.endBreak = transformOwnTimeToString(this.internalEndBreak);

    return this._breakContext;
  }

  get breakContext(): IBreakContext {
    return this._breakContext;
  }
}
