// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * State + actions for the proactive assistant inbox (silent channel, Phase 2).
 * Holds the unread badge count as a signal fed by the REST unread-count endpoint,
 * live ProactiveInboxChanged pushes, and local updates after mark-read calls.
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

  markAllRead(): Observable<void> {
    return this.dataProactiveMessageService
      .markAllRead()
      .pipe(tap(() => this.unreadCount.set(0)));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
