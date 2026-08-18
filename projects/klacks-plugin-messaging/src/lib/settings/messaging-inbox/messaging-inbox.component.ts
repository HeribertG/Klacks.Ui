// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Messaging inbox component for displaying incoming and outgoing messages.
 * Subscribes to SignalR for real-time incoming message notifications.
 */

import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataMessagingService } from '../../services/data-messaging.service';
import { PLUGIN_EVENT_STREAM } from 'klacks-plugin-contracts';
import { Message } from '../../models/message.model';
import { IncomingMessage } from '../../models/incoming-message.model';
import { MessageDirection } from '../../enums/message-direction.enum';
import { MessageStatus } from '../../enums/message-status.enum';
import { PluginSettingsListCardComponent } from '../../shared/settings-list-card/settings-list-card.component';

@Component({
  selector: 'lib-messaging-inbox',
  standalone: true,
  imports: [
    TranslateModule,
    DatePipe,
    NgClass,
    FormsModule,
    PluginSettingsListCardComponent,
  ],
  templateUrl: './messaging-inbox.component.html',
  styleUrls: ['./messaging-inbox.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessagingInboxComponent implements OnInit, OnDestroy {
  private dataService = inject(DataMessagingService);
  private pluginEvents = inject(PLUGIN_EVENT_STREAM);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  messages = signal<Message[]>([]);
  isLoading = signal(false);
  selectedDirection = signal<MessageDirection | undefined>(undefined);

  readonly MessageDirection = MessageDirection;

  ngOnInit(): void {
    this.loadMessages();
    this.subscribeToIncomingMessages();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMessages(): void {
    this.isLoading.set(true);
    const direction = this.selectedDirection();
    this.dataService.getMessages(undefined, direction, undefined, undefined, 50, 0)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages) => {
          this.messages.set(messages);
          this.isLoading.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoading.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  onDirectionFilterChange(direction: MessageDirection | undefined): void {
    this.selectedDirection.set(direction);
    this.loadMessages();
  }

  getDirectionLabel(direction: MessageDirection): string {
    return direction === MessageDirection.Inbound ? '\u2190 IN' : '\u2192 OUT';
  }

  getDirectionClass(direction: MessageDirection): string {
    return direction === MessageDirection.Inbound ? 'badge-inbound' : 'badge-outbound';
  }

  private subscribeToIncomingMessages(): void {
    this.pluginEvents
      .pipe(takeUntil(this.destroy$))
      .subscribe((payload: unknown) => {
        const incoming = payload as IncomingMessage;
        const newMsg: Message = {
          id: incoming.messageId,
          providerId: '',
          providerName: incoming.providerName,
          externalMessageId: '',
          sender: incoming.sender,
          senderDisplayName: incoming.senderDisplayName,
          content: incoming.content,
          contentType: incoming.contentType,
          direction: MessageDirection.Inbound,
          status: MessageStatus.Delivered,
          timestamp: incoming.timestamp,
          errorMessage: null,
          mediaUrl: null,
          recipient: '',
          recipientDisplayName: '',
        };
        this.messages.update(msgs => [newMsg, ...msgs].slice(0, 50));
        this.cdr.markForCheck();
      });
  }
}
