// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Chat component for displaying and sending messages in the Messaging workplace.
 * @param messages - Signal holding the current list of messages
 * @param isLoading - Signal indicating whether messages are being fetched
 * @param selectedContact - Signal holding the currently selected contact identifier
 * @param selectedProvider - Signal holding the currently selected provider name
 */

import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { DataMessagingService } from 'src/app/infrastructure/api/messaging/data-messaging.service';
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import { Message } from 'src/app/domain/models/messaging/message.model';
import { MessageDirection } from 'src/app/domain/enums/message-direction.enum';

@Component({
  selector: 'app-messaging-chat',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    TranslateModule,
  ],
  templateUrl: './messaging-chat.component.html',
  styleUrls: ['./messaging-chat.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessagingChatComponent implements OnInit, OnDestroy {
  private dataService = inject(DataMessagingService);
  private signalRService = inject(AssistantSignalRService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

  messages = signal<Message[]>([]);
  isLoading = signal(false);
  selectedContact = signal<string | null>(null);
  selectedProvider = signal<string | null>(null);
  selectedDirection = signal<MessageDirection | undefined>(undefined);
  selectedProviderIds = signal<string[]>([]);

  inputText = '';

  private ngUnsubscribe = new Subject<void>();

  ngOnInit(): void {
    this.loadMessages();
    this.subscribeToIncomingMessages();
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  loadMessages(): void {
    this.isLoading.set(true);
    const providerId = this.selectedProviderIds().length === 1
      ? this.selectedProviderIds()[0]
      : undefined;
    const direction = this.selectedDirection();
    const sender = this.selectedContact() ?? undefined;

    this.dataService.getMessages(providerId, direction, sender)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe({
        next: (msgs) => {
          this.messages.set(msgs);
          this.isLoading.set(false);
          this.cdr.markForCheck();
          setTimeout(() => this.scrollToBottom());
        },
        error: () => {
          this.isLoading.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  sendMessage(): void {
    if (!this.selectedContact() || !this.inputText.trim()) {
      return;
    }

    const content = this.inputText.trim();
    this.inputText = '';

    this.dataService.sendMessage({
      provider: this.selectedProvider() ?? '',
      recipient: this.selectedContact()!,
      content,
      contentType: 'text/plain',
    }).pipe(takeUntil(this.ngUnsubscribe))
      .subscribe({
        next: () => {
          this.loadMessages();
        },
        error: () => {
          this.cdr.markForCheck();
        },
      });
  }

  applyFilter(filter: { direction?: MessageDirection; providerIds?: string[] }): void {
    this.selectedDirection.set(filter.direction);
    if (filter.providerIds) {
      this.selectedProviderIds.set(filter.providerIds);
    }
    this.loadMessages();
  }

  onInputKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  getDirectionClass(direction: MessageDirection): string {
    return direction === MessageDirection.Inbound ? 'inbound' : 'outbound';
  }

  private subscribeToIncomingMessages(): void {
    this.signalRService.incomingMessage$
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.loadMessages();
      });
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }
}
