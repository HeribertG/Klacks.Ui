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
  computed,
  Injector,
  runInInjectionContext,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faMicrophone, faMicrophoneSlash, faPaperPlane, faChevronUp, faChevronDown, faHouse } from '@fortawesome/free-solid-svg-icons';
import { Subject, takeUntil } from 'rxjs';
import { DataMessagingService, BroadcastPreview } from '../../services/data-messaging.service';
import { DataMessengerContactService } from '../../services/data-messenger-contact.service';
import { MessagingProvider } from '../../models/messaging-provider.model';
import { MessengerContact } from '../../models/messenger-contact.model';
import { messengerTypeFromProviderType } from '../../enums/messenger-type.enum';
import {
  PLUGIN_EVENT_STREAM,
  PLUGIN_VOICE_SERVICE,
  PLUGIN_SPEECH_SERVICE,
  PLUGIN_GROUP_SELECTION,
  PLUGIN_TOAST_SERVICE,
} from 'klacks-plugin-contracts';
import { effect, EffectRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Message } from '../../models/message.model';
import { MessageDirection } from '../../enums/message-direction.enum';
import { MessageScope } from '../../enums/message-scope.enum';

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
  private messengerContactService = inject(DataMessengerContactService);
  private pluginEvents = inject(PLUGIN_EVENT_STREAM);
  private cdr = inject(ChangeDetectorRef);
  public speechService = inject(PLUGIN_SPEECH_SERVICE);
  private voiceModeService = inject(PLUGIN_VOICE_SERVICE);
  private groupSelection = inject(PLUGIN_GROUP_SELECTION);
  private toast = inject(PLUGIN_TOAST_SERVICE);
  private translate = inject(TranslateService);
  private injector = inject(Injector);

  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

  messages = signal<Message[]>([]);
  isLoading = signal(false);
  selectedContact = signal<string | null>(null);
  selectedClientId = signal<string | null>(null);
  clientMessengerContacts = signal<MessengerContact[]>([]);
  selectedDirection = signal<MessageDirection | undefined>(undefined);
  selectedScope = signal<MessageScope | undefined>(undefined);
  selectedProviderIds = signal<string[]>([]);
  showAll = signal<boolean>(false);
  hasMore = signal<boolean>(false);

  availableProviders = signal<MessagingProvider[]>([]);
  broadcastPreview = signal<BroadcastPreview | null>(null);
  broadcastLoading = signal<boolean>(false);
  selectedIdNumbers = signal<number[] | null>(null);
  multiClientPreview = signal<BroadcastPreview | null>(null);
  multiClientLoading = signal<boolean>(false);

  private sendTargetMatches = computed<{ provider: MessagingProvider; contact: MessengerContact }[]>(() => {
    const contacts = this.clientMessengerContacts();
    if (!contacts.length) return [];

    const selectedIds = this.selectedProviderIds();
    const candidates = selectedIds.length > 0
      ? this.availableProviders().filter(p => selectedIds.includes(p.id))
      : this.availableProviders();

    return candidates
      .map(provider => ({
        provider,
        contact: contacts.find(c => c.type === messengerTypeFromProviderType(provider.providerType)),
      }))
      .filter((m): m is { provider: MessagingProvider; contact: MessengerContact } => !!m.contact);
  });
  private resolvedSendTarget = computed<{ provider: MessagingProvider; contact: MessengerContact } | null>(() => {
    const matches = this.sendTargetMatches();
    return matches.length === 1 ? matches[0] : null;
  });
  selectedProvider = computed<string | null>(() => this.resolvedSendTarget()?.provider.displayName ?? null);

  selectedGroupId = this.groupSelection.selectedGroupId;
  isBroadcastMode = computed<boolean>(() => !!this.selectedGroupId() && !this.selectedContact());
  broadcastEligible = computed<number>(() => {
    const p = this.broadcastPreview();
    return p ? p.withMessengerContact + p.withPhoneFallback : 0;
  });
  canBroadcast = computed<boolean>(() => this.isBroadcastMode() && this.broadcastEligible() > 0);
  isMultiClientMode = computed<boolean>(() =>
    !!this.selectedIdNumbers()?.length && !this.selectedContact() && !this.isBroadcastMode()
  );
  multiClientEligible = computed<number>(() => {
    const p = this.multiClientPreview();
    return p ? p.withMessengerContact + p.withPhoneFallback : 0;
  });
  canMultiClientSend = computed<boolean>(() => this.isMultiClientMode() && this.multiClientEligible() > 0);

  private groupEffectRef: EffectRef | null = null;

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
    this.loadAvailableProviders();
    this.subscribeToIncomingMessages();
    this.subscribeToGroupSelection();
  }

  private loadAvailableProviders(): void {
    this.dataService.getProviders()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe({
        next: (providers) => {
          this.availableProviders.set(providers.filter(p => p.isEnabled));
          this.cdr.markForCheck();
        },
      });
  }

  private subscribeToGroupSelection(): void {
    runInInjectionContext(this.injector, () => {
      this.groupEffectRef = effect(() => {
        const groupId = this.selectedGroupId();
        if (groupId && !this.selectedContact()) {
          this.loadBroadcastPreview(groupId);
        } else {
          this.broadcastPreview.set(null);
        }
        this.cdr.markForCheck();
      });
    });
  }

  private loadBroadcastPreview(groupId: string): void {
    const provider = this.singleSelectedProvider();
    if (!provider) {
      this.broadcastPreview.set(null);
      return;
    }
    this.broadcastLoading.set(true);
    this.dataService.previewBroadcast(provider.name, groupId)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe({
        next: (preview) => {
          this.broadcastPreview.set(preview);
          this.broadcastLoading.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.broadcastPreview.set(null);
          this.broadcastLoading.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  private loadMultiClientPreview(idNumbers: number[]): void {
    const provider = this.singleSelectedProvider();
    if (!provider) {
      this.multiClientPreview.set(null);
      return;
    }
    this.multiClientLoading.set(true);
    this.dataService.previewBroadcastToIdNumbers(provider.name, idNumbers)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe({
        next: (preview) => {
          this.multiClientPreview.set(preview);
          this.multiClientLoading.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.multiClientPreview.set(null);
          this.multiClientLoading.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  private sendBroadcastToIdNumbers(): void {
    const idNumbers = this.selectedIdNumbers();
    const provider = this.singleSelectedProvider();
    if (!idNumbers?.length || !provider || !this.inputText.trim()) return;

    const eligible = this.multiClientEligible();
    if (eligible === 0) return;

    if (eligible >= 2) {
      const confirmed = window.confirm(
        this.translate.instant('messaging.chat.broadcast-confirm', { count: eligible })
      );
      if (!confirmed) return;
    }

    const content = this.inputText.trim();
    this.inputText = '';
    this.multiClientLoading.set(true);

    this.dataService.sendBroadcastToIdNumbers(provider.name, idNumbers, content)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe({
        next: (result) => {
          this.multiClientLoading.set(false);
          this.toast.showSuccess(
            this.translate.instant('messaging.chat.broadcast-result', {
              sent: result.sent,
              failed: result.failed,
              skipped: result.skippedNoContact,
            }),
            this.translate.instant('messaging.chat.broadcast-result-title')
          );
          this.loadMessages();
        },
        error: () => {
          this.multiClientLoading.set(false);
          this.toast.showError(this.translate.instant('messaging.chat.broadcast-error'));
          this.cdr.markForCheck();
        },
      });
  }

  private singleSelectedProvider(): { id: string; name: string } | null {
    const ids = this.selectedProviderIds();
    if (ids.length === 1) {
      const match = this.availableProviders().find(p => p.id === ids[0]);
      return match ? { id: match.id, name: match.name } : { id: ids[0], name: this.selectedProvider() ?? ids[0] };
    }

    if (ids.length === 0 && this.availableProviders().length === 1) {
      const only = this.availableProviders()[0];
      return { id: only.id, name: only.name };
    }

    return null;
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    if (this.groupEffectRef) {
      this.groupEffectRef.destroy();
      this.groupEffectRef = null;
    }
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
    const scope = this.selectedScope();
    const sender = this.selectedContact() ?? undefined;
    const pageSize = this.showAll() ? this.showAllPageSize : this.defaultPageSize;

    this.dataService.getMessages(providerId, direction, sender, scope, pageSize, 0)
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
    if (this.isMultiClientMode()) {
      this.sendBroadcastToIdNumbers();
      return;
    }

    if (this.isBroadcastMode()) {
      this.sendBroadcast();
      return;
    }

    if (!this.selectedContact() || !this.inputText.trim()) {
      return;
    }

    const target = this.resolvedSendTarget();
    if (!target) {
      this.toast.showError(this.translate.instant(
        this.sendTargetMatches().length > 1
          ? 'messaging.chat.provider-required'
          : 'messaging.chat.no-provider-contact'
      ));
      return;
    }

    const content = this.inputText.trim();
    this.inputText = '';

    this.dataService.sendMessage({
      provider: target.provider.name,
      recipient: target.contact.value,
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

  private sendBroadcast(): void {
    const groupId = this.selectedGroupId();
    const provider = this.singleSelectedProvider();
    const preview = this.broadcastPreview();
    if (!groupId || !provider || !preview || !this.inputText.trim()) {
      return;
    }

    const eligible = this.broadcastEligible();
    if (eligible === 0) {
      return;
    }

    if (eligible >= 2) {
      const confirmed = window.confirm(
        this.translate.instant('messaging.chat.broadcast-confirm', { count: eligible })
      );
      if (!confirmed) return;
    }

    const content = this.inputText.trim();
    this.inputText = '';
    this.broadcastLoading.set(true);

    this.dataService.sendBroadcast(provider.name, groupId, content)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe({
        next: (result) => {
          this.broadcastLoading.set(false);
          this.toast.showSuccess(
            this.translate.instant('messaging.chat.broadcast-result', {
              sent: result.sent,
              failed: result.failed,
              skipped: result.skippedNoContact,
            }),
            this.translate.instant('messaging.chat.broadcast-result-title')
          );
          this.loadMessages();
        },
        error: () => {
          this.broadcastLoading.set(false);
          this.toast.showError(this.translate.instant('messaging.chat.broadcast-error'));
          this.cdr.markForCheck();
        },
      });
  }

  setMultiClientMode(idNumbers: number[]): void {
    this.selectedContact.set(null);
    this.selectedClientId.set(null);
    this.clientMessengerContacts.set([]);
    this.selectedIdNumbers.set(idNumbers);
    this.multiClientPreview.set(null);
    this.loadMultiClientPreview(idNumbers);
    this.loadMessages();
  }

  selectClient(displayName: string, clientId: string): void {
    this.selectedContact.set(displayName);
    this.selectedClientId.set(clientId);
    this.clientMessengerContacts.set([]);
    this.messengerContactService.getByClient(clientId)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe({
        next: (contacts) => {
          this.clientMessengerContacts.set(contacts);
          this.cdr.markForCheck();
        },
        error: () => {
          this.cdr.markForCheck();
        },
      });
    this.loadMessages();
  }

  clearContact(): void {
    this.selectedContact.set(null);
    this.selectedClientId.set(null);
    this.clientMessengerContacts.set([]);
    this.selectedIdNumbers.set(null);
    this.multiClientPreview.set(null);
    this.loadMessages();
  }

  applyFilter(filter: { direction?: MessageDirection; scope?: MessageScope; providerIds?: string[]; showAll?: boolean }): void {
    this.selectedDirection.set(filter.direction);
    this.selectedScope.set(filter.scope);
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
