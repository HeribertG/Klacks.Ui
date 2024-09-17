import { Injectable } from '@angular/core';
import { IAbsence } from 'src/app/core/absence-class';
import { DataAbsenceService } from '../data-absence.service';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataManagementAbsenceGanttService {
  public isResetEvent = new Subject<boolean>();
  public currentYearChangingEvent = new Subject<boolean>();

  absenceList: IAbsence[] = [];

  private _currentYear = new Date().getFullYear();

  private _rows = 100;
  private initCount = 0;

  constructor(private dataAbsence: DataAbsenceService) {}

  readData(): void {
    this.initCount = 0;

    this.dataAbsence.readAbsenceList().subscribe((x) => {
      if (x) {
        this.absenceList = x;
        this.isInitFinished();
      }
    });
  }

  get currentYear(): number {
    return this._currentYear;
  }
  set currentYear(value: number) {
    this._currentYear = value;

    this.currentYearChangingEvent.next(true);
  }

  private isInitFinished(): void {
    this.initCount += 1;
    if (this.initCount === 1) {
      this.isResetEvent.next(true);
    }
  }
}
