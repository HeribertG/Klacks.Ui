import { inject, Injectable, signal } from '@angular/core';
import { IAbsence } from 'src/app/core/absence-class';
import { DataAbsenceService } from '../data-absence.service';

@Injectable({
  providedIn: 'root',
})
export class DataManagementAbsenceGanttService {
  private dataAbsence = inject(DataAbsenceService);

  public isReset = signal(false);
  public currentYearChanging = signal(false);

  public absenceList: IAbsence[] = [];

  private _currentYear = new Date().getFullYear();

  readData(): void {
    this.dataAbsence.readAbsenceList().subscribe((absences) => {
      if (absences) {
        this.isReset.set(true);
        this.absenceList = absences;
        setTimeout(() => this.isReset.set(false), 100);
      }
    });
  }

  get currentYear(): number {
    return this._currentYear;
  }
  set currentYear(value: number) {
    this._currentYear = value;

    this.currentYearChanging.set(true);
  }
}
