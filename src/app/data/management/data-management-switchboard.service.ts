import { Injectable, effect, signal } from '@angular/core';
import { DataManagementAbsenceService } from './data-management-absence.service';
import { DataManagementClientService } from './data-management-client.service';
import { DataManagementProfileService } from './data-management-profile.service';
import { DataManagementSettingsService } from './data-management-settings.service';
import { DataManagementScheduleService } from './data-management-schedule.service';
import { SpinnerService } from 'src/app/spinner/spinner.service';
import { DataManagementGroupService } from './data-management-group.service';
import { DataManagementShiftService } from './data-management-shift.service';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataManagementSwitchboardService {
  public isFocusChanged = signal(false);
  public lastNameOfVisibleEntity = '';
  public isDirty = false;
  public isDisabled = false;
  public isSavedOrReset = false;

  private _nameOfVisibleEntity = '';

  constructor(
    public dataManagementClientService: DataManagementClientService,
    public dataManagementSettingsService: DataManagementSettingsService,
    public dataManagementProfileService: DataManagementProfileService,
    public dataManagementAbsenceService: DataManagementAbsenceService,
    public dataManagementScheduleService: DataManagementScheduleService,
    public dataManagementGroupService: DataManagementGroupService,
    public dataManagementShiftService: DataManagementShiftService,

    private spinnerService: SpinnerService
  ) {
    effect(
      () => {
        const showSpinner =
          this.dataManagementClientService.showProgressSpinner();
        if (showSpinner) {
          this.showProgressSpinner(true);
        } else if (!showSpinner) {
          this.showProgressSpinner(false);
        }

        const showSpinner1 =
          this.dataManagementGroupService.showProgressSpinner();
        if (showSpinner1) {
          this.showProgressSpinner(true);
        } else if (!showSpinner) {
          this.showProgressSpinner(false);
        }

        const showSpinner2 =
          this.dataManagementAbsenceService.showProgressSpinner();
        if (showSpinner2) {
          this.showProgressSpinner(true);
        } else if (!showSpinner) {
          this.showProgressSpinner(false);
        }

        const showSpinner3 =
          this.dataManagementScheduleService.showProgressSpinner();
        if (showSpinner3) {
          this.showProgressSpinner(true);
        } else if (!showSpinner) {
          this.showProgressSpinner(false);
        }
      },
      { allowSignalWrites: true }
    );
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

  reset(resethard: boolean = false): void {
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
