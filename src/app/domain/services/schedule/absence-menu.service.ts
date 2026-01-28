import { inject, Injectable } from '@angular/core';
import { AbsenceDetailMode } from 'src/app/domain/models/absence-detail-class';
import { IMultiLanguage } from 'src/app/domain/models/multi-language-class';
import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';
import { AbsenceLookupService } from './absence-lookup.service';

export interface AbsenceMenuItem {
  id: string;
  absenceId: string;
  absenceName: string;
  name: string;
  color: string;
  isDetail: boolean;
  startTime?: string;
  endTime?: string;
  duration?: number;
  mode?: AbsenceDetailMode;
  defaultValue: number;
  description?: IMultiLanguage;
}

@Injectable()
export class AbsenceMenuService {
  private absenceLookup = inject(AbsenceLookupService);

  async loadIfNeeded(): Promise<void> {
    await this.absenceLookup.loadIfNeeded();
  }

  getAbsenceMenuItems(language: string): AbsenceMenuItem[] {
    const items: AbsenceMenuItem[] = [];
    const absences = this.absenceLookup.absences();
    const details = this.absenceLookup.absenceDetails();

    for (const absence of absences) {
      if (!absence.id) continue;

      const absenceDetailsForThis = details.filter(
        (d) => d.absenceId === absence.id
      );

      const absenceNameLocalized =
        getLocalizedValue(absence.name as IMultiLanguage, language) || '';

      if (absenceDetailsForThis.length > 0) {
        for (const detail of absenceDetailsForThis) {
          if (!detail.id) continue;

          items.push({
            id: detail.id,
            absenceId: absence.id,
            absenceName: absenceNameLocalized,
            name:
              getLocalizedValue(detail.detailName as IMultiLanguage, language) ||
              absenceNameLocalized,
            color: absence.color || '',
            isDetail: true,
            startTime: detail.startTime,
            endTime: detail.endTime,
            duration: detail.duration,
            mode: detail.mode,
            defaultValue: absence.defaultValue,
            description: detail.description as IMultiLanguage | undefined,
          });
        }
      } else {
        items.push({
          id: absence.id,
          absenceId: absence.id,
          absenceName: absenceNameLocalized,
          name: absenceNameLocalized,
          color: absence.color || '',
          isDetail: false,
          defaultValue: absence.defaultValue,
        });
      }
    }

    return items;
  }

  reload(): void {
    this.absenceLookup.reload();
  }
}
