// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Infrastructure service for Holistic Harmonizer (LLM-driven schedule harmonizer) MVP.
 * Pure REST: Run is synchronous (single LLM round-trip); ApplyAsScenario materialises
 * the cached result via the shared harmonizer apply pipeline.
 * @param status - Signal with the current run status
 * @param result - Signal with the final run response (null until completion)
 * @param failureReason - Signal with the server failure message, if any
 * @param currentJobId - Signal with the latest job id from a successful run
 */

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  HolisticHarmonizerApplyRequest,
  HolisticHarmonizerApplyResponse,
  HolisticHarmonizerModelCheckResponse,
  HolisticHarmonizerRunRequest,
  HolisticHarmonizerRunResponse,
  HolisticHarmonizerStatus,
} from 'src/app/domain/models/holistic-harmonizer/holistic-harmonizer-run.model';

@Injectable({ providedIn: 'root' })
export class DataHolisticHarmonizerService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = `${environment.baseUrl}HolisticHarmonizer`;

  readonly status = signal<HolisticHarmonizerStatus>('idle');
  readonly result = signal<HolisticHarmonizerRunResponse | null>(null);
  readonly failureReason = signal<string | null>(null);
  readonly currentJobId = signal<string | null>(null);

  async run(request: HolisticHarmonizerRunRequest): Promise<HolisticHarmonizerRunResponse> {
    this.reset();
    this.status.set('running');
    try {
      const response = await firstValueFrom(
        this.http.post<HolisticHarmonizerRunResponse>(`${this.apiBase}/Run`, request),
      );
      this.result.set(response);
      this.currentJobId.set(response.jobId);
      this.status.set('completed');
      return response;
    } catch (error) {
      const message = this.extractMessage(error);
      this.failureReason.set(message);
      this.status.set('failed');
      throw error;
    }
  }

  async applyAsScenario(jobId: string, groupId: string | null): Promise<HolisticHarmonizerApplyResponse> {
    const payload: HolisticHarmonizerApplyRequest = { jobId, groupId };
    return firstValueFrom(
      this.http.post<HolisticHarmonizerApplyResponse>(`${this.apiBase}/ApplyAsScenario`, payload),
    );
  }

  async checkAllModels(): Promise<HolisticHarmonizerModelCheckResponse> {
    return firstValueFrom(
      this.http.post<HolisticHarmonizerModelCheckResponse>(`${this.apiBase}/CheckAllModels`, {}),
    );
  }

  reset(): void {
    this.status.set('idle');
    this.result.set(null);
    this.failureReason.set(null);
    this.currentJobId.set(null);
  }

  private extractMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error;
      if (body && typeof body === 'object' && 'message' in body && typeof (body as { message: unknown }).message === 'string') {
        return (body as { message: string }).message;
      }
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error';
  }
}
