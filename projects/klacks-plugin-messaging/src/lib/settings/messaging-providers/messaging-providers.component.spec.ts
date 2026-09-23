// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Unit tests for MessagingProvidersComponent's Klacksy commissioning offer after a successful save:
 * fetch the setup diagnosis, and offer help only when the saved provider's nextStep needs action.
 * A diagnosis HTTP error must stay silent - saving itself already succeeded.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { of, throwError } from 'rxjs';
import { PLUGIN_TOAST_SERVICE, PLUGIN_MANUAL_LOADER, PLUGIN_ASSISTANT_LAUNCHER } from 'klacks-plugin-contracts';
import { MessagingProvidersComponent } from './messaging-providers.component';
import { DataMessagingService } from '../../services/data-messaging.service';
import { MessagingProvider } from '../../models/messaging-provider.model';
import { CreateMessagingProvider } from '../../models/create-messaging-provider.model';
import { MessagingSetupReport } from '../../models/messaging-setup-report.model';
import { SetupStepStatus } from '../../enums/setup-step-status.enum';

describe('MessagingProvidersComponent - assistant setup offer after save', () => {
  let dataServiceSpy: {
    getProviders: ReturnType<typeof vi.fn>;
    createProvider: ReturnType<typeof vi.fn>;
    updateProvider: ReturnType<typeof vi.fn>;
    getSetupDiagnosis: ReturnType<typeof vi.fn>;
  };
  let toastSpy: { showSuccess: ReturnType<typeof vi.fn>; showError: ReturnType<typeof vi.fn> };
  let offerSetupHelp: ReturnType<typeof vi.fn>;
  let modal: { close: ReturnType<typeof vi.fn> };

  const SAVED_PROVIDER: MessagingProvider = {
    id: 'p1',
    name: 'my-bot',
    displayName: 'My Bot',
    providerType: 'Telegram',
    isEnabled: true,
    createdAt: '',
    updatedAt: '',
  };

  const DTO: CreateMessagingProvider = {
    name: 'my-bot',
    displayName: 'My Bot',
    providerType: 'Telegram',
    isEnabled: true,
    configJson: '{}',
  };

  function createComponent(): MessagingProvidersComponent {
    const fixture = TestBed.createComponent(MessagingProvidersComponent);
    return fixture.componentInstance;
  }

  function report(nextStepStatus: SetupStepStatus | null): MessagingSetupReport {
    const nextStep = nextStepStatus === null ? null : { code: 'Credentials', status: nextStepStatus };
    return {
      pluginSteps: [],
      providers: [{ providerName: 'my-bot', providerType: 'Telegram', isEnabled: true, steps: [], nextStep }],
    };
  }

  beforeEach(() => {
    dataServiceSpy = {
      getProviders: vi.fn().mockReturnValue(of([])),
      createProvider: vi.fn().mockReturnValue(of(SAVED_PROVIDER)),
      updateProvider: vi.fn().mockReturnValue(of(SAVED_PROVIDER)),
      getSetupDiagnosis: vi.fn().mockReturnValue(of(report(null))),
    };
    toastSpy = { showSuccess: vi.fn(), showError: vi.fn() };
    offerSetupHelp = vi.fn();
    modal = { close: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: DataMessagingService, useValue: dataServiceSpy },
        { provide: PLUGIN_TOAST_SERVICE, useValue: toastSpy },
        { provide: PLUGIN_MANUAL_LOADER, useValue: { loadManual: vi.fn().mockReturnValue(of('')) } },
        { provide: PLUGIN_ASSISTANT_LAUNCHER, useValue: { offerSetupHelp } },
        { provide: NgbModal, useValue: { open: vi.fn() } },
        { provide: TranslateService, useValue: { instant: (key: string) => key, currentLang: 'en' } },
      ],
    });
  });

  it('offers commissioning help when the saved provider still needs action (Error)', async () => {
    dataServiceSpy.getSetupDiagnosis.mockReturnValue(of(report(SetupStepStatus.Error)));
    const component = createComponent();
    component.isNewProvider = true;

    await component.onSaved(DTO, modal);

    expect(offerSetupHelp).toHaveBeenCalledWith(
      {
        offerKey: 'messaging.setup-assistant.offer-after-save',
        acceptKey: 'messaging.setup-assistant.accept',
        declineKey: 'messaging.setup-assistant.decline',
        triggerPhraseKey: 'messaging.setup-assistant.trigger',
      },
      'messaging-setup:my-bot',
    );
  });

  it('offers commissioning help after an update, not just after a create', async () => {
    dataServiceSpy.getSetupDiagnosis.mockReturnValue(of(report(SetupStepStatus.Error)));
    const component = createComponent();
    component.isNewProvider = false;
    component.editingProvider = SAVED_PROVIDER;

    await component.onSaved(DTO, modal);

    expect(dataServiceSpy.updateProvider).toHaveBeenCalledWith(SAVED_PROVIDER.id, DTO);
    expect(offerSetupHelp).toHaveBeenCalledWith(
      {
        offerKey: 'messaging.setup-assistant.offer-after-save',
        acceptKey: 'messaging.setup-assistant.accept',
        declineKey: 'messaging.setup-assistant.decline',
        triggerPhraseKey: 'messaging.setup-assistant.trigger',
      },
      'messaging-setup:my-bot',
    );
  });

  it('offers commissioning help when the saved provider still needs action (ActionRequired)', async () => {
    dataServiceSpy.getSetupDiagnosis.mockReturnValue(of(report(SetupStepStatus.ActionRequired)));
    const component = createComponent();
    component.isNewProvider = true;

    await component.onSaved(DTO, modal);

    expect(offerSetupHelp).toHaveBeenCalledTimes(1);
  });

  it('does not offer when the saved provider has no next step', async () => {
    dataServiceSpy.getSetupDiagnosis.mockReturnValue(of(report(null)));
    const component = createComponent();
    component.isNewProvider = true;

    await component.onSaved(DTO, modal);

    expect(offerSetupHelp).not.toHaveBeenCalled();
  });

  it('does not offer and shows no toast when the diagnosis request fails', async () => {
    dataServiceSpy.getSetupDiagnosis.mockReturnValue(throwError(() => new Error('network error')));
    const component = createComponent();
    component.isNewProvider = true;

    await component.onSaved(DTO, modal);

    expect(offerSetupHelp).not.toHaveBeenCalled();
    expect(toastSpy.showError).not.toHaveBeenCalled();
    expect(toastSpy.showSuccess).toHaveBeenCalled();
  });

  it('does not fetch the diagnosis or offer help when the save itself fails', async () => {
    dataServiceSpy.createProvider.mockReturnValue(throwError(() => new Error('boom')));
    const component = createComponent();
    component.isNewProvider = true;

    await component.onSaved(DTO, modal);

    expect(dataServiceSpy.getSetupDiagnosis).not.toHaveBeenCalled();
    expect(offerSetupHelp).not.toHaveBeenCalled();
    expect(toastSpy.showError).toHaveBeenCalledWith('settings.messaging-providers.error.save');
  });
});
