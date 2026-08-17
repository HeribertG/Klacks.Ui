// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API service for the escalation intervention list: running chains, take-over and cancel.
 * @param chainId - Id of the escalation chain to act on
 * @param reason - Mandatory cancel reason (Owner decision B7)
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IEscalationChainSummary } from 'src/app/domain/interfaces/escalation-chain.interface';

@Injectable({
  providedIn: 'root',
})
export class DataEscalationChainService {
  private httpClient = inject(HttpClient);
  private readonly baseUrl =
    environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;

  getRunning(): Observable<IEscalationChainSummary[]> {
    return this.httpClient.get<IEscalationChainSummary[]>(
      `${this.baseUrl}escalation-chains`,
    );
  }

  acknowledge(chainId: string): Observable<void> {
    return this.httpClient.put<void>(
      `${this.baseUrl}escalation-chains/${chainId}/acknowledge`,
      null,
    );
  }

  cancel(chainId: string, reason: string): Observable<void> {
    return this.httpClient.put<void>(
      `${this.baseUrl}escalation-chains/${chainId}/cancel`,
      { reason },
    );
  }
}
