// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API service for the admin-only proactive governance endpoints: reads how far Klacksy may act by
 * itself per finding type and writes a single rule or the master off switch.
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IProactiveGovernance } from 'src/app/domain/models/assistant/proactive-governance.interface';
import { IProactiveGovernanceUpdate } from 'src/app/domain/models/assistant/proactive-governance-update.interface';

@Injectable({ providedIn: 'root' })
export class DataProactiveGovernanceService {
  private httpClient = inject(HttpClient);
  private readonly baseUrl = environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;

  get(): Observable<IProactiveGovernance> {
    return this.httpClient
      .get<IProactiveGovernance>(`${this.baseUrl}proactive-governance`)
      .pipe(retry(3));
  }

  update(update: IProactiveGovernanceUpdate): Observable<IProactiveGovernance> {
    return this.httpClient.put<IProactiveGovernance>(`${this.baseUrl}proactive-governance`, update);
  }
}
