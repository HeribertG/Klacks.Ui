import { Injectable } from '@angular/core';
import { DataManagementAbsenceService } from './data-management-absence.service';
import { DataManagementClientService } from './data-management-client.service';
import { DataManagementProfileService } from './data-management-profile.service';
import { DataManagementSettingsService } from './data-management-settings.service';
import { DataManagementScheduleService } from './data-management-schedule.service';
import { SpinnerService } from 'src/app/spinner/spinner.service';
import { DataManagementGroupService } from './data-management-group.service';
import { DataManagementShiftService } from './data-management-shift.service';
import { Subject, takeUntil } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataManagementSwitchboardService {
  public isFocusChangedEvent = new Subject<boolean>();

  private _nameOfVisibleEntity = '';
  lastNameOfVisibleEntity = '';
  isDirty = false;
  isDisabled = false;
  isSavedOrReset = false;
  private ngUnsubscribe = new Subject<void>();

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
    this.dataManagementClientService.startToReadPage
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x) => {
        setTimeout(() => {
          this.spinnerService.showProgressSpinner = true;
        }, 200);
      });

    this.dataManagementClientService.isRead
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x) => {
        setTimeout(() => {
          this.spinnerService.showProgressSpinner = false;
        }, 200);
      });

    this.dataManagementClientService.isReset
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x) => {
        setTimeout(() => {
          this.spinnerService.showProgressSpinner = false;
        }, 200);
      });
    this.dataManagementSettingsService.isReset
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x) => {
        setTimeout(() => {
          this.spinnerService.showProgressSpinner = false;
        }, 200);
      });
    this.dataManagementProfileService.isRead
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x) => {
        setTimeout(() => {
          this.spinnerService.showProgressSpinner = false;
        }, 200);
      });
    this.dataManagementAbsenceService.isRead
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x) => {
        setTimeout(() => {
          this.spinnerService.showProgressSpinner = false;
        }, 200);
      });
    this.dataManagementScheduleService.isRead
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x) => {
        setTimeout(() => {
          this.spinnerService.showProgressSpinner = false;
        }, 200);
      });

    this.dataManagementGroupService.startToReadPage
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x) => {
        setTimeout(() => {
          this.spinnerService.showProgressSpinner = true;
        }, 200);
      });

    this.dataManagementGroupService.isRead
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x) => {
        setTimeout(() => {
          this.spinnerService.showProgressSpinner = false;
        }, 200);
      });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  public get nameOfVisibleEntity(): string {
    return this._nameOfVisibleEntity;
  }
  public set nameOfVisibleEntity(value: string) {
    this.lastNameOfVisibleEntity = this._nameOfVisibleEntity;
    this._nameOfVisibleEntity = value;
    this.isFocusChangedEvent.next(true);
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
      setTimeout(() => {
        this.spinnerService.showProgressSpinner = false;
      }, 200);
    }
  }

  onClickSave(): void {
    switch (this.nameOfVisibleEntity) {
      case 'DataManagementClientService_Edit':
        this.isDisabled = true;
        setTimeout(() => {
          this.spinnerService.showProgressSpinner = true;
        }, 200);

        this.isSavedOrReset = true;
        this.dataManagementClientService.save();

        break;
      case 'DataManagementSettingsService':
        this.isDisabled = true;
        setTimeout(() => {
          this.spinnerService.showProgressSpinner = true;
        }, 200);
        this.isSavedOrReset = true;
        this.dataManagementSettingsService.save();
        break;
      case 'DataManagementProfileService':
        this.isDisabled = true;
        setTimeout(() => {
          this.spinnerService.showProgressSpinner = true;
        }, 200);
        this.isSavedOrReset = true;
        this.dataManagementProfileService.save();
        break;
      case 'DataManagementGroupService_Edit':
        this.isDisabled = true;
        setTimeout(() => {
          this.spinnerService.showProgressSpinner = true;
        }, 200);
        this.isSavedOrReset = true;
        this.dataManagementGroupService.save();
        break;
      case 'DataManagementShiftService_Edit':
        this.isDisabled = true;
        setTimeout(() => {
          this.spinnerService.showProgressSpinner = true;
        }, 200);
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
