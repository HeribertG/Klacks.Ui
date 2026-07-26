// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { computed, inject, Injectable, signal } from '@angular/core';
import { IAbsence } from 'src/app/domain/models/absence/absence-class';
import { DataAbsenceService } from 'src/app/infrastructure/api/absence/data-absence.service';
import { firstValueFrom } from 'rxjs';
import { resetSignalAfterDelay } from 'src/app/shared/helpers/signal-pulse.helper';

@Injectable({
  providedIn: 'root',
})
export class DataManagementAbsenceGanttService {
  private dataAbsence = inject(DataAbsenceService);

  public isReset = signal(false);
  public currentYearChanging = signal(false);

  public absenceList = signal<IAbsence[]>([]);

  private _currentYear = signal(new Date().getFullYear());

  readData(): void {
    this.dataAbsence.readVisibleAbsenceList().subscribe((absences) => {
      if (absences) {
        this.isReset.set(true);
        this.absenceList.set(absences);
        resetSignalAfterDelay(this.isReset);
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
      resetSignalAfterDelay(this.currentYearChanging);
    }
  }

  public hasAbsences = computed(() => this.absenceList().length > 0);

  getAbsenceById(id: string): IAbsence | undefined {
    return this.absenceList().find((absence) => absence.id === id);
  }
}
