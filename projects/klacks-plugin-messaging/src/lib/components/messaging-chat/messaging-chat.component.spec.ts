// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Unit tests for MessagingChatComponent, focused on the broadcast/multi-client
 * mode routing (isBroadcastMode/isMultiClientMode/canBroadcast/canMultiClientSend),
 * the three-way sendMessage dispatch and the message-list filter parameters.
 * The real template is overridden with an empty stub so no fa-icon/translate
 * pipe instances are created, keeping the test focused on the component class.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of, Subject } from 'rxjs';
import { signal } from '@angular/core';
import {
  PLUGIN_EVENT_STREAM,
  PLUGIN_VOICE_SERVICE,
  PLUGIN_SPEECH_SERVICE,
  PLUGIN_GROUP_SELECTION,
  PLUGIN_TOAST_SERVICE,
} from 'klacks-plugin-contracts';
import { MessagingChatComponent } from './messaging-chat.component';
import { DataMessagingService } from '../../services/data-messaging.service';
import { MessagingProvider } from '../../models/messaging-provider.model';
import { MessageDirection } from '../../enums/message-direction.enum';

function makeProvider(id: string, name: string): MessagingProvider {
  return {
    id,
    name,
    displayName: name,
    providerType: 'Telegram',
    isEnabled: true,
    createdAt: '',
    updatedAt: '',
  };
}

describe('MessagingChatComponent', () => {
  let dataServiceSpy: {
    getProviders: ReturnType<typeof vi.fn>;
    getMessages: ReturnType<typeof vi.fn>;
    previewBroadcast: ReturnType<typeof vi.fn>;
    previewBroadcastToIdNumbers: ReturnType<typeof vi.fn>;
    sendMessage: ReturnType<typeof vi.fn>;
    sendBroadcast: ReturnType<typeof vi.fn>;
    sendBroadcastToIdNumbers: ReturnType<typeof vi.fn>;
  };
  let toastSpy: { showSuccess: ReturnType<typeof vi.fn>; showError: ReturnType<typeof vi.fn> };
  let groupSelectionSpy: { selectedGroupId: ReturnType<typeof signal<string | null>>; clearSelection: ReturnType<typeof vi.fn> };

  function createComponent(): MessagingChatComponent {
    const fixture = TestBed.createComponent(MessagingChatComponent);
    return fixture.componentInstance;
  }

  beforeEach(() => {
    dataServiceSpy = {
      getProviders: vi.fn().mockReturnValue(of([])),
      getMessages: vi.fn().mockReturnValue(of([])),
      previewBroadcast: vi.fn().mockReturnValue(of(null)),
      previewBroadcastToIdNumbers: vi.fn().mockReturnValue(of(null)),
      sendMessage: vi.fn().mockReturnValue(of({ success: true })),
      sendBroadcast: vi.fn().mockReturnValue(of({ broadcastId: 'b-1', total: 1, sent: 1, failed: 0, skippedNoContact: 0 })),
      sendBroadcastToIdNumbers: vi.fn().mockReturnValue(of({ broadcastId: 'b-2', total: 1, sent: 1, failed: 0, skippedNoContact: 0 })),
    };
    toastSpy = { showSuccess: vi.fn(), showError: vi.fn() };
    groupSelectionSpy = { selectedGroupId: signal<string | null>(null), clearSelection: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: DataMessagingService, useValue: dataServiceSpy },
        { provide: PLUGIN_EVENT_STREAM, useValue: new Subject<unknown>().asObservable() },
        {
          provide: PLUGIN_VOICE_SERVICE,
          useValue: {
            voiceModeEnabled: false,
            isListening: false,
            isTranscribing: false,
            initialize: vi.fn(),
            toggleVoiceMode: vi.fn(),
            disableVoiceMode: vi.fn(),
            isUsingWhisper: vi.fn().mockReturnValue(false),
          },
        },
        {
          provide: PLUGIN_SPEECH_SERVICE,
          useValue: { isListening: false, isTranscribing: () => false, isSupported$: () => true },
        },
        { provide: PLUGIN_GROUP_SELECTION, useValue: groupSelectionSpy },
        { provide: PLUGIN_TOAST_SERVICE, useValue: toastSpy },
        {
          provide: TranslateService,
          useValue: {
            instant: (key: string) => key,
            get: (key: string) => of(key),
            onTranslationChange: of(),
            onLangChange: of(),
            onDefaultLangChange: of(),
          },
        },
      ],
    }).overrideComponent(MessagingChatComponent, {
      set: { template: '<div></div>', imports: [] },
    });
    vi.spyOn(window, 'confirm');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is not in broadcast mode without a selected group', () => {
    const component = createComponent();

    expect(component.isBroadcastMode()).toBe(false);
  });

  it('enters broadcast mode when a group is selected and no contact is chosen', () => {
    groupSelectionSpy.selectedGroupId.set('group-1');
    const component = createComponent();

    expect(component.isBroadcastMode()).toBe(true);
  });

  it('leaves broadcast mode once a contact is selected even with a group active', () => {
    groupSelectionSpy.selectedGroupId.set('group-1');
    const component = createComponent();
    component.selectedContact.set('alice');

    expect(component.isBroadcastMode()).toBe(false);
  });

  it('canBroadcast is true only once the preview reports eligible recipients', () => {
    groupSelectionSpy.selectedGroupId.set('group-1');
    const component = createComponent();

    expect(component.canBroadcast()).toBe(false);

    component.broadcastPreview.set({
      total: 3,
      withMessengerContact: 1,
      withPhoneFallback: 1,
      skipped: 1,
      providerSupportsPhoneFallback: true,
    });

    expect(component.broadcastEligible()).toBe(2);
    expect(component.canBroadcast()).toBe(true);
  });

  it('enters multi-client mode when id numbers are set without a contact or broadcast group', () => {
    const component = createComponent();

    component.selectedIdNumbers.set([1, 2]);

    expect(component.isMultiClientMode()).toBe(true);
  });

  it('canMultiClientSend requires eligible recipients in the multi-client preview', () => {
    const component = createComponent();
    component.selectedIdNumbers.set([1, 2]);

    expect(component.canMultiClientSend()).toBe(false);

    component.multiClientPreview.set({
      total: 2,
      withMessengerContact: 2,
      withPhoneFallback: 0,
      skipped: 0,
      providerSupportsPhoneFallback: false,
    });

    expect(component.canMultiClientSend()).toBe(true);
  });

  it('sends a direct message to the selected contact and clears the input', () => {
    const component = createComponent();
    component.selectedContact.set('alice');
    component.selectedProvider.set('telegram-main');
    component.inputText = '  hello  ';

    component.sendMessage();

    expect(dataServiceSpy.sendMessage).toHaveBeenCalledWith({
      provider: 'telegram-main',
      recipient: 'alice',
      content: 'hello',
      contentType: 'text',
    });
    expect(component.inputText).toBe('');
  });

  it('does nothing when sending without a selected contact or text', () => {
    const component = createComponent();

    component.sendMessage();

    expect(dataServiceSpy.sendMessage).not.toHaveBeenCalled();
  });

  it('routes to the broadcast send when in broadcast mode with eligible recipients', () => {
    groupSelectionSpy.selectedGroupId.set('group-1');
    const component = createComponent();
    component.availableProviders.set([makeProvider('p-1', 'telegram-main')]);
    component.broadcastPreview.set({
      total: 1,
      withMessengerContact: 1,
      withPhoneFallback: 0,
      skipped: 0,
      providerSupportsPhoneFallback: true,
    });
    component.inputText = 'broadcast text';

    component.sendMessage();

    expect(dataServiceSpy.sendBroadcast).toHaveBeenCalledWith('telegram-main', 'group-1', 'broadcast text');
    expect(dataServiceSpy.sendMessage).not.toHaveBeenCalled();
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('asks for confirmation before broadcasting to two or more eligible recipients', () => {
    (window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(false);
    groupSelectionSpy.selectedGroupId.set('group-1');
    const component = createComponent();
    component.availableProviders.set([makeProvider('p-1', 'telegram-main')]);
    component.broadcastPreview.set({
      total: 2,
      withMessengerContact: 2,
      withPhoneFallback: 0,
      skipped: 0,
      providerSupportsPhoneFallback: true,
    });
    component.inputText = 'broadcast text';

    component.sendMessage();

    expect(window.confirm).toHaveBeenCalled();
    expect(dataServiceSpy.sendBroadcast).not.toHaveBeenCalled();
  });

  it('routes to the multi-client send when id numbers are active with eligible recipients', () => {
    const component = createComponent();
    component.availableProviders.set([makeProvider('p-1', 'telegram-main')]);
    component.selectedIdNumbers.set([10, 11]);
    component.multiClientPreview.set({
      total: 1,
      withMessengerContact: 1,
      withPhoneFallback: 0,
      skipped: 0,
      providerSupportsPhoneFallback: true,
    });
    component.inputText = 'hi group';

    component.sendMessage();

    expect(dataServiceSpy.sendBroadcastToIdNumbers).toHaveBeenCalledWith('telegram-main', [10, 11], 'hi group');
  });

  it('builds getMessages params from the active filter, capping the page size unless showAll is set', () => {
    const component = createComponent();

    component.applyFilter({ direction: MessageDirection.Outbound, providerIds: ['p-1'], showAll: false });

    expect(dataServiceSpy.getMessages).toHaveBeenCalledWith('p-1', MessageDirection.Outbound, undefined, 50, 0);
  });

  it('requests the full page size when showAll is enabled', () => {
    const component = createComponent();

    component.applyFilter({ showAll: true });

    expect(dataServiceSpy.getMessages).toHaveBeenCalledWith(undefined, undefined, undefined, 10000, 0);
  });

  it('sends the message on Enter without shift', () => {
    const component = createComponent();
    component.selectedContact.set('alice');
    component.inputText = 'hi';
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    const preventDefault = vi.spyOn(event, 'preventDefault');

    component.onInputKeyPress(event);

    expect(preventDefault).toHaveBeenCalled();
    expect(dataServiceSpy.sendMessage).toHaveBeenCalled();
  });

  it('does not send the message on shift+Enter', () => {
    const component = createComponent();
    component.selectedContact.set('alice');
    component.inputText = 'hi';
    const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });

    component.onInputKeyPress(event);

    expect(dataServiceSpy.sendMessage).not.toHaveBeenCalled();
  });

  it('maps message direction to its CSS class', () => {
    const component = createComponent();

    expect(component.getDirectionClass(MessageDirection.Inbound)).toBe('inbound');
    expect(component.getDirectionClass(MessageDirection.Outbound)).toBe('outbound');
  });

  it('clearContact resets the contact, provider and multi-client selections and reloads messages', () => {
    const component = createComponent();
    component.selectedContact.set('alice');
    component.selectedProvider.set('telegram-main');
    component.selectedIdNumbers.set([1]);
    dataServiceSpy.getMessages.mockClear();

    component.clearContact();

    expect(component.selectedContact()).toBeNull();
    expect(component.selectedProvider()).toBeNull();
    expect(component.selectedIdNumbers()).toBeNull();
    expect(dataServiceSpy.getMessages).toHaveBeenCalled();
  });

  it('setMultiClientMode clears the contact and loads the multi-client preview plus messages', () => {
    const component = createComponent();

    component.setMultiClientMode([5, 6]);

    expect(component.selectedContact()).toBeNull();
    expect(component.selectedIdNumbers()).toEqual([5, 6]);
    expect(dataServiceSpy.getMessages).toHaveBeenCalled();
  });
});
