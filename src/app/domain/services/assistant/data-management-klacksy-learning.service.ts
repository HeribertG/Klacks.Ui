// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Domain service for the admin review of everything Klacksy has learned by itself.
 * Wraps the infrastructure API service so the presentation layer never talks to HTTP directly.
 */
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DataKlacksyLearningService } from 'src/app/infrastructure/api/assistant/data-klacksy-learning.service';
import {
  ILearnedCapability,
  ILearnedPhrase,
  ISkillLearningRunResponse,
  IUnfulfillableWish,
  IUpdateLearnedCapabilityRequest,
  IUpdateLearnedPhraseRequest,
} from 'src/app/domain/interfaces/klacksy-learning.interface';

@Injectable({
  providedIn: 'root',
})
export class DataManagementKlacksyLearningService {
  private dataKlacksyLearningService = inject(DataKlacksyLearningService);

  getPhrases(limit?: number): Observable<ILearnedPhrase[]> {
    return this.dataKlacksyLearningService.getPhrases(limit);
  }

  updatePhrase(id: string, request: IUpdateLearnedPhraseRequest): Observable<void> {
    return this.dataKlacksyLearningService.updatePhrase(id, request);
  }

  deletePhrase(id: string): Observable<void> {
    return this.dataKlacksyLearningService.deletePhrase(id);
  }

  approveDescriptionProposal(id: string): Observable<void> {
    return this.dataKlacksyLearningService.approveDescriptionProposal(id);
  }

  getCapabilities(): Observable<ILearnedCapability[]> {
    return this.dataKlacksyLearningService.getCapabilities();
  }

  updateCapability(id: string, request: IUpdateLearnedCapabilityRequest): Observable<void> {
    return this.dataKlacksyLearningService.updateCapability(id, request);
  }

  deleteCapability(id: string): Observable<void> {
    return this.dataKlacksyLearningService.deleteCapability(id);
  }

  getUnfulfillableWishes(): Observable<IUnfulfillableWish[]> {
    return this.dataKlacksyLearningService.getUnfulfillableWishes();
  }

  dismissUnfulfillableWish(id: string): Observable<void> {
    return this.dataKlacksyLearningService.dismissUnfulfillableWish(id);
  }

  retryUnfulfillableWish(id: string): Observable<void> {
    return this.dataKlacksyLearningService.retryUnfulfillableWish(id);
  }

  runLearning(): Observable<ISkillLearningRunResponse> {
    return this.dataKlacksyLearningService.runLearning();
  }
}
