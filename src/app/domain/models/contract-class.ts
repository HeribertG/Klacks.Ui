import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { ICalendarSelection } from './calendar-selection-class';
import { OwnTime } from './schedule-class';

export interface IContract {
  id: string | undefined;
  name: string;
  guaranteedHoursPerMonth: number;
  maximumHoursPerMonth: number;
  minimumHoursPerMonth: number;
  internalGuaranteedHours: OwnTime;
  internalMinimumHours: OwnTime;
  internalMaximumHours: OwnTime;
  validFrom: Date;
  validUntil: Date | undefined;
  internalValidFrom: NgbDateStruct | undefined;
  internalValidUntil: NgbDateStruct | undefined;
  calendarSelection: ICalendarSelection | undefined;
  calendarSelectionId: string | undefined;
}

export class Contract implements IContract {
  id: string | undefined = '';
  name = '';
  guaranteedHoursPerMonth = 0;
  maximumHoursPerMonth = 0;
  minimumHoursPerMonth = 0;
  internalGuaranteedHours: OwnTime;
  internalMinimumHours: OwnTime;
  internalMaximumHours: OwnTime;

  validFrom = new Date();
  validUntil: Date | undefined = undefined;
  internalValidFrom: NgbDateStruct | undefined = undefined;
  internalValidUntil: NgbDateStruct | undefined = undefined;
  calendarSelection: ICalendarSelection | undefined = undefined;
  calendarSelectionId: string | undefined = undefined;

  constructor() {
    this.internalGuaranteedHours = OwnTime.forDuration('00', '00');
    this.internalMinimumHours = OwnTime.forDuration('00', '00');
    this.internalMaximumHours = OwnTime.forDuration('00', '00');
  }
}
