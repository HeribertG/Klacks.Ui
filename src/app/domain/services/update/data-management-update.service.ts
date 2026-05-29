// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Domain service for the auto-update feature. Orchestrates access to the update backend so that
 * presentation components depend on the domain layer rather than the infrastructure HTTP service.
 */
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  DataUpdateService,
  IUpdateConfig,
  IUpdateHistoryItem,
  IUpdateStatus,
  IUpdateTriggerResult,
} from 'src/app/infrastructure/api/settings/data-update.service';

@Injectable({
  providedIn: 'root',
})
export class DataManagementUpdateService {
  private api = inject(DataUpdateService);

  getStatus(): Observable<IUpdateStatus> {
    return this.api.getStatus();
  }

  getHistory(take?: number): Observable<IUpdateHistoryItem[]> {
    return this.api.getHistory(take);
  }

  getConfig(): Observable<IUpdateConfig> {
    return this.api.getConfig();
  }

  saveConfig(config: IUpdateConfig): Observable<IUpdateConfig> {
    return this.api.saveConfig(config);
  }

  triggerUpdate(): Observable<IUpdateTriggerResult> {
    return this.api.triggerUpdate();
  }

  rollbackUpdate(): Observable<IUpdateTriggerResult> {
    return this.api.rollbackUpdate();
  }

  cancelUpdate(id: string): Observable<void> {
    return this.api.cancelUpdate(id);
  }
}
