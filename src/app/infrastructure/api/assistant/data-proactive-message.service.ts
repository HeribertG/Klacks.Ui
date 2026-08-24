// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API service for proactive assistant messages: user reactions plus the silent-channel
 * inbox (unread listing, unread count, mark-as-read).
 * @param messageId - Identifier of the proactive message dispatch (Guid)
 * @param reaction - Chosen reaction value, helpful or dismissed
 * @param rejectReason - Why the message was dismissed; omitted when no reason was picked, and rejected by the API when sent with a helpful reaction
 * @param take - Maximum number of unread messages to fetch
 * @param messageIds - Ids of the messages the client actually rendered
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { SKIP_LOADING } from 'src/app/domain/constants/http-context.constants';
import {
  ProactiveReaction,
  ProactiveRejectReason,
} from 'src/app/domain/constants/proactive-reaction.constants';
import {
  IProactiveInboxItem,
  IProactiveUnreadCount,
} from 'src/app/domain/interfaces/proactive-inbox.interface';

export interface ISetProactiveReactionRequest {
  reaction: ProactiveReaction;
  rejectReason?: ProactiveRejectReason;
}

@Injectable({
  providedIn: 'root',
})
export class DataProactiveMessageService {
  private httpClient = inject(HttpClient);
  private readonly baseUrl =
    environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;

  setReaction(
    messageId: string,
    reaction: ProactiveReaction,
    rejectReason?: ProactiveRejectReason,
  ): Observable<void> {
    const request: ISetProactiveReactionRequest = rejectReason
      ? { reaction, rejectReason }
      : { reaction };
    return this.httpClient
      .put<void>(
        `${this.baseUrl}proactive-messages/${messageId}/reaction`,
        request,
        { context: new HttpContext().set(SKIP_LOADING, true) },
      )
      .pipe(retry(3));
  }

  getUnreadMessages(take: number): Observable<IProactiveInboxItem[]> {
    const params = new HttpParams()
      .set('unreadOnly', true)
      .set('take', take);
    return this.httpClient
      .get<IProactiveInboxItem[]>(
        `${this.baseUrl}proactive-messages`,
        { params, context: new HttpContext().set(SKIP_LOADING, true) },
      )
      .pipe(retry(3));
  }

  getUnreadCount(): Observable<IProactiveUnreadCount> {
    return this.httpClient
      .get<IProactiveUnreadCount>(
        `${this.baseUrl}proactive-messages/unread-count`,
        { context: new HttpContext().set(SKIP_LOADING, true) },
      )
      .pipe(retry(3));
  }

  markRead(messageId: string): Observable<void> {
    return this.httpClient
      .put<void>(
        `${this.baseUrl}proactive-messages/${messageId}/read`,
        null,
        { context: new HttpContext().set(SKIP_LOADING, true) },
      )
      .pipe(retry(3));
  }

  markManyRead(messageIds: readonly string[]): Observable<void> {
    return this.httpClient
      .put<void>(
        `${this.baseUrl}proactive-messages/read`,
        { ids: messageIds },
        { context: new HttpContext().set(SKIP_LOADING, true) },
      )
      .pipe(retry(3));
  }

  markAllRead(): Observable<void> {
    return this.httpClient
      .put<void>(
        `${this.baseUrl}proactive-messages/read-all`,
        null,
        { context: new HttpContext().set(SKIP_LOADING, true) },
      )
      .pipe(retry(3));
  }
}
