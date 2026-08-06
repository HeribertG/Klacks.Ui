// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Domain service for managing what-if analysis scenarios.
 * @param activeScenario - The currently selected scenario (or null)
 * @param scenarios - List of all active scenarios for the current group
 * @param isScenarioMode - Whether a scenario is actively selected
 * @param activeToken - The token of the active scenario for API calls
 */

import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, map, tap } from 'rxjs';
import {
  AnalyseScenarioStatus,
  IAnalyseScenario,
  ICreateAnalyseScenarioRequest,
  isWizard4Candidate,
} from 'src/app/domain/models/schedule/analyse-scenario-class';
import { SCHEDULE_SIGNALR } from 'src/app/domain/interfaces/schedule-signalr.interface';
import { DataAnalyseScenarioService } from 'src/app/infrastructure/api/schedule/data-analyse-scenario.service';

@Injectable({
  providedIn: 'root',
})
export class AnalyseScenarioService {
  private dataService = inject(DataAnalyseScenarioService);
  private signalRService = inject(SCHEDULE_SIGNALR);
  private destroyRef = inject(DestroyRef);

  private _lastLoadedGroupId: string | undefined;

  public activeScenario = signal<IAnalyseScenario | null>(null);
  public scenarios = signal<IAnalyseScenario[]>([]);
  public isScenarioMode = computed(() => this.activeScenario() !== null);
  public activeToken = computed(() => this.activeScenario()?.token ?? null);

  /** Suggestions of the background optimiser among the loaded scenarios, for the badge in the toolbar. */
  public wizard4CandidateCount = computed(() => this.scenarios().filter(isWizard4Candidate).length);

  constructor() {
    // The optimiser creates, replaces and expires candidates on its own schedule. Without this the
    // list would keep offering a scenario that is already gone until the next manual reload.
    this.signalRService.wizard4CandidatesChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadScenarios(this._lastLoadedGroupId));
  }

  loadScenarios(groupId?: string): void {
    this._lastLoadedGroupId = groupId;
    this.dataService.getByGroup(groupId).subscribe(scenarios => {
      this.scenarios.set(scenarios.filter(s => s.status === AnalyseScenarioStatus.Active));
    });
  }

  selectScenario(scenario: IAnalyseScenario): void {
    this.activeScenario.set(scenario);
  }

  exitScenario(): void {
    this.activeScenario.set(null);
  }

  createScenario(request: ICreateAnalyseScenarioRequest): Observable<IAnalyseScenario> {
    return this.dataService.create(request).pipe(
      tap(scenario => {
        this.scenarios.update(list => [...list, scenario]);
        this.activeScenario.set(scenario);
      })
    );
  }

  acceptScenario(id: string, overrideBlock = false): Observable<void> {
    return this.dataService.accept(id, overrideBlock).pipe(
      tap(() => {
        this.scenarios.update(list => list.filter(s => s.id !== id));
        this.activeScenario.set(null);
      })
    );
  }

  rejectScenario(id: string): Observable<void> {
    return this.dataService.reject(id).pipe(
      tap(() => {
        this.scenarios.update(list => list.filter(s => s.id !== id));
        this.activeScenario.set(null);
      })
    );
  }

  deleteScenario(id: string): Observable<void> {
    return this.dataService.delete(id).pipe(
      tap(() => {
        this.scenarios.update(list => list.filter(s => s.id !== id));
        if (this.activeScenario()?.id === id) {
          this.activeScenario.set(null);
        }
      })
    );
  }

  deleteAllScenarios(groupId?: string): Observable<void> {
    return this.dataService.deleteAll(groupId).pipe(
      tap(() => {
        this.scenarios.set([]);
        this.activeScenario.set(null);
      })
    );
  }

  renameScenario(id: string, name: string): Observable<void> {
    return this.dataService.rename(id, name).pipe(
      tap(updated => {
        this.scenarios.update(list =>
          list.map(s => (s.id === id ? { ...s, name: updated.name } : s))
        );
        if (this.activeScenario()?.id === id) {
          this.activeScenario.update(s => (s ? { ...s, name: updated.name } : s));
        }
      }),
      map(() => undefined as void),
    );
  }
}
