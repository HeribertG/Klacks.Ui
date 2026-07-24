// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API service for recording user reactions to proactive assistant messages.
 * @param messageId - Identifier of the proactive message dispatch (Guid)
 * @param reaction - Chosen reaction value, helpful or dismissed
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { SKIP_LOADING } from 'src/app/domain/constants/http-context.constants';
import { ProactiveReaction } from 'src/app/domain/constants/proactive-reaction.constants';

export interface ISetProactiveReactionRequest {
  reaction: ProactiveReaction;
}

@Injectable({
  providedIn: 'root',
})
export class DataProactiveMessageService {
  private httpClient = inject(HttpClient);
  private readonly baseUrl =
    environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;

  setReaction(messageId: string, reaction: ProactiveReaction): Observable<void> {
    const request: ISetProactiveReactionRequest = { reaction };
    return this.httpClient.put<void>(
      `${this.baseUrl}proactive-messages/${messageId}/reaction`,
      request,
      { context: new HttpContext().set(SKIP_LOADING, true) },
    );
  }
}
