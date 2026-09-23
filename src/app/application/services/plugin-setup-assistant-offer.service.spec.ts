// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { IPluginAssistantSetupOffer } from 'klacks-plugin-contracts';
import { PluginSetupAssistantOfferService } from './plugin-setup-assistant-offer.service';
import { OnboardingService } from './onboarding.service';
import { AsideService } from 'src/app/presentation/aside/aside.service';
import { ConversationOrchestratorService } from 'src/app/presentation/aside/assistant-chat/services/conversation-orchestrator.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { TranslateService } from '@ngx-translate/core';
import { ISuggestedRepliesConfig } from 'src/app/domain/models/assistant/suggested-reply.interface';

// Deliberately not sharing a prefix and not following any offer/accept/decline naming scheme -
// proves the service uses exactly the keys it is given, deriving nothing.
const SETUP: IPluginAssistantSetupOffer = {
  offerKey: 'messaging.setup-assistant.offer',
  acceptKey: 'commissioning.yes-please',
  declineKey: 'commissioning.not-now',
  triggerPhraseKey: 'messaging.setup-assistant.trigger',
};

describe('PluginSetupAssistantOfferService', () => {
  let service: PluginSetupAssistantOfferService;
  let showInteractiveReply: ReturnType<typeof vi.fn>;
  let submitText: ReturnType<typeof vi.fn>;
  let show: ReturnType<typeof vi.fn>;
  let tourActive: ReturnType<typeof signal<boolean>>;

  const flushMountDelay = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  beforeEach(() => {
    showInteractiveReply = vi.fn();
    submitText = vi.fn().mockResolvedValue(undefined);
    show = vi.fn();
    tourActive = signal(false);
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        PluginSetupAssistantOfferService,
        { provide: ToastShowService, useValue: { showInteractiveReply } },
        { provide: ConversationOrchestratorService, useValue: { submitText } },
        { provide: AsideService, useValue: { show } },
        { provide: OnboardingService, useValue: { isTourActive: tourActive } },
        { provide: TranslateService, useValue: { instant: (key: string) => 'tr:' + key } },
      ],
    });
    service = TestBed.inject(PluginSetupAssistantOfferService);
  });

  function capturedConfig(): ISuggestedRepliesConfig {
    return showInteractiveReply.mock.calls[0][0];
  }

  function capturedCallback(): (values: string[]) => void {
    return showInteractiveReply.mock.calls[0][1];
  }

  it('offers as an interactive toast using exactly the given offer/accept/decline/trigger keys, translated', () => {
    service.offerSetupHelp(SETUP, 'plugin-setup:messaging');

    expect(showInteractiveReply).toHaveBeenCalledTimes(1);
    const config = capturedConfig();
    expect(config.selectionMode).toBe('single');
    expect(config.prompt).toBe('tr:messaging.setup-assistant.offer');
    expect(config.options[0]).toEqual({ label: 'tr:commissioning.yes-please', value: 'tr:messaging.setup-assistant.trigger' });
    expect(config.options[1].label).toBe('tr:commissioning.not-now');
  });

  it('does not offer a second time in the same session for the same key', () => {
    service.offerSetupHelp(SETUP, 'plugin-setup:messaging');
    service.offerSetupHelp(SETUP, 'plugin-setup:messaging');

    expect(showInteractiveReply).toHaveBeenCalledTimes(1);
  });

  it('offers independently for a different once-per-session key', () => {
    service.offerSetupHelp(SETUP, 'plugin-setup:messaging');
    service.offerSetupHelp(SETUP, 'messaging-setup:my-bot');

    expect(showInteractiveReply).toHaveBeenCalledTimes(2);
  });

  it('stays silent while the guided tour is running', () => {
    tourActive.set(true);

    service.offerSetupHelp(SETUP, 'plugin-setup:messaging');

    expect(showInteractiveReply).not.toHaveBeenCalled();
  });

  it('opens the panel and submits the translated trigger phrase when the accept chip is chosen', async () => {
    service.offerSetupHelp(SETUP, 'plugin-setup:messaging');
    const callback = capturedCallback();

    callback(['tr:messaging.setup-assistant.trigger']);
    await flushMountDelay();

    expect(show).toHaveBeenCalledTimes(1);
    expect(submitText).toHaveBeenCalledWith('tr:messaging.setup-assistant.trigger');
  });

  it('sends nothing when the decline chip is chosen', async () => {
    service.offerSetupHelp(SETUP, 'plugin-setup:messaging');
    const callback = capturedCallback();

    callback(['none']);
    await flushMountDelay();

    expect(show).not.toHaveBeenCalled();
    expect(submitText).not.toHaveBeenCalled();
  });
});
