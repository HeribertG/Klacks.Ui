// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * State + actions for the proactive assistant inbox (silent channel, Phase 2).
 * Holds the unread badge count as a signal fed by the REST unread-count endpoint,
 * live ProactiveInboxChanged pushes, and local updates after mark-read calls.
 * Also owns the "while you were away" block state (which messages are grouped
 * under the inbox heading, where the heading anchor sits, and whether the block
 * is expanded). This state is root-scoped on purpose: AssistantChatComponent is
 * destroyed and recreated every time the aside panel closes and reopens, so any
 * state kept on the component itself would reset and strand already-grouped
 * messages as ungrouped bubbles.
 * @param dataProactiveMessageService - HTTP API for inbox listing and read state
 * @param signalRService - assistant SignalR connection for live unread-count updates
 */

import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { Observable, Subject, tap } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DataProactiveMessageService } from 'src/app/infrastructure/api/assistant/data-proactive-message.service';
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import { IProactiveInboxItem } from 'src/app/domain/interfaces/proactive-inbox.interface';

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
   * Anchor the block heading to the given message, but only the first time — a later
   * load must extend the existing block, not move the heading or re-expand it.
   * @param messageId - Id of the message to render the heading above
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
    this.inboxExpandedSignal.set(true);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
