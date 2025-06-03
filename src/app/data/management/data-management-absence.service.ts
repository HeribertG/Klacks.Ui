import { inject, Injectable, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import {
  Absence,
  AbsenceFilter,
  IAbsence,
  TruncatedAbsence,
} from 'src/app/core/absence-class';
import {
  cloneObject,
  compareComplexObjects,
} from 'src/app/helpers/object-helpers';
import { ToastShowService } from 'src/app/toast/toast-show.service';
import { DataAbsenceService } from '../data-absence.service';
import { DataLoadFileService } from '../data-load-file.service';

@Injectable({
  providedIn: 'root',
})
export class DataManagementAbsenceService {
  public dataAbsenceService = inject(DataAbsenceService);
  public toastShowService = inject(ToastShowService);
  private dataLoadFileService = inject(DataLoadFileService);

  public isRead = signal(false);
  public showProgressSpinner = signal(false);

  public maxItems = 0;
  public firstItem = 0;

  public listWrapper: TruncatedAbsence | undefined;
  public currentFilter: AbsenceFilter = new AbsenceFilter();

  private static readonly READ_RESET_DELAY = 100;

  private currentFilterDummy: AbsenceFilter | undefined;
  private temporaryFilterDummy: AbsenceFilter | undefined;

  /* #region   temporary check is Filter dirty */

  public setTemporaryFilter() {
    this.temporaryFilterDummy = cloneObject<AbsenceFilter>(this.currentFilter);
  }

  public isTemoraryFilter_Dirty(): boolean {
    const a = this.currentFilter as AbsenceFilter;
    const b = this.temporaryFilterDummy as AbsenceFilter;

    if (!compareComplexObjects(a, b)) {
      return true;
    }
    return false;
  }

  /* #endregion   temporary check is Filter dirty */

  readPage(language: string) {
    this.showProgressSpinner.set(true);
    this.currentFilter.language = language;

    this.dataAbsenceService
      .readTruncatedAbsence(this.currentFilter)
      .subscribe((x: TruncatedAbsence | undefined) => {
        if (x) {
          this.listWrapper = x;

          this.currentFilterDummy = cloneObject<AbsenceFilter>(
            this.currentFilter
          );
          this.maxItems = x.maxItems;
          this.firstItem = x.firstItemOnPage;
          this.showProgressSpinner.set(false);
          this.isRead.set(true);
          setTimeout(
            () => this.isRead.set(false),
            DataManagementAbsenceService.READ_RESET_DELAY
          );
        }
      });
  }

  async deleteAbsence(id: string, language: string): Promise<void> {
    await lastValueFrom(this.dataAbsenceService.deleteAbsence(id));
    this.readPage(language);
  }

  async addAbsence(item: Absence, language: string): Promise<void> {
    await lastValueFrom(this.dataAbsenceService.addAbsence(item));
    this.readPage(language);
  }

  async updateAbsence(item: IAbsence, language: string): Promise<void> {
    await lastValueFrom(this.dataAbsenceService.updateAbsence(item));
    this.readPage(language);
  }
}
