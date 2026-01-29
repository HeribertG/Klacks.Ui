import { inject, Injectable, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { IAbsence } from 'src/app/domain/models/absence-class';
import { IAbsenceDetail } from 'src/app/domain/models/absence-detail-class';
import { IMultiLanguage } from 'src/app/domain/models/multi-language-class';
import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';
import { DataAbsenceService } from 'src/app/infrastructure/api/data-absence.service';
import { DataAbsenceDetailService } from 'src/app/infrastructure/api/data-absence-detail.service';

@Injectable()
export class AbsenceLookupService {
  private dataAbsenceService = inject(DataAbsenceService);
  private dataAbsenceDetailService = inject(DataAbsenceDetailService);

  private _absences = signal<IAbsence[]>([]);
  private _absenceDetails = signal<IAbsenceDetail[]>([]);
  private _isLoaded = signal(false);

  get absences() {
    return this._absences.asReadonly();
  }

  get absenceDetails() {
    return this._absenceDetails.asReadonly();
  }

  get isLoaded() {
    return this._isLoaded.asReadonly();
  }

  async loadIfNeeded(): Promise<void> {
    if (this._isLoaded()) return;

    try {
      const [absences, details] = await Promise.all([
        lastValueFrom(this.dataAbsenceService.readAbsenceList()),
        lastValueFrom(this.dataAbsenceDetailService.readAbsenceDetailList()),
      ]);

      this._absences.set(absences || []);
      this._absenceDetails.set(details || []);
      this._isLoaded.set(true);
    } catch (error) {
      console.error('Error loading absences:', error);
    }
  }

  reload(): void {
    this._isLoaded.set(false);
  }

  getColorForEntryId(entryId: string): string | undefined {
    const absence = this.findAbsenceForEntryId(entryId);
    return absence?.color;
  }

  getAbbreviationForEntryId(entryId: string, language: string): string {
    const absence = this.findAbsenceForEntryId(entryId);
    if (!absence) return '';
    return getLocalizedValue(absence.abbreviation as IMultiLanguage, language);
  }

  getNameForEntryId(entryId: string, language: string): string {
    const absence = this.findAbsenceForEntryId(entryId);
    if (!absence) return '';
    return getLocalizedValue(absence.name as IMultiLanguage, language);
  }

  findAbsenceForEntryId(entryId: string): IAbsence | undefined {
    const details = this._absenceDetails();
    const detail = details.find((d) => d.id === entryId);
    if (detail) {
      return this._absences().find((a) => a.id === detail.absenceId);
    }
    return this._absences().find((a) => a.id === entryId);
  }

  findAbsenceDetailForEntryId(entryId: string): IAbsenceDetail | undefined {
    return this._absenceDetails().find((d) => d.id === entryId);
  }

  getDescriptionForEntryId(entryId: string): { de?: string; en?: string; fr?: string; it?: string } | undefined {
    const detail = this.findAbsenceDetailForEntryId(entryId);
    if (detail?.description) {
      return detail.description as { de?: string; en?: string; fr?: string; it?: string };
    }
    return undefined;
  }
}
