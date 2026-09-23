// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Unit tests for FeaturePluginsComponent's Klacksy commissioning offer hook: the offer must fire
 * only when a manifest declares assistantSetup, the plugin is not yet operational, and the plugin
 * was installed or just turned on - never on uninstall, disable, or an already-operational plugin.
 * Plugin state always starts empty and is filled by the mocked refresh(), so a test only passes if
 * the component reads the freshly reloaded list rather than a plugin object handed in by the caller.
 */

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FeaturePluginsComponent } from './feature-plugins.component';
import { DataFeaturePluginService } from 'src/app/infrastructure/api/plugins/data-feature-plugin.service';
import { FeaturePluginStateService } from 'src/app/application/services/feature-plugin-state.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { PluginSetupAssistantOfferService } from 'src/app/application/services/plugin-setup-assistant-offer.service';
import { FeaturePluginInfo } from 'src/app/domain/models/plugins/feature-plugin-info';

const ASSISTANT_SETUP = {
  offerKey: 'messaging.setup-assistant.offer',
  acceptKey: 'messaging.setup-assistant.accept',
  declineKey: 'messaging.setup-assistant.decline',
  triggerPhraseKey: 'messaging.setup-assistant.trigger',
};

const MESSAGING_PLUGIN: FeaturePluginInfo = {
  name: 'messaging',
  displayName: 'Messaging',
  category: 'Communication',
  version: '1.0.0',
  author: 'Klacks',
  description: '',
  minKlacksVersion: '1.0.0',
  isInstalled: true,
  isEnabled: true,
  isOperational: false,
  providedSkills: [],
  assistantSetup: ASSISTANT_SETUP,
};

const PLAIN_PLUGIN: FeaturePluginInfo = {
  name: 'plain',
  displayName: 'Plain',
  category: 'Other',
  version: '1.0.0',
  author: 'Klacks',
  description: '',
  minKlacksVersion: '1.0.0',
  isInstalled: true,
  isEnabled: true,
  isOperational: false,
  providedSkills: [],
};

describe('FeaturePluginsComponent - assistant setup offer', () => {
  let dataServiceSpy: {
    getPlugins: ReturnType<typeof vi.fn>;
    enable: ReturnType<typeof vi.fn>;
    disable: ReturnType<typeof vi.fn>;
  };
  let pluginsSignal: ReturnType<typeof signal<FeaturePluginInfo[]>>;
  let pluginStateSpy: { refresh: ReturnType<typeof vi.fn>; plugins: ReturnType<typeof signal<FeaturePluginInfo[]>> };
  let offerSetupHelp: ReturnType<typeof vi.fn>;
  let reloadLang: ReturnType<typeof vi.fn>;
  let modalRef: { close: ReturnType<typeof vi.fn> };
  let modalOpen: ReturnType<typeof vi.fn>;

  function createComponent(): FeaturePluginsComponent {
    const fixture = TestBed.createComponent(FeaturePluginsComponent);
    return fixture.componentInstance;
  }

  function refreshFillsListWith(...plugins: FeaturePluginInfo[]): void {
    pluginStateSpy.refresh.mockImplementation(async () => {
      pluginsSignal.set(plugins);
    });
  }

  beforeEach(() => {
    dataServiceSpy = {
      getPlugins: vi.fn().mockReturnValue(of([])),
      enable: vi.fn().mockReturnValue(of(undefined)),
      disable: vi.fn().mockReturnValue(of(undefined)),
    };
    pluginsSignal = signal<FeaturePluginInfo[]>([]);
    pluginStateSpy = { refresh: vi.fn().mockResolvedValue(undefined), plugins: pluginsSignal };
    offerSetupHelp = vi.fn();
    reloadLang = vi.fn(() => of({}));
    modalRef = { close: vi.fn() };
    modalOpen = vi.fn().mockReturnValue(modalRef);

    TestBed.configureTestingModule({
      providers: [
        { provide: DataFeaturePluginService, useValue: dataServiceSpy },
        { provide: FeaturePluginStateService, useValue: pluginStateSpy },
        { provide: ToastShowService, useValue: { showError: vi.fn(), showSuccess: vi.fn() } },
        { provide: PluginSetupAssistantOfferService, useValue: { offerSetupHelp } },
        { provide: NgbModal, useValue: { open: modalOpen } },
        {
          provide: TranslateService,
          useValue: { instant: (key: string) => key, currentLang: 'en', reloadLang, use: vi.fn() },
        },
      ],
    });
  });

  it('offers commissioning help using the freshly refreshed list, only after translations are reloaded', async () => {
    refreshFillsListWith(MESSAGING_PLUGIN);
    const component = createComponent();
    expect(pluginStateSpy.plugins()).toEqual([]);

    await component.onMarketplaceInstalled('messaging');

    expect(offerSetupHelp).toHaveBeenCalledWith(ASSISTANT_SETUP, 'plugin-setup:messaging');
    const refreshOrder = pluginStateSpy.refresh.mock.invocationCallOrder[0];
    const reloadLangOrder = reloadLang.mock.invocationCallOrder[0];
    const offerOrder = offerSetupHelp.mock.invocationCallOrder[0];
    expect(refreshOrder).toBeLessThan(offerOrder);
    expect(reloadLangOrder).toBeLessThan(offerOrder);
  });

  it('closes the marketplace modal before showing the offer, so the toast is not hidden behind the modal backdrop', async () => {
    refreshFillsListWith(MESSAGING_PLUGIN);
    const component = createComponent();
    // Simulates the modal having been opened: openMarketplaceModal() itself only assigns this field
    // from modalService.open(...), which is exercised in a live browser via NgbModal, not renderable
    // here without a full template render (the modal's #marketplaceModal is a required viewChild).
    (component as unknown as { marketplaceModalRef: unknown }).marketplaceModalRef = modalRef;

    await component.onMarketplaceInstalled('messaging');

    expect(modalRef.close).toHaveBeenCalledTimes(1);
    const closeOrder = modalRef.close.mock.invocationCallOrder[0];
    const offerOrder = offerSetupHelp.mock.invocationCallOrder[0];
    expect(closeOrder).toBeLessThan(offerOrder);
  });

  it('does not throw when installing without a marketplace modal reference set', async () => {
    refreshFillsListWith(MESSAGING_PLUGIN);
    const component = createComponent();

    await expect(component.onMarketplaceInstalled('messaging')).resolves.toBeUndefined();

    expect(offerSetupHelp).toHaveBeenCalledWith(ASSISTANT_SETUP, 'plugin-setup:messaging');
  });

  it('does not offer after installing a plugin without assistantSetup', async () => {
    refreshFillsListWith(PLAIN_PLUGIN);
    const component = createComponent();

    await component.onMarketplaceInstalled('plain');

    expect(offerSetupHelp).not.toHaveBeenCalled();
  });

  it('does not offer after installing an already operational plugin', async () => {
    refreshFillsListWith({ ...MESSAGING_PLUGIN, isOperational: true });
    const component = createComponent();

    await component.onMarketplaceInstalled('messaging');

    expect(offerSetupHelp).not.toHaveBeenCalled();
  });

  it('offers commissioning help when toggling on, using the freshly refreshed list even though the caller-passed plugin has no assistantSetup', async () => {
    refreshFillsListWith(MESSAGING_PLUGIN);
    const component = createComponent();
    const staleArgument: FeaturePluginInfo = { ...MESSAGING_PLUGIN, assistantSetup: undefined, isEnabled: false };

    await component.onToggleEnabled(staleArgument);

    expect(offerSetupHelp).toHaveBeenCalledWith(ASSISTANT_SETUP, 'plugin-setup:messaging');
  });

  it('does not offer when toggling a plugin off', async () => {
    refreshFillsListWith(MESSAGING_PLUGIN);
    const component = createComponent();

    await component.onToggleEnabled({ ...MESSAGING_PLUGIN, isEnabled: true });

    expect(offerSetupHelp).not.toHaveBeenCalled();
  });

  it('does not offer when toggling on an already operational plugin', async () => {
    refreshFillsListWith({ ...MESSAGING_PLUGIN, isOperational: true });
    const component = createComponent();

    await component.onToggleEnabled({ ...MESSAGING_PLUGIN, isOperational: true, isEnabled: false });

    expect(offerSetupHelp).not.toHaveBeenCalled();
  });

  it('does not offer help when the toggle itself fails, and still shows the failure toast', async () => {
    refreshFillsListWith(MESSAGING_PLUGIN);
    dataServiceSpy.enable.mockReturnValue(throwError(() => new Error('boom')));
    const toastSpy = TestBed.inject(ToastShowService) as unknown as { showError: ReturnType<typeof vi.fn> };
    const component = createComponent();

    await component.onToggleEnabled({ ...MESSAGING_PLUGIN, isEnabled: false });

    expect(offerSetupHelp).not.toHaveBeenCalled();
    expect(toastSpy.showError).toHaveBeenCalledWith('settings.feature-plugins.error.toggle');
  });
});
