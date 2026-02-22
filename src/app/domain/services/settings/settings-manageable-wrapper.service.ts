// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject, signal } from '@angular/core';
import { ILoadable, IResettable, ISaveable, INavigable } from 'src/app/domain/interfaces/manageable.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from 'src/app/domain/interfaces/manageable-service-registry.interface';
import { RouteName } from 'src/app/domain/enums/entity-names.enum';
import { DataManagementSettingsService } from './data-management-settings.service';
import { DataManagementContractService } from '../contract/data-management-contract.service';

/**
 * Wrapper Service that combines DataManagementSettingsService and DataManagementContractService
 * to provide a unified IManageable interface for the settings route.
 */
@Injectable({
  providedIn: 'root',
})
export class SettingsManageableWrapperService implements ISaveable, IResettable, ILoadable, INavigable {
  private dataManagementSettingsService = inject(DataManagementSettingsService);
  private dataManagementContractService = inject(DataManagementContractService);

  private _showProgressSpinner = signal(false);
  get showProgressSpinner(): boolean { return this._showProgressSpinner(); }
  public onSaveCompleted?: () => void;
  public isReset = signal(false);

  private registry = inject(MANAGEABLE_SERVICE_REGISTRY_TOKEN);

  constructor() {
    this.registry.register(
      RouteName.SETTINGS,
      SettingsManageableWrapperService
    );
  }

  areObjectsDirty(): boolean {
    return (
      this.dataManagementSettingsService.areObjectsDirty() ||
      this.dataManagementContractService.areObjectsDirty()
    );
  }

  save(): void {
    let pendingSaves = 0;

    if (this.dataManagementSettingsService.areObjectsDirty()) {
      pendingSaves++;
      this.dataManagementSettingsService.onSaveCompleted = () => {
        pendingSaves--;
        this.checkAllSavesCompleted(pendingSaves);
      };
      this.dataManagementSettingsService.save();
    }

    if (this.dataManagementContractService.areObjectsDirty()) {
      pendingSaves++;
      this.dataManagementContractService.onSaveCompleted = () => {
        pendingSaves--;
        this.checkAllSavesCompleted(pendingSaves);
      };
      this.dataManagementContractService.save();
    }

    if (pendingSaves === 0 && this.onSaveCompleted) {
      this.onSaveCompleted();
    }
  }

  private checkAllSavesCompleted(pendingSaves: number): void {
    if (pendingSaves === 0 && this.onSaveCompleted) {
      this.onSaveCompleted();
    }
  }

  resetData(): void {
    this.dataManagementSettingsService.resetData();
    this.dataManagementContractService.resetData();
  }

  goBack(): string {
    return this.dataManagementSettingsService.goBack();
  }
}
