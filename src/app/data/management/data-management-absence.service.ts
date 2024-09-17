import { Injectable } from '@angular/core';
import { Subject, lastValueFrom } from 'rxjs';
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
  public isRead = new Subject<boolean>();

  maxItems = 0;
  firstItem = 0;

  listWrapper: TruncatedAbsence | undefined;

  currentFilter: AbsenceFilter = new AbsenceFilter();
  currentFilterDummy: AbsenceFilter | undefined;
  temporaryFilterDummy: AbsenceFilter | undefined;

  constructor(
    public dataAbsenceService: DataAbsenceService,
    public toastService: ToastService,
    private dataLoadFileService: DataLoadFileService
  ) {}

  /* #region   temporary check is Filter dirty */

  public setTemporaryFilter() {
    this.temporaryFilterDummy = cloneObject(this.currentFilter);
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
    this.currentFilter.language = language;

    this.dataAbsenceService
      .readTruncatedAbsence(this.currentFilter)
      .subscribe((x: TruncatedAbsence | undefined) => {
        if (x) {
          this.listWrapper = x;

          this.currentFilterDummy = cloneObject(this.currentFilter);
          this.maxItems = x.maxItems;
          this.firstItem = x.firstItemOnPage;
          this.isRead.next(true);
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
