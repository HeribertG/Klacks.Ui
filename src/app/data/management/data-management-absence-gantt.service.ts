import { computed, inject, Injectable, signal } from '@angular/core';
import { IAbsence } from 'src/app/core/absence-class';
import { DataAbsenceService } from '../data-absence.service';

@Injectable({
  providedIn: 'root',
})
export class DataManagementAbsenceGanttService {
  private dataAbsence = inject(DataAbsenceService);

  public isReset = signal(false);
  public currentYearChanging = signal(false);

  public absenceList = signal<IAbsence[]>([]);

  private _currentYear = signal(new Date().getFullYear());
  private static readonly RESET_DELAY = 100;

  readData(): void {
    this.dataAbsence.readAbsenceList().subscribe((absences) => {
      if (absences) {
        this.isReset.set(true);
        this.absenceList.set(absences);
        setTimeout(
          () => this.isReset.set(false),
          DataManagementAbsenceGanttService.RESET_DELAY
        );
      }
    });
  }

  get currentYear(): number {
    return this._currentYear();
  }

  setCurrentYear(value: number): void {
    if (this._currentYear() !== value) {
      this.currentYearChanging.set(true);
      this._currentYear.set(value);

      setTimeout(() => {
        this.currentYearChanging.set(false);
      }, DataManagementAbsenceGanttService.RESET_DELAY);
    }
  }

  public hasAbsences = computed(() => this.absenceList().length > 0);

  getAbsenceById(id: string): IAbsence | undefined {
    return this.absenceList().find((absence) => absence.id === id);
  }
}
