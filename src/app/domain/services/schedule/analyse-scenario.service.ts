// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Domain service for managing what-if analysis scenarios.
 * @param activeScenario - The currently selected scenario (or null)
 * @param scenarios - List of all active scenarios for the current group
 * @param isScenarioMode - Whether a scenario is actively selected
 * @param activeToken - The token of the active scenario for API calls
 */

import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import {
  AnalyseScenarioStatus,
  IAnalyseScenario,
  ICreateAnalyseScenarioRequest,
} from 'src/app/domain/models/schedule/analyse-scenario-class';
import { DataAnalyseScenarioService } from 'src/app/infrastructure/api/schedule/data-analyse-scenario.service';

@Injectable({
  providedIn: 'root',
})
export class AnalyseScenarioService {
  private dataService = inject(DataAnalyseScenarioService);

  public activeScenario = signal<IAnalyseScenario | null>(null);
  public scenarios = signal<IAnalyseScenario[]>([]);
  public isScenarioMode = computed(() => this.activeScenario() !== null);
  public activeToken = computed(() => this.activeScenario()?.token ?? null);

  loadScenarios(groupId?: string): void {
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

  acceptScenario(id: string): Observable<void> {
    return this.dataService.accept(id).pipe(
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
