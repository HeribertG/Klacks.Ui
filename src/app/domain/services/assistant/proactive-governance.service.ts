// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Wraps the infrastructure API service so the presentation layer never talks to HTTP directly and
 * keeps the last answer of the admin-only governance endpoint as the single source of truth. Two
 * surfaces show the master off switch at the same time - the settings card and the status bar above
 * the assistant chat - and both must never disagree about a safety switch, so every read and every
 * write feeds one shared signal instead of a per-component copy.
 * @param governance - Read-only signal holding the last governance picture the server confirmed
 * @param killSwitchActive - True while the master off switch pins every finding type to reporting only
 */
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { DataProactiveGovernanceService } from 'src/app/infrastructure/api/assistant/data-proactive-governance.service';
import { IProactiveGovernance } from 'src/app/domain/models/assistant/proactive-governance.interface';
import { IProactiveGovernanceUpdate } from 'src/app/domain/models/assistant/proactive-governance-update.interface';

@Injectable({ providedIn: 'root' })
export class ProactiveGovernanceService {
  private dataProactiveGovernanceService = inject(DataProactiveGovernanceService);

  private readonly governanceState = signal<IProactiveGovernance | null>(null);

  readonly governance = this.governanceState.asReadonly();
  readonly killSwitchActive = computed(() => this.governanceState()?.killSwitchActive ?? false);

  get(): Observable<IProactiveGovernance> {
    return this.dataProactiveGovernanceService
      .get()
      .pipe(tap((governance) => this.governanceState.set(governance)));
  }

  update(update: IProactiveGovernanceUpdate): Observable<IProactiveGovernance> {
    return this.dataProactiveGovernanceService
      .update(update)
      .pipe(tap((governance) => this.governanceState.set(governance)));
  }
}
