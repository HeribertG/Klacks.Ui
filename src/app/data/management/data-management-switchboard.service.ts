import {
  Injectable,
  effect,
  inject,
  signal,
  computed,
  EffectRef,
} from '@angular/core';
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

  // Signals für internen State
  private _nameOfVisibleEntity = signal<string>('');
  private _lastNameOfVisibleEntity = signal<string>('');
  private _isDirty = signal<boolean>(false);
  private _isDisabled = signal<boolean>(false);
  private _isSavedOrReset = signal<boolean>(false);
  private _isSearchVisible = signal<boolean>(true);

  public isFocusChanged = signal<boolean>(false);

  private spinnerStates = computed(() => ({
    client: this.dataManagementClientService.showProgressSpinner(),
    group: this.dataManagementGroupService.showProgressSpinner(),
    absence: this.dataManagementAbsenceService.showProgressSpinner(),
    schedule: this.dataManagementScheduleService.showProgressSpinner(),
  }));

  private shouldShowSpinner = computed(() => {
    const states = this.spinnerStates();
    return states.client || states.group || states.absence || states.schedule;
  });

  public get lastNameOfVisibleEntity(): string {
    return this._lastNameOfVisibleEntity();
  }

  public get isDirty(): boolean {
    return this._isDirty();
  }

  public set isDirty(value: boolean) {
    this._isDirty.set(value);
  }

  public get isDisabled(): boolean {
    return this._isDisabled();
  }

  public set isDisabled(value: boolean) {
    this._isDisabled.set(value);
  }

  public get isSavedOrReset(): boolean {
    return this._isSavedOrReset();
  }

  public set isSavedOrReset(value: boolean) {
    this._isSavedOrReset.set(value);
  }

  public get isSearchVisible(): boolean {
    return this._isSearchVisible();
  }

  public set isSearchVisible(value: boolean) {
    this._isSearchVisible.set(value);
    this.isFocusChanged.set(true);
  }

  public get nameOfVisibleEntity(): string {
    return this._nameOfVisibleEntity();
  }

  public set nameOfVisibleEntity(value: string) {
    this._lastNameOfVisibleEntity.set(this._nameOfVisibleEntity());
    this._nameOfVisibleEntity.set(value);

    // Handle search visibility based on entity
    switch (value) {
      case 'DataManagementGroupService':
        this._isSearchVisible.set(false);
        break;
      default:
        this._isSearchVisible.set(true);
        break;
    }

    this.isFocusChanged.set(true);
  }

  private effectRefs: EffectRef[] = [];

  constructor() {
    this.setupEffects();
  }

  private setupEffects(): void {
    // Consolidated spinner effect
    const spinnerEffect = effect(() => {
      const shouldShow = this.shouldShowSpinner();
      this.showProgressSpinner(shouldShow);
    });
    this.effectRefs.push(spinnerEffect);

    // Auto-cleanup for dirty state
    const dirtyCleanupEffect = effect(() => {
      const isDirty = this._isDirty();
      const isSavedOrReset = this._isSavedOrReset();

      if (isDirty && isSavedOrReset) {
        this.checkObjectDirty();
      }

      if (!isDirty) {
        this._isSavedOrReset.set(false);
        this._isDisabled.set(false);
      }
    });
    this.effectRefs.push(dirtyCleanupEffect);
  }

  public showProgressSpinner(value: boolean): void {
    this.spinnerService.showProgressSpinner = value;
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

  public actualPage(): string {
    switch (this.nameOfVisibleEntity) {
      case 'DataManagementClientService_Edit':
      case 'DataManagementClientService':
        return 'employees';
      case 'DataManagementSettingsService':
        return 'settings';
      case 'DataManagementProfileService':
        return 'profile';
      case 'DataManagementGroupService_Edit':
        return 'group';
      case 'DataManagementShiftService_Edit':
        return 'shift';
      case 'DataManagementAbsenceGanttService':
        return 'gantt';
      case 'DataManagementScheduleService':
        return 'schedule';
      default:
        return '';
    }
  }

  private checkObjectDirty(): void {
    let isDirty = false;

    switch (this.nameOfVisibleEntity) {
      case 'DataManagementClientService_Edit':
      case 'DataManagementClientService':
        isDirty = this.dataManagementClientService.areObjectsDirty();
        break;
      case 'DataManagementSettingsService':
        isDirty = this.dataManagementSettingsService.areObjectsDirty();
        break;
      case 'DataManagementProfileService':
        isDirty = this.dataManagementProfileService.areObjectsDirty();
        break;
      case 'DataManagementGroupService_Edit':
        isDirty = this.dataManagementGroupService.areObjectsDirty();
        break;
      case 'DataManagementShiftService_Edit':
        isDirty = this.dataManagementShiftService.areObjectsDirty();
        break;
      default:
        isDirty = false;
        break;
    }

    this._isDirty.set(isDirty);

    if (!isDirty) {
      this._isDisabled.set(false);
      this.showProgressSpinner(false);
    }
  }

  onClickSave(): void {
    this.isDisabled = true;
    this.isSavedOrReset = true;

    switch (this.nameOfVisibleEntity) {
      case 'DataManagementClientService_Edit':
        this.dataManagementClientService.save();
        break;
      case 'DataManagementSettingsService':
        this.dataManagementSettingsService.save();
        break;
      case 'DataManagementProfileService':
        this.dataManagementProfileService.save();
        break;
      case 'DataManagementGroupService_Edit':
        this.dataManagementGroupService.save();
        break;
      case 'DataManagementShiftService_Edit':
        this.dataManagementShiftService.save();
        break;
    }
  }

  reset(): void {
    this.isSavedOrReset = true;

    switch (this.nameOfVisibleEntity) {
      case 'DataManagementClientService_Edit':
      case 'DataManagementClientService':
        this.dataManagementClientService.resetData();
        break;
      case 'DataManagementSettingsService':
        this.dataManagementSettingsService.resetData();
        break;
      case 'DataManagementProfileService':
        this.dataManagementProfileService.readData();
        break;
      case 'DataManagementGroupService_Edit':
        this.dataManagementGroupService.resetData();
        break;
      case 'DataManagementShiftService_Edit':
        this.dataManagementShiftService.resetData();
        break;
    }
  }

  resetAllSignals(): void {
    this._isDirty.set(false);
    this._isDisabled.set(false);
    this._isSavedOrReset.set(false);
    this.isFocusChanged.set(false);
  }

  destroy(): void {
    this.effectRefs.forEach((ref) => ref.destroy());
    this.effectRefs = [];
  }
}
