import { Injectable, effect, inject, signal } from '@angular/core';
import { DataManagementAbsenceService } from './data-management-absence.service';
import { DataManagementClientService } from './data-management-client.service';
import { DataManagementProfileService } from './data-management-profile.service';
import { DataManagementSettingsService } from './data-management-settings.service';
import { DataManagementScheduleService } from './data-management-schedule.service';
import { SpinnerService } from 'src/app/spinner/spinner.service';
import { DataManagementGroupService } from './data-management-group.service';
import { DataManagementShiftService } from './data-management-shift.service';

@Injectable({
  providedIn: 'root',
})
export class DataManagementSwitchboardService {
  public dataManagementClientService = inject(DataManagementClientService);
  public dataManagementSettingsService = inject(DataManagementSettingsService);
  public dataManagementProfileService = inject(DataManagementProfileService);
  public dataManagementAbsenceService = inject(DataManagementAbsenceService);
  public dataManagementScheduleService = inject(DataManagementScheduleService);
  public dataManagementGroupService = inject(DataManagementGroupService);
  public dataManagementShiftService = inject(DataManagementShiftService);
  private spinnerService = inject(SpinnerService);

  public isFocusChanged = signal(false);

  public lastNameOfVisibleEntity = '';
  public isDirty = false;
  public isDisabled = false;
  public isSavedOrReset = false;

  private _nameOfVisibleEntity = '';
  private _isSearchVisible = true;

  private effects: ReturnType<typeof effect>[] = [];

  constructor() {
    effect(() => {
      const showSpinner =
        this.dataManagementClientService.showProgressSpinner();
      if (showSpinner) {
        this.showProgressSpinner(true);
      } else if (!showSpinner) {
        this.showProgressSpinner(false);
      }
    });

    effect(() => {
      const showSpinner = this.dataManagementGroupService.showProgressSpinner();
      if (showSpinner) {
        this.showProgressSpinner(true);
      } else if (!showSpinner) {
        this.showProgressSpinner(false);
      }
    });

    effect(() => {
      const showSpinner =
        this.dataManagementAbsenceService.showProgressSpinner();
      if (showSpinner) {
        this.showProgressSpinner(true);
      } else if (!showSpinner) {
        this.showProgressSpinner(false);
      }
    });

    effect(() => {
      const showSpinner =
        this.dataManagementScheduleService.showProgressSpinner();
      if (showSpinner) {
        this.showProgressSpinner(true);
      } else if (!showSpinner) {
        this.showProgressSpinner(false);
      }
    });
  }

  public get isSearchVisible(): boolean {
    return this._isSearchVisible;
  }

  public set isSearchVisible(value: boolean) {
    this._isSearchVisible = value;
    this.isFocusChanged.set(true);
  }

  public showProgressSpinner(value: boolean): void {
    this.spinnerService.showProgressSpinner = value;
  }
  public get nameOfVisibleEntity(): string {
    return this._nameOfVisibleEntity;
  }

  public set nameOfVisibleEntity(value: string) {
    this.lastNameOfVisibleEntity = this._nameOfVisibleEntity;
    this._nameOfVisibleEntity = value;
    switch (this.nameOfVisibleEntity) {
      case 'DataManagementGroupService':
        this._isSearchVisible = false;
    }

    this.isFocusChanged.set(true);
  }

  areObjectsDirty(): void {
    this.checkObjectDirty();
  }

  checkIfDirtyIsNecessary(): void {
    if (this.isDirty && this.isSavedOrReset) {
      this.checkObjectDirty();
    }

    if (!this.isDirty) {
      this.isSavedOrReset = false;
      this.isDisabled = false;
    }
  }

  private checkObjectDirty(): void {
    switch (this.nameOfVisibleEntity) {
      case 'DataManagementClientService_Edit':
      case 'DataManagementClientService':
        this.isDirty = this.dataManagementClientService.areObjectsDirty();
        break;

      case 'DataManagementSettingsService':
        this.isDirty = this.dataManagementSettingsService.areObjectsDirty();

        break;
      case 'DataManagementProfileService':
        this.isDirty = this.dataManagementProfileService.areObjectsDirty();
        break;

      case 'DataManagementGroupService_Edit':
        this.isDirty = this.dataManagementGroupService.areObjectsDirty();

        break;

      case 'DataManagementShiftService_Edit':
        this.isDirty = this.dataManagementShiftService.areObjectsDirty();
        break;
      default:
        this.isDirty = false;
        break;
    }

    if (!this.isDirty) {
      this.isDisabled = false;
      this.showProgressSpinner(false);
    }
  }

  onClickSave(): void {
    switch (this.nameOfVisibleEntity) {
      case 'DataManagementClientService_Edit':
        this.isDisabled = true;
        this.isSavedOrReset = true;
        this.dataManagementClientService.save();

        break;
      case 'DataManagementSettingsService':
        this.isDisabled = true;
        this.isSavedOrReset = true;
        this.dataManagementSettingsService.save();
        break;
      case 'DataManagementProfileService':
        this.isDisabled = true;
        this.isSavedOrReset = true;
        this.dataManagementProfileService.save();
        break;
      case 'DataManagementGroupService_Edit':
        this.isDisabled = true;
        this.isSavedOrReset = true;
        this.dataManagementGroupService.save();
        break;
      case 'DataManagementShiftService_Edit':
        this.isDisabled = true;
        this.isSavedOrReset = true;
        this.dataManagementShiftService.save();
        break;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  reset(resethard = false): void {
    switch (this.nameOfVisibleEntity) {
      case 'DataManagementClientService_Edit':
      case 'DataManagementClientService':
        this.isSavedOrReset = true;
        this.dataManagementClientService.resetData();
        break;
      case 'DataManagementSettingsService':
        this.isSavedOrReset = true;
        this.dataManagementSettingsService.resetData();
        break;
      case 'DataManagementProfileService':
        this.isSavedOrReset = true;
        this.dataManagementProfileService.readData();
        break;
      case 'DataManagementGroupService_Edit':
        this.isSavedOrReset = true;
        this.dataManagementGroupService.resetData();

        break;
      case 'DataManagementShiftService_Edit':
        this.isSavedOrReset = true;
        this.dataManagementShiftService.resetData();
        break;
    }
  }

  refresh(): void {}
}
