// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { SetupConsultationOfferService } from './setup-consultation-offer.service';
import { OnboardingService } from './onboarding.service';
import { AsideService } from 'src/app/presentation/aside/aside.service';
import { ConversationOrchestratorService } from 'src/app/presentation/aside/assistant-chat/services/conversation-orchestrator.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { TranslateService } from '@ngx-translate/core';
import { ISuggestedRepliesConfig } from 'src/app/domain/models/assistant/suggested-reply.interface';
import { DataScheduleSetupStateService } from 'src/app/infrastructure/api/assistant/data-schedule-setup-state.service';
import { IScheduleSetupState } from 'src/app/domain/interfaces/schedule-setup-state.interface';

const EMPTY_INSTALLATION_STATE: IScheduleSetupState = {
  hasOrders: false,
  hasShifts: false,
  hasWork: false,
  hasCustomers: false,
  hasGroups: false,
};

describe('SetupConsultationOfferService', () => {
  let service: SetupConsultationOfferService;
  let showInteractiveReply: ReturnType<typeof vi.fn>;
  let submitText: ReturnType<typeof vi.fn>;
  let show: ReturnType<typeof vi.fn>;
  let getState: ReturnType<typeof vi.fn>;
  let tourActive: ReturnType<typeof signal<boolean>>;

  const flushMountDelay = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  beforeEach(() => {
    showInteractiveReply = vi.fn();
    submitText = vi.fn().mockResolvedValue(undefined);
    show = vi.fn();
    getState = vi.fn().mockReturnValue(of(EMPTY_INSTALLATION_STATE));
    tourActive = signal(false);
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        SetupConsultationOfferService,
        { provide: ToastShowService, useValue: { showInteractiveReply } },
        { provide: ConversationOrchestratorService, useValue: { submitText } },
        { provide: AsideService, useValue: { show } },
        { provide: OnboardingService, useValue: { isTourActive: tourActive } },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
        { provide: DataScheduleSetupStateService, useValue: { getState } },
      ],
    });
    service = TestBed.inject(SetupConsultationOfferService);
  });

  function capturedConfig(): ISuggestedRepliesConfig {
    return showInteractiveReply.mock.calls[0][0];
  }

  function capturedCallback(): (values: string[]) => void {
    return showInteractiveReply.mock.calls[0][1];
  }

  it('offers once as an interactive toast carrying the trigger phrase as chip value', () => {
    service.offerIfNeeded();

    expect(showInteractiveReply).toHaveBeenCalledTimes(1);
    const config = capturedConfig();
    expect(config.selectionMode).toBe('single');
    expect(config.prompt).toBe('setupConsultation.offer');
    expect(config.options[0].value).toBe('setupConsultation.triggerPhrase');
  });

  it('does not open the Klacksy panel just to show the offer', () => {
    service.offerIfNeeded();

    expect(show).not.toHaveBeenCalled();
  });

  it('does not offer a second time in the same session', () => {
    service.offerIfNeeded();
    service.offerIfNeeded();

    expect(showInteractiveReply).toHaveBeenCalledTimes(1);
  });

  it('stays silent while the guided tour is running', () => {
    tourActive.set(true);

    service.offerIfNeeded();

    expect(showInteractiveReply).not.toHaveBeenCalled();
  });

  it('offers after the tour ended', () => {
    tourActive.set(true);
    service.offerIfNeeded();
    expect(showInteractiveReply).not.toHaveBeenCalled();

    tourActive.set(false);
    service.offerIfNeeded();

    expect(showInteractiveReply).toHaveBeenCalledTimes(1);
  });

  it('opens the panel and submits the trigger phrase when the accept chip is chosen', async () => {
    service.offerIfNeeded();
    const callback = capturedCallback();

    callback(['setupConsultation.triggerPhrase']);
    await flushMountDelay();

    expect(show).toHaveBeenCalledTimes(1);
    expect(submitText).toHaveBeenCalledWith('setupConsultation.triggerPhrase');
  });

  it('sends nothing when the decline chip is chosen', async () => {
    service.offerIfNeeded();
    const callback = capturedCallback();

    callback(['none']);
    await flushMountDelay();

    expect(show).not.toHaveBeenCalled();
    expect(submitText).not.toHaveBeenCalled();
  });

  it('offers when the installation is completely empty', () => {
    getState.mockReturnValue(of(EMPTY_INSTALLATION_STATE));

    service.offerIfNeeded();

    expect(showInteractiveReply).toHaveBeenCalledTimes(1);
  });

  it('does not offer when shifts already exist', () => {
    getState.mockReturnValue(of({ ...EMPTY_INSTALLATION_STATE, hasShifts: true }));

    service.offerIfNeeded();

    expect(showInteractiveReply).not.toHaveBeenCalled();
  });

  it('does not offer when work already exists', () => {
    getState.mockReturnValue(of({ ...EMPTY_INSTALLATION_STATE, hasWork: true }));

    service.offerIfNeeded();

    expect(showInteractiveReply).not.toHaveBeenCalled();
  });

  it('does not offer when orders already exist', () => {
    getState.mockReturnValue(of({ ...EMPTY_INSTALLATION_STATE, hasOrders: true }));

    service.offerIfNeeded();

    expect(showInteractiveReply).not.toHaveBeenCalled();
  });

  it('shows no offer and keeps the session flag unset when the setup-state request fails', () => {
    getState.mockReturnValue(throwError(() => new Error('network error')));

    service.offerIfNeeded();

    expect(showInteractiveReply).not.toHaveBeenCalled();

    getState.mockReturnValue(of(EMPTY_INSTALLATION_STATE));
    service.offerIfNeeded();

    expect(getState).toHaveBeenCalledTimes(2);
    expect(showInteractiveReply).toHaveBeenCalledTimes(1);
  });

  it('does not call the setup-state API while the guided tour is running', () => {
    tourActive.set(true);

    service.offerIfNeeded();

    expect(getState).not.toHaveBeenCalled();
  });

  it('does not call the setup-state API a second time in the same session', () => {
    service.offerIfNeeded();
    service.offerIfNeeded();

    expect(getState).toHaveBeenCalledTimes(1);
  });
});
