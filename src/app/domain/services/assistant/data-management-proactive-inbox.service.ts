// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * State + actions for the proactive assistant inbox (silent channel, Phase 2).
 * Holds the unread badge count as a signal fed by the REST unread-count endpoint,
 * live ProactiveInboxChanged pushes, and local updates after mark-read calls.
 * Also owns the "while you were away" block state (which messages are grouped
 * under the inbox heading, where the heading anchor sits, whether the block
 * is expanded, and which rows the user has hidden). This state is root-scoped on
 * purpose: AssistantChatComponent is destroyed and recreated every time the aside
 * panel closes and reopens, so any state kept on the component itself would reset
 * and strand already-grouped messages as ungrouped bubbles.
 * @param dataProactiveMessageService - HTTP API for inbox listing and read state
 * @param signalRService - assistant SignalR connection for live unread-count updates
 */

import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { Observable, Subject, tap } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DataProactiveMessageService } from 'src/app/infrastructure/api/assistant/data-proactive-message.service';
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import { IProactiveInboxItem } from 'src/app/domain/interfaces/proactive-inbox.interface';
import {
  PROACTIVE_REACTION,
  ProactiveRejectReason,
} from 'src/app/domain/constants/proactive-reaction.constants';

const UNREAD_MESSAGES_TAKE = 50;

@Injectable({ providedIn: 'root' })
export class DataManagementProactiveInboxService implements OnDestroy {
  private dataProactiveMessageService = inject(DataProactiveMessageService);
  private signalRService = inject(AssistantSignalRService);

  private readonly destroy$ = new Subject<void>();

  public readonly unreadCount = signal<number>(0);
  public readonly hasUnread = computed(() => this.unreadCount() > 0);

  private readonly inboxHeadingMessageIdSignal = signal<string | null>(null);
  public readonly inboxHeadingMessageId = this.inboxHeadingMessageIdSignal.asReadonly();

  private readonly inboxExpandedSignal = signal<boolean>(true);
  public readonly inboxExpanded = this.inboxExpandedSignal.asReadonly();

  private readonly inboxMessageIdsSignal = signal<ReadonlySet<string>>(new Set());
  public readonly inboxMessageIds = this.inboxMessageIdsSignal.asReadonly();

  private readonly hiddenMessageIdsSignal = signal<ReadonlySet<string>>(new Set());
  public readonly hiddenMessageIds = this.hiddenMessageIdsSignal.asReadonly();

  constructor() {
    this.signalRService.proactiveInboxChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe((change) => this.unreadCount.set(change.unreadCount));
  }

  refreshUnreadCount(): void {
    this.dataProactiveMessageService
      .getUnreadCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => this.unreadCount.set(result.count),
        error: () => undefined,
      });
  }

  loadUnreadMessages(): Observable<IProactiveInboxItem[]> {
    return this.dataProactiveMessageService.getUnreadMessages(UNREAD_MESSAGES_TAKE);
  }

  markRead(messageId: string): Observable<void> {
    return this.dataProactiveMessageService
      .markRead(messageId)
      .pipe(tap(() => this.unreadCount.update((count) => Math.max(0, count - 1))));
  }

  markManyRead(messageIds: readonly string[]): Observable<void> {
    return this.dataProactiveMessageService.markManyRead(messageIds);
  }

  markAllRead(): Observable<void> {
    return this.dataProactiveMessageService
      .markAllRead()
      .pipe(tap(() => this.unreadCount.set(0)));
  }

  /**
   * Add message ids to the current inbox block (union, never replace) so a second
   * load within the same session extends the block instead of evicting it.
   * @param messageIds - Ids of the messages to include in the grouped block
   */
  addToInboxBlock(messageIds: readonly string[]): void {
    this.inboxMessageIdsSignal.update((ids) => new Set([...ids, ...messageIds]));
  }

  /**
   * Drop rows out of the block without touching the server, for messages the server
   * already reported as dismissed. Re-sending a reaction they already carry would
   * only cost a round trip.
   * @param messageIds - Ids of the messages to hide
   */
  markHidden(messageIds: readonly string[]): void {
    if (messageIds.length === 0) {
      return;
    }
    this.hiddenMessageIdsSignal.update((ids) => new Set([...ids, ...messageIds]));
  }

  /**
   * Hide rows and persist that as "read". The listing only ever asks for unread rows,
   * so marking them read is what keeps them from returning after a reload; the local
   * set covers the current session, where the messages stay in the conversation.
   * @param messageIds - Ids of the messages to hide
   */
  hideMessages(messageIds: readonly string[]): void {
    if (messageIds.length === 0) {
      return;
    }
    this.markHidden(messageIds);
    this.dataProactiveMessageService
      .markManyRead(messageIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.refreshUnreadCount(),
        error: () => undefined,
      });
  }

  /**
   * Hide a single row and record why it went away, so the dismissal still feeds the
   * trigger statistics. Subscribed here rather than in the component on purpose: the
   * aside can close mid-flight, and a request cancelled then would leave the row
   * hidden locally but unread on the server.
   * @param messageId - Id of the message the user dismissed
   * @param rejectReason - Why it was dismissed; omitted when the user picked no reason
   */
  dismissMessage(messageId: string, rejectReason?: ProactiveRejectReason): void {
    this.dataProactiveMessageService
      .setReaction(messageId, PROACTIVE_REACTION.Dismissed, rejectReason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ error: () => undefined });
    this.hideMessages([messageId]);
  }

  /**
   * Record that the user handled the message, which stops the reminder backoff for it
   * server-side. Returned cold on purpose: the component owns the pending state and the
   * error toast, so it subscribes itself (unlike dismissMessage, where the aside closing
   * mid-flight must not strand the row).
   * @param messageId - Id of the message to acknowledge
   */
  acknowledgeMessage(messageId: string): Observable<void> {
    return this.dataProactiveMessageService.acknowledge(messageId);
  }

  /**
   * Take rows back out of the local hidden set without a server call, for rows that came
   * back as a reminder: a hide from before the reminder must not swallow the re-sent row
   * for the rest of the session.
   * @param messageIds - Ids of the messages to show again
   */
  unhideMessages(messageIds: readonly string[]): void {
    if (messageIds.length === 0) {
      return;
    }
    this.hiddenMessageIdsSignal.update((ids) => {
      const next = new Set(ids);
      for (const id of messageIds) {
        next.delete(id);
      }
      return next;
    });
  }

  /**
   * Record where the block started and open it, but only the first time — a later load
   * must extend the existing block, not re-expand it. Where the heading is actually
   * rendered is decided by the component from the first row still visible, so hiding
   * that row moves the heading down instead of taking the block with it.
   * @param messageId - Id of the message the block started at
   */
  setInboxHeadingIfUnset(messageId: string): void {
    if (this.inboxHeadingMessageIdSignal() !== null) {
      return;
    }
    this.inboxHeadingMessageIdSignal.set(messageId);
    this.inboxExpandedSignal.set(true);
  }

  toggleInboxExpanded(): void {
    this.inboxExpandedSignal.update((expanded) => !expanded);
  }

  /**
   * Start a fresh inbox block for a new conversation (explicit "clear chat"),
   * as opposed to the aside merely closing and reopening, which must keep the block.
   */
  resetInboxBlock(): void {
    this.inboxHeadingMessageIdSignal.set(null);
    this.inboxMessageIdsSignal.set(new Set());
    this.hiddenMessageIdsSignal.set(new Set());
    this.inboxExpandedSignal.set(true);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
