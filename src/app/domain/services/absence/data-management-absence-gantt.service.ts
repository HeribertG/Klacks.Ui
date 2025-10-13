import { computed, inject, Injectable, signal } from '@angular/core';
import { IAbsence } from 'src/app/domain/models/absence-class';
import { DataAbsenceService } from 'src/app/infrastructure/api/data-absence.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class DataManagementAbsenceGanttService {
  private dataAbsence = inject(DataAbsenceService);
  private destroy$ = new Subject<void>();

  private _isReset = signal(false);
  get isReset(): boolean { return this._isReset(); }
  public currentYearChanging = signal(false);

  public absenceList = signal<IAbsence[]>([]);

  private _currentYear = signal(new Date().getFullYear());
  private static readonly RESET_DELAY = 100;

  readData(): void {
    this.dataAbsence.readAbsenceList().pipe(takeUntil(this.destroy$)).subscribe((absences) => {
      if (absences) {
        this._isReset.set(true);
        this.absenceList.set(absences);
        setTimeout(
          () => this._isReset.set(false),
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

  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
