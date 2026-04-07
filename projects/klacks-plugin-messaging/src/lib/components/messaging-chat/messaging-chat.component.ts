// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Chat component for displaying and sending messages in the Messaging workplace.
 * Includes voice input via VoiceModeService (same as chatbot) and scroll navigation.
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
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faMicrophone, faMicrophoneSlash, faPaperPlane, faChevronUp, faChevronDown, faHouse } from '@fortawesome/free-solid-svg-icons';
import { Subject, takeUntil } from 'rxjs';
import { DataMessagingService } from '../../services/data-messaging.service';
import {
  PLUGIN_EVENT_STREAM,
  PLUGIN_VOICE_SERVICE,
  PLUGIN_SPEECH_SERVICE,
} from 'klacks-plugin-contracts';
import { Message } from '../../models/message.model';
import { MessageDirection } from '../../enums/message-direction.enum';

@Component({
  selector: 'lib-messaging-chat',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    TranslateModule,
    FontAwesomeModule,
  ],
  providers: [],
  templateUrl: './messaging-chat.component.html',
  styleUrls: ['./messaging-chat.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessagingChatComponent implements OnInit, OnDestroy {
  private dataService = inject(DataMessagingService);
  private pluginEvents = inject(PLUGIN_EVENT_STREAM);
  private cdr = inject(ChangeDetectorRef);
  public speechService = inject(PLUGIN_SPEECH_SERVICE);
  private voiceModeService = inject(PLUGIN_VOICE_SERVICE);

  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

  messages = signal<Message[]>([]);
  isLoading = signal(false);
  selectedContact = signal<string | null>(null);
  selectedProvider = signal<string | null>(null);
  selectedDirection = signal<MessageDirection | undefined>(undefined);
  selectedProviderIds = signal<string[]>([]);
  showAll = signal<boolean>(false);
  hasMore = signal<boolean>(false);

  private readonly defaultPageSize = 50;
  private readonly showAllPageSize = 10000;

  inputText = '';

  faMicrophone = faMicrophone;
  faMicrophoneSlash = faMicrophoneSlash;
  faPaperPlane = faPaperPlane;
  faChevronUp = faChevronUp;
  faChevronDown = faChevronDown;
  faHouse = faHouse;

  private ngUnsubscribe = new Subject<void>();

  get voiceModeEnabled(): boolean {
    return this.voiceModeService.voiceModeEnabled;
  }

  get isListening(): boolean {
    return this.voiceModeService.isListening;
  }

  get isTranscribing(): boolean {
    return this.voiceModeService.isTranscribing;
  }

  ngOnInit(): void {
    this.voiceModeService.initialize({
      getInputText: () => this.inputText,
      setInputText: (text: string) => { this.inputText = text; },
      sendMessage: async () => { this.sendMessage(); },
      getIsProcessing: () => this.isLoading(),
      detectChanges: () => this.cdr.markForCheck(),
    }, this.ngUnsubscribe);

    this.loadMessages();
    this.subscribeToIncomingMessages();
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    if (this.voiceModeEnabled) {
      this.voiceModeService.disableVoiceMode();
    }
  }

  loadMessages(): void {
    this.isLoading.set(true);
    const providerId = this.selectedProviderIds().length === 1
      ? this.selectedProviderIds()[0]
      : undefined;
    const direction = this.selectedDirection();
    const sender = this.selectedContact() ?? undefined;
    const pageSize = this.showAll() ? this.showAllPageSize : this.defaultPageSize;

    this.dataService.getMessages(providerId, direction, sender, pageSize, 0)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe({
        next: (msgs) => {
          this.messages.set(msgs);
          if (!this.showAll()) {
            this.hasMore.set(msgs.length >= this.defaultPageSize);
          }
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
      contentType: 'text',
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

  clearContact(): void {
    this.selectedContact.set(null);
    this.selectedProvider.set(null);
    this.loadMessages();
  }

  applyFilter(filter: { direction?: MessageDirection; providerIds?: string[]; showAll?: boolean }): void {
    this.selectedDirection.set(filter.direction);
    if (filter.providerIds) {
      this.selectedProviderIds.set(filter.providerIds);
    }
    if (filter.showAll !== undefined) {
      this.showAll.set(filter.showAll);
    }
    this.loadMessages();
  }

  onInputKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  async toggleVoiceMode(): Promise<void> {
    await this.voiceModeService.toggleVoiceMode();
    this.cdr.markForCheck();
  }

  isUsingWhisper(): boolean {
    return this.voiceModeService.isUsingWhisper();
  }

  scrollUp(): void {
    if (this.messagesContainer) {
      this.messagesContainer.nativeElement.scrollBy({ top: -200, behavior: 'smooth' });
    }
  }

  scrollDown(): void {
    if (this.messagesContainer) {
      this.messagesContainer.nativeElement.scrollBy({ top: 200, behavior: 'smooth' });
    }
  }

  getDirectionClass(direction: MessageDirection): string {
    return direction === MessageDirection.Inbound ? 'inbound' : 'outbound';
  }

  private subscribeToIncomingMessages(): void {
    this.pluginEvents
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.loadMessages();
      });
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
    }
  }
}
