import { Injectable, inject, signal } from '@angular/core';
import { IManageable } from 'src/app/presentation/workplace/core/interfaces/manageable.interface';
import { ManageableServiceRegistry } from 'src/app/presentation/workplace/core/manageable-service-registry';
import { RouteName } from 'src/app/domain/models/entity-names.enum';
import { DataManagementSettingsService } from './data-management-settings.service';
import { DataManagementContractService } from './data-management-contract.service';

/**
 * Wrapper Service that combines DataManagementSettingsService and DataManagementContractService
 * to provide a unified IManageable interface for the settings route.
 */
@Injectable({
  providedIn: 'root',
})
export class SettingsManageableWrapperService implements IManageable {
  private dataManagementSettingsService = inject(DataManagementSettingsService);
  private dataManagementContractService = inject(DataManagementContractService);

  public showProgressSpinner = signal(false);
  public onSaveCompleted?: () => void;

  constructor() {
    // Register this wrapper service for the settings route
    ManageableServiceRegistry.register(
      RouteName.SETTINGS,
      SettingsManageableWrapperService
    );
  }

  areObjectsDirty(): boolean {
    // Check if either service has dirty objects
    return (
      this.dataManagementSettingsService.areObjectsDirty() ||
      this.dataManagementContractService.areObjectsDirty()
    );
  }

  save(): void {
    // Track if all saves are completed
    let pendingSaves = 0;
    
    // Save settings if dirty
    if (this.dataManagementSettingsService.areObjectsDirty()) {
      pendingSaves++;
      this.dataManagementSettingsService.onSaveCompleted = () => {
        pendingSaves--;
        this.checkAllSavesCompleted(pendingSaves);
      };
      this.dataManagementSettingsService.save();
    }
    
    // Save contracts if dirty
    if (this.dataManagementContractService.areObjectsDirty()) {
      pendingSaves++;
      this.dataManagementContractService.onSaveCompleted = () => {
        pendingSaves--;
        this.checkAllSavesCompleted(pendingSaves);
      };
      this.dataManagementContractService.save();
    }
    
    // If nothing to save, call onSaveCompleted immediately
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
    // Both services return the same path
    return this.dataManagementSettingsService.goBack();
  }
}