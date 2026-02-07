import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { IAbsenceDetail, AbsenceDetailMode } from 'src/app/domain/models/absence-detail/absence-detail-class';
import {
  transformStringToOwnTimeStruct,
  transformOwnTimeToString,
  transformNumberToOwnTime,
  transformOwnTimeToNumber,
} from 'src/app/domain/helpers/own-time.helper';

export class AbsenceDetailFormModel {
  internalStartTime: OwnTime;
  internalEndTime: OwnTime;
  internalDuration: OwnTime;
  internalMode: AbsenceDetailMode;

  private _absenceDetail: IAbsenceDetail;

  constructor(absenceDetail: IAbsenceDetail) {
    this._absenceDetail = absenceDetail;

    this.internalStartTime = transformStringToOwnTimeStruct(absenceDetail.startTime);
    this.internalEndTime = transformStringToOwnTimeStruct(absenceDetail.endTime);
    this.internalDuration = transformNumberToOwnTime(absenceDetail.duration, true);
    this.internalMode = absenceDetail.mode;
  }

  applyToAbsenceDetail(): IAbsenceDetail {
    this._absenceDetail.startTime = transformOwnTimeToString(this.internalStartTime);
    this._absenceDetail.endTime = transformOwnTimeToString(this.internalEndTime);
    this._absenceDetail.duration = transformOwnTimeToNumber(this.internalDuration);
    this._absenceDetail.mode = this.internalMode;

    return this._absenceDetail;
  }

  get absenceDetail(): IAbsenceDetail {
    return this._absenceDetail;
  }
}
