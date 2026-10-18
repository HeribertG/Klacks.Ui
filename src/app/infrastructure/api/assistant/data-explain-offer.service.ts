// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * API service of the UI explain offers (T5): reads whether the signed-in user may be offered the explanation of a
 * topic and records the user's reaction. The user is always the token's user; the request names none.
 * @param topicKey - Topic key (EXPLAIN_OFFER_TOPIC)
 * @param outcome - shown, accepted, later or declined (EXPLAIN_OFFER_OUTCOME)
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { SKIP_LOADING } from 'src/app/domain/constants/http-context.constants';
import { ExplainOfferOutcome, ExplainOfferTopic } from 'src/app/domain/constants/explain-offer.constants';
import { IExplainOfferState } from 'src/app/domain/models/assistant/explain-offer-state.interface';

const EXPLAIN_OFFERS_SEGMENT = 'explain-offers';
const REACTION_SEGMENT = 'reaction';

@Injectable({
  providedIn: 'root',
})
export class DataExplainOfferService {
  private httpClient = inject(HttpClient);
  private readonly baseUrl = environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;

  getState(topicKey: ExplainOfferTopic): Observable<IExplainOfferState> {
    return this.httpClient.get<IExplainOfferState>(`${this.baseUrl}${EXPLAIN_OFFERS_SEGMENT}/${topicKey}`, {
      context: new HttpContext().set(SKIP_LOADING, true),
    });
  }

  recordReaction(topicKey: ExplainOfferTopic, outcome: ExplainOfferOutcome): Observable<void> {
    return this.httpClient.post<void>(
      `${this.baseUrl}${EXPLAIN_OFFERS_SEGMENT}/${topicKey}/${REACTION_SEGMENT}`,
      { outcome },
      { context: new HttpContext().set(SKIP_LOADING, true) },
    );
  }
}
