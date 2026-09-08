// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SetupConsultationOfferService } from './setup-consultation-offer.service';
import { OnboardingService } from './onboarding.service';
import { AsideService } from 'src/app/presentation/aside/aside.service';
import { ConversationOrchestratorService } from 'src/app/presentation/aside/assistant-chat/services/conversation-orchestrator.service';
import { TranslateService } from '@ngx-translate/core';

describe('SetupConsultationOfferService', () => {
  let service: SetupConsultationOfferService;
  let addMessage: ReturnType<typeof vi.fn>;
  let show: ReturnType<typeof vi.fn>;
  let tourActive: ReturnType<typeof signal<boolean>>;

  beforeEach(() => {
    addMessage = vi.fn();
    show = vi.fn();
    tourActive = signal(false);
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        SetupConsultationOfferService,
        { provide: ConversationOrchestratorService, useValue: { addMessage } },
        { provide: AsideService, useValue: { show } },
        { provide: OnboardingService, useValue: { isTourActive: tourActive } },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
      ],
    });
    service = TestBed.inject(SetupConsultationOfferService);
  });

  it('offers once and posts a message carrying the trigger phrase as chip value', () => {
    service.offerIfNeeded();

    expect(show).toHaveBeenCalledTimes(1);
    expect(addMessage).toHaveBeenCalledTimes(1);
    const message = addMessage.mock.calls[0][0];
    expect(message.sender).toBe('assistant');
    expect(message.suggestedReplies.selectionMode).toBe('single');
    expect(message.suggestedReplies.options[0].value).toBe('setupConsultation.triggerPhrase');
  });

  it('does not offer a second time in the same session', () => {
    service.offerIfNeeded();
    service.offerIfNeeded();

    expect(addMessage).toHaveBeenCalledTimes(1);
  });

  it('stays silent while the guided tour is running', () => {
    tourActive.set(true);

    service.offerIfNeeded();

    expect(addMessage).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
  });

  it('offers after the tour ended', () => {
    tourActive.set(true);
    service.offerIfNeeded();
    expect(addMessage).not.toHaveBeenCalled();

    tourActive.set(false);
    service.offerIfNeeded();

    expect(addMessage).toHaveBeenCalledTimes(1);
  });
});
