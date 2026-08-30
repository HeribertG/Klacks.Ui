// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API service for the admin review of everything Klacksy has learned by itself.
 * Exposes the admin-only learning endpoints for learned phrases, learned capabilities and
 * unfulfillable wishes, plus the approve action that applies a blocked description proposal
 * to the skill itself, the retry action that hands a wish the loop gave up on back to it,
 * and the trigger that starts a learning run right away.
 * @param baseUrl - Assistant API root, the learning routes hang below it as "learning/..."
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  ILearnedCapability,
  ILearnedPhrase,
  ISkillLearningRunResponse,
  IUnfulfillableWish,
  IUpdateLearnedCapabilityRequest,
  IUpdateLearnedPhraseRequest,
} from 'src/app/domain/interfaces/klacksy-learning.interface';
import {
  KLACKSY_LEARNING_APPROVE_ACTION,
  KLACKSY_LEARNING_DEFAULT_PHRASE_LIMIT,
  KLACKSY_LEARNING_RETRY_ACTION,
  KLACKSY_LEARNING_RUN_PATH,
  KLACKSY_LEARNING_UNFULFILLABLE_PATH,
} from 'src/app/domain/constants/klacksy-learning.constants';

@Injectable({
  providedIn: 'root',
})
export class DataKlacksyLearningService {
  private httpClient = inject(HttpClient);
  private readonly baseUrl = `${
    environment.baseAssistantUrl || `${environment.baseUrl}assistant/`
  }learning/`;

  getPhrases(limit = KLACKSY_LEARNING_DEFAULT_PHRASE_LIMIT): Observable<ILearnedPhrase[]> {
    return this.httpClient
      .get<ILearnedPhrase[]>(`${this.baseUrl}phrases`, {
        params: { limit: limit.toString() },
      })
      .pipe(retry(3));
  }

  updatePhrase(id: string, request: IUpdateLearnedPhraseRequest): Observable<void> {
    return this.httpClient.put<void>(`${this.baseUrl}phrases/${id}`, request);
  }

  deletePhrase(id: string): Observable<void> {
    return this.httpClient.delete<void>(`${this.baseUrl}phrases/${id}`);
  }

  approveDescriptionProposal(id: string): Observable<void> {
    return this.httpClient.post<void>(
      `${this.baseUrl}phrases/${id}/${KLACKSY_LEARNING_APPROVE_ACTION}`,
      {},
    );
  }

  getCapabilities(): Observable<ILearnedCapability[]> {
    return this.httpClient
      .get<ILearnedCapability[]>(`${this.baseUrl}capabilities`)
      .pipe(retry(3));
  }

  updateCapability(id: string, request: IUpdateLearnedCapabilityRequest): Observable<void> {
    return this.httpClient.put<void>(`${this.baseUrl}capabilities/${id}`, request);
  }

  deleteCapability(id: string): Observable<void> {
    return this.httpClient.delete<void>(`${this.baseUrl}capabilities/${id}`);
  }

  getUnfulfillableWishes(): Observable<IUnfulfillableWish[]> {
    return this.httpClient
      .get<IUnfulfillableWish[]>(`${this.baseUrl}${KLACKSY_LEARNING_UNFULFILLABLE_PATH}`)
      .pipe(retry(3));
  }

  dismissUnfulfillableWish(id: string): Observable<void> {
    return this.httpClient.delete<void>(
      `${this.baseUrl}${KLACKSY_LEARNING_UNFULFILLABLE_PATH}/${id}`,
    );
  }

  retryUnfulfillableWish(id: string): Observable<void> {
    return this.httpClient.post<void>(
      `${this.baseUrl}${KLACKSY_LEARNING_UNFULFILLABLE_PATH}/${id}/${KLACKSY_LEARNING_RETRY_ACTION}`,
      {},
    );
  }

  runLearning(): Observable<ISkillLearningRunResponse> {
    return this.httpClient.post<ISkillLearningRunResponse>(
      `${this.baseUrl}${KLACKSY_LEARNING_RUN_PATH}`,
      {},
    );
  }
}
