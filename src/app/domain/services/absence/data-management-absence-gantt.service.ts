import { computed, inject, Injectable, signal } from '@angular/core';
import { IAbsence } from 'src/app/domain/models/absence/absence-class';
import { DataAbsenceService } from 'src/app/infrastructure/api/absence/data-absence.service';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class DataManagementAbsenceGanttService {
  private dataAbsence = inject(DataAbsenceService);
  private destroy$ = new Subject<void>();

  public isReset = signal(false);
  public currentYearChanging = signal(false);

  public absenceList = signal<IAbsence[]>([]);

  private _currentYear = signal(new Date().getFullYear());
  private static readonly RESET_DELAY = 100;

  readData(): void {
    this.dataAbsence.readVisibleAbsenceList().pipe(takeUntil(this.destroy$)).subscribe((absences) => {
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

  async readDataAsync(): Promise<void> {
    const absences = await firstValueFrom(this.dataAbsence.readVisibleAbsenceList());
    if (absences) {
      this.absenceList.set(absences);
    }
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
