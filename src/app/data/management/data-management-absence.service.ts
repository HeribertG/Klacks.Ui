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
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { ToastService } from 'src/app/toast/toast.service';
import { DataAbsenceService } from '../data-absence.service';
import { DataLoadFileService } from '../data-load-file.service';

@Injectable({
  providedIn: 'root',
})
export class DataManagementAbsenceService {
  public dataAbsenceService = inject(DataAbsenceService);
  public toastService = inject(ToastService);
  private dataLoadFileService = inject(DataLoadFileService);

  public isRead = signal(false);
  public showProgressSpinner = signal(false);

  public maxItems = 0;
  public firstItem = 0;

  public listWrapper: TruncatedAbsence | undefined;
  public currentFilter: AbsenceFilter = new AbsenceFilter();

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
          setTimeout(() => this.isRead.set(false), 100);
        }
      });
  }

  deleteAbsence(id: string, language: string): void {
    lastValueFrom(this.dataAbsenceService.deleteAbsence(id))
      .then(() => {
        this.readPage(language);
      })
      .catch((x) => {
        this.showError(MessageLibrary.UNKNOWN_ERROR);
      });
  }

  addAbsence(item: Absence, language: string): void {
    lastValueFrom(this.dataAbsenceService.addAbsence(item))
      .then(() => {
        this.readPage(language);
      })
      .catch((x) => {
        this.showError(MessageLibrary.UNKNOWN_ERROR);
      });
  }

  updateAbsence(item: IAbsence, language: string): void {
    lastValueFrom(this.dataAbsenceService.updateAbsence(item)).then(() => {
      this.readPage(language);
    });
  }

  exportExcel(language: string) {
    this.dataLoadFileService.downloadAbsenceExcel(language);
    this.showInfo(
      MessageLibrary.PLEASE_BE_PATIENT_EXCEL,
      'PLEASE_BE_PATIENT_EXCEL'
    );
  }

  showInfo(Message: string, infoName = '') {
    if (infoName) {
      const y = this.toastService.toasts.find((x) => x.name === infoName);
      this.toastService.remove(y);
    }
    this.toastService.show(Message, {
      classname: 'bg-info text-light',
      delay: 5000,
      name: infoName,
      autohide: true,
      headertext: 'Info',
    });
  }

  showError(Message: string, errorName = '') {
    if (errorName) {
      const y = this.toastService.toasts.find((x) => x.name === errorName);
      this.toastService.remove(y);
    }

    this.toastService.show(Message, {
      classname: 'bg-danger text-light',
      delay: 3000,
      name: errorName,
      autohide: true,
      headertext: MessageLibrary.ERROR_TOASTTITLE,
    });
  }
}
