// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Wraps the infrastructure API service so the presentation layer never talks to HTTP directly.
 */
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DataProactiveGovernanceService } from 'src/app/infrastructure/api/assistant/data-proactive-governance.service';
import { IProactiveGovernance } from 'src/app/domain/models/assistant/proactive-governance.interface';
import { IProactiveGovernanceUpdate } from 'src/app/domain/models/assistant/proactive-governance-update.interface';

@Injectable({ providedIn: 'root' })
export class ProactiveGovernanceService {
  private dataProactiveGovernanceService = inject(DataProactiveGovernanceService);

  get(): Observable<IProactiveGovernance> {
    return this.dataProactiveGovernanceService.get();
  }

  update(update: IProactiveGovernanceUpdate): Observable<IProactiveGovernance> {
    return this.dataProactiveGovernanceService.update(update);
  }
}
