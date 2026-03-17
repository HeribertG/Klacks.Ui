// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Domain-Service zur Verwaltung von What-If-Analyse-Szenarien.
 * @param activeScenario - Das aktuell ausgewaehlte Szenario (oder null)
 * @param scenarios - Liste aller aktiven Szenarien fuer die aktuelle Gruppe
 * @param isScenarioMode - Ob ein Szenario aktiv ausgewaehlt ist
 * @param activeToken - Der Token des aktiven Szenarios fuer API-Aufrufe
 */

import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
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

  loadScenarios(groupId: string): void {
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
}
