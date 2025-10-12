import { inject, Injectable, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import {
  Absence,
  AbsenceFilter,
  IAbsence,
  TruncatedAbsence,
} from 'src/app/domain/models/absence-class';
import {
  cloneObject,
  compareComplexObjects,
} from 'src/app/domain/helpers/object-helpers';
import { DataAbsenceService } from 'src/app/infrastructure/api/data-absence.service';
import { DataLoadFileService } from 'src/app/infrastructure/api/data-load-file.service';
import { ILoadable } from 'src/app/domain/interfaces/manageable.interface';
import { ManageableServiceRegistry } from 'src/app/application/services/manageable-service-registry';
import { RouteName } from 'src/app/domain/models/entity-names.enum';

@Injectable({
  providedIn: 'root',
})
export class DataManagementAbsenceService implements ILoadable {
  public dataAbsenceService = inject(DataAbsenceService);
  private dataLoadFileService = inject(DataLoadFileService);

  constructor() {
    // Selbst-Registrierung für die absence Route
    ManageableServiceRegistry.register(
      RouteName.ABSENCE,
      DataManagementAbsenceService
    );
  }

  private _showProgressSpinner = signal(false);
  get showProgressSpinner(): boolean { return this._showProgressSpinner(); }

  public isRead = signal(false);

  public maxItems = 0;
  public firstItem = 0;

  public listWrapper: TruncatedAbsence | undefined;
  public currentFilter: AbsenceFilter = new AbsenceFilter();
  public restoreSearch = signal('');

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
    this._showProgressSpinner.set(true);
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
          this._showProgressSpinner.set(false);
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
