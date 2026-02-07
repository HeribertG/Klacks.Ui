import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { IShift } from 'src/app/domain/models/shift/shift-class';
import {
  transformDateToNgbDateStruct,
  transformNgbDateStructToDate,
} from 'src/app/shared/helpers/ngb-date.helper';
import {
  transformStringToOwnTimeStruct,
  transformOwnTimeToString,
  transformNumberToOwnTime,
  transformOwnTimeToNumber,
} from 'src/app/domain/helpers/own-time.helper';

export class ShiftFormModel {
  internalFromDate: NgbDateStruct | undefined;
  internalUntilDate: NgbDateStruct | undefined;
  internalStartShift: OwnTime;
  internalEndShift: OwnTime;
  internalBeforeShift: OwnTime;
  internalAfterShift: OwnTime;
  internalTravelTimeBefore: OwnTime;
  internalTravelTimeAfter: OwnTime;
  internalWorkTime: OwnTime;
  internalBriefingTime: OwnTime;
  internalDebriefingTime: OwnTime;

  private _shift: IShift;

  constructor(shift: IShift) {
    this._shift = shift;

    this.internalFromDate = shift.fromDate
      ? transformDateToNgbDateStruct(shift.fromDate)
      : undefined;
    this.internalUntilDate = shift.untilDate
      ? transformDateToNgbDateStruct(shift.untilDate)
      : undefined;

    this.internalStartShift = transformStringToOwnTimeStruct(shift.startShift);
    this.internalEndShift = transformStringToOwnTimeStruct(shift.endShift);
    this.internalBeforeShift = transformStringToOwnTimeStruct(shift.beforeShift);
    this.internalAfterShift = transformStringToOwnTimeStruct(shift.afterShift);
    this.internalTravelTimeBefore = transformStringToOwnTimeStruct(shift.travelTimeBefore);
    this.internalTravelTimeAfter = transformStringToOwnTimeStruct(shift.travelTimeAfter);
    this.internalBriefingTime = transformStringToOwnTimeStruct(shift.briefingTime);
    this.internalDebriefingTime = transformStringToOwnTimeStruct(shift.debriefingTime);
    this.internalWorkTime = transformNumberToOwnTime(shift.workTime, true);
  }

  applyToShift(): IShift {
    if (this.internalFromDate) {
      this._shift.fromDate = transformNgbDateStructToDate(this.internalFromDate);
    }
    if (this.internalUntilDate) {
      this._shift.untilDate = transformNgbDateStructToDate(this.internalUntilDate);
    }

    this._shift.startShift = transformOwnTimeToString(this.internalStartShift);
    this._shift.endShift = transformOwnTimeToString(this.internalEndShift);
    this._shift.beforeShift = transformOwnTimeToString(this.internalBeforeShift);
    this._shift.afterShift = transformOwnTimeToString(this.internalAfterShift);
    this._shift.travelTimeBefore = transformOwnTimeToString(this.internalTravelTimeBefore);
    this._shift.travelTimeAfter = transformOwnTimeToString(this.internalTravelTimeAfter);
    this._shift.briefingTime = transformOwnTimeToString(this.internalBriefingTime);
    this._shift.debriefingTime = transformOwnTimeToString(this.internalDebriefingTime);
    this._shift.workTime = transformOwnTimeToNumber(this.internalWorkTime);

    return this._shift;
  }

  get shift(): IShift {
    return this._shift;
  }
}
