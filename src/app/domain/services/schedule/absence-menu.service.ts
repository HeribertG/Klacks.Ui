import { inject, Injectable, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { IAbsence } from 'src/app/domain/models/absence-class';
import { IAbsenceDetail, AbsenceDetailMode } from 'src/app/domain/models/absence-detail-class';
import { DataAbsenceService } from 'src/app/infrastructure/api/data-absence.service';
import { DataAbsenceDetailService } from 'src/app/infrastructure/api/data-absence-detail.service';
import { MultiLanguage } from 'src/app/domain/models/multi-language-class';

export interface AbsenceMenuItem {
  id: string;
  absenceId: string;
  name: string;
  color: string;
  isDetail: boolean;
  startTime?: string;
  endTime?: string;
  duration?: number;
  mode?: AbsenceDetailMode;
  defaultValue: number;
}

@Injectable({
  providedIn: 'root',
})
export class AbsenceMenuService {
  private dataAbsenceService = inject(DataAbsenceService);
  private dataAbsenceDetailService = inject(DataAbsenceDetailService);

  private absences = signal<IAbsence[]>([]);
  private absenceDetails = signal<IAbsenceDetail[]>([]);
  private isLoaded = signal(false);

  async loadAbsencesIfNeeded(): Promise<void> {
    if (this.isLoaded()) return;

    try {
      const [absences, details] = await Promise.all([
        lastValueFrom(this.dataAbsenceService.readAbsenceList()),
        lastValueFrom(this.dataAbsenceDetailService.readAbsenceDetailList()),
      ]);

      this.absences.set(absences || []);
      this.absenceDetails.set(details || []);
      this.isLoaded.set(true);
    } catch (error) {
      console.error('Error loading absences for menu:', error);
    }
  }

  getAbsenceMenuItems(language: string): AbsenceMenuItem[] {
    const items: AbsenceMenuItem[] = [];
    const absences = this.absences();
    const details = this.absenceDetails();

    const absencesWithDetails = new Set(details.map(d => d.absenceId));

    for (const absence of absences) {
      if (!absence.id) continue;

      const absenceDetailsForThis = details.filter(d => d.absenceId === absence.id);

      if (absenceDetailsForThis.length > 0) {
        for (const detail of absenceDetailsForThis) {
          if (!detail.id) continue;

          items.push({
            id: detail.id,
            absenceId: absence.id,
            name: this.getLocalizedName(detail.detailName, language) || this.getLocalizedName(absence.name, language) || '',
            color: absence.color || '',
            isDetail: true,
            startTime: detail.startTime,
            endTime: detail.endTime,
            duration: detail.duration,
            mode: detail.mode,
            defaultValue: absence.defaultValue,
          });
        }
      } else {
        items.push({
          id: absence.id,
          absenceId: absence.id,
          name: this.getLocalizedName(absence.name, language) || '',
          color: absence.color || '',
          isDetail: false,
          defaultValue: absence.defaultValue,
        });
      }
    }

    return items;
  }

  private getLocalizedName(name: MultiLanguage | undefined, language: string): string {
    if (!name) return '';

    switch (language.toLowerCase()) {
      case 'de':
        return name.de || name.en || '';
      case 'fr':
        return name.fr || name.en || '';
      case 'it':
        return name.it || name.en || '';
      default:
        return name.en || '';
    }
  }

  reload(): void {
    this.isLoaded.set(false);
  }
}
