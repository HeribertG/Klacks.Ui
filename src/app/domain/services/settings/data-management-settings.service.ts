// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Facade service that coordinates all settings-related operations.
 * Exposes specialized sub-services as readonly properties and provides
 * rate conversion helpers (decimal <-> percentage) and IManageable coordination.
 */
import { Injectable, inject, signal, computed } from '@angular/core';
import { ILoadable, IResettable, ISaveable } from 'src/app/domain/interfaces/manageable.interface';
import { UserAdministrationManagementService } from './user-administration-management.service';
import { AppSettingsManagementService } from './app-settings-management.service';
import { MacroManagementService } from './macro-management.service';
import { CountryStateManagementService } from './country-state-management.service';
import { BranchManagementService } from './branch-management.service';
import { GridColorService } from './grid-color.service';

const PERCENTAGE_FACTOR = 100;

@Injectable({
  providedIn: 'root',
})
export class DataManagementSettingsService implements ISaveable, IResettable, ILoadable {
  readonly userAdmin = inject(UserAdministrationManagementService);
  readonly appSettings = inject(AppSettingsManagementService);
  readonly macros = inject(MacroManagementService);
  readonly countryStateService = inject(CountryStateManagementService);
  readonly branchService = inject(BranchManagementService);
  readonly gridColorService = inject(GridColorService);

  private _showProgressSpinner = computed(() =>
    this.userAdmin.isLoading() ||
    this.appSettings.isLoading() ||
    this.macros.isLoading()
  );

  get showProgressSpinner(): boolean {
    return this._showProgressSpinner();
  }

  public isReset = signal(false);
  public onSaveCompleted?: () => void;
  public settingsChangeTrigger = signal<number>(0);

  get nightRate(): number {
    return this.appSettings.workSettings().nightRate * PERCENTAGE_FACTOR;
  }

  set nightRate(value: number) {
    this.appSettings.workSettings.update(s => ({ ...s, nightRate: value / PERCENTAGE_FACTOR }));
  }

  get nightRateRaw(): number {
    return this.appSettings.workSettings().nightRate;
  }

  get holidayRate(): number {
    return this.appSettings.workSettings().holidayRate * PERCENTAGE_FACTOR;
  }

  set holidayRate(value: number) {
    this.appSettings.workSettings.update(s => ({ ...s, holidayRate: value / PERCENTAGE_FACTOR }));
  }

  get holidayRateRaw(): number {
    return this.appSettings.workSettings().holidayRate;
  }

  get saRate(): number {
    return this.appSettings.workSettings().saRate * PERCENTAGE_FACTOR;
  }

  set saRate(value: number) {
    this.appSettings.workSettings.update(s => ({ ...s, saRate: value / PERCENTAGE_FACTOR }));
  }

  get saRateRaw(): number {
    return this.appSettings.workSettings().saRate;
  }

  get soRate(): number {
    return this.appSettings.workSettings().soRate * PERCENTAGE_FACTOR;
  }

  set soRate(value: number) {
    this.appSettings.workSettings.update(s => ({ ...s, soRate: value / PERCENTAGE_FACTOR }));
  }

  get soRateRaw(): number {
    return this.appSettings.workSettings().soRate;
  }

  areObjectsDirty(): boolean {
    return (
      this.appSettings.isDirty() ||
      this.countryStateService.isCountriesDirty() ||
      this.countryStateService.isStatesDirty() ||
      this.branchService.isBranchesDirty() ||
      this.gridColorService.isSetting_Dirty()
    );
  }

  save(): void {
    let hasOperations = false;

    if (this.appSettings.isDirty()) {
      this.appSettings.save();
      hasOperations = true;
    }

    if (this.countryStateService.isCountriesDirty()) {
      this.countryStateService.saveCountries();
      hasOperations = true;
    }

    if (this.countryStateService.isStatesDirty()) {
      this.countryStateService.saveStates();
      hasOperations = true;
    }

    if (this.branchService.isBranchesDirty()) {
      this.branchService.saveBranches();
      hasOperations = true;
    }

    if (this.gridColorService.isSetting_Dirty()) {
      this.gridColorService.save();
      hasOperations = true;
    }

    if (!hasOperations && this.onSaveCompleted) {
      this.onSaveCompleted();
    }
  }

  async readData(): Promise<void> {
    await Promise.all([
      this.appSettings.loadSettingsAsync(),
      this.countryStateService.loadCountriesAndStatesAsync(),
      this.branchService.loadBranchesAsync(),
      this.macros.loadMacrosAsync(),
    ]);

    this.isReset.set(true);
    setTimeout(() => this.isReset.set(false), 100);
  }

  async resetData(): Promise<void> {
    this.appSettings.resetData();
    await Promise.all([
      this.countryStateService.loadCountriesAndStatesAsync(),
      this.branchService.loadBranchesAsync(),
      this.macros.resetDataAsync(),
      this.gridColorService.readDataAsync(),
    ]);

    this.isReset.set(true);
    setTimeout(() => this.isReset.set(false), 100);
  }

  goBack(): string {
    return '';
  }

  public destroy(): void {
    this.userAdmin.destroy();
    this.macros.destroy();
  }
}
