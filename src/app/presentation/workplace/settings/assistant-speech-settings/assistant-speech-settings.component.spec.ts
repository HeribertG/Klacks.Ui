// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { WritableSignal, computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { AssistantSpeechSettingsComponent } from './assistant-speech-settings.component';
import { EditableDictionaryEntry } from './editable-dictionary-entry.type';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { DataSttService } from 'src/app/infrastructure/api/assistant/data-stt.service';
import { DataTtsService } from 'src/app/infrastructure/api/assistant/data-tts.service';
import { DataAssistantService } from 'src/app/infrastructure/api/assistant/data-assistant.service';
import { DataTranscriptionDictionaryService } from 'src/app/infrastructure/api/assistant/data-transcription-dictionary.service';
import { DataManagementAssistantProviderService } from 'src/app/domain/services/assistant/data-management-assistant-provider.service';
import { LocalSttEngineService } from 'src/app/domain/services/speech/local-stt-engine.service';
import { LocalSttPlugin } from 'src/app/domain/constants/local-stt-plugin.constants';
import { SttEngine } from 'src/app/domain/constants/speech-constants';
import { WhisperModelAliases } from 'src/app/domain/constants/whisper-model-aliases.constants';
import { WhisperOperationStatuses, WhisperOperationTypes } from 'src/app/domain/constants/whisper-operation.constants';
import { WhisperOperationInfo } from 'src/app/domain/models/assistant/whisper-operation-info.interface';
import { LocalSttStatusView } from 'src/app/domain/models/assistant/local-stt-status-view.interface';
import { ISpeechSettings } from 'src/app/domain/models/settings/speech-settings.interface';

function makeEntry(over: Partial<EditableDictionaryEntry> = {}): EditableDictionaryEntry {
  return {
    id: 'e1',
    correctTerm: 'Klacks',
    category: 'brand',
    phoneticVariants: ['klaks'],
    description: 'the product',
    language: 'de',
    ...over,
  };
}

// The component renders an ngx-slider whose ngOnDestroy crashes in jsdom, so it
// is instantiated directly in an injection context instead of via a fixture —
// the dictionary form() array only needs the injection context, not a view.
describe('AssistantSpeechSettingsComponent (dictionary Signal Forms array)', () => {
  let component: AssistantSpeechSettingsComponent;
  let mockDict: Partial<Record<keyof DataTranscriptionDictionaryService, ReturnType<typeof vi.fn>>>;

  beforeEach(() => {
    mockDict = {
      getAll: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn().mockResolvedValue(true),
      delete: vi.fn().mockResolvedValue(true),
    };

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        {
          provide: AppSettingsManagementService,
          useValue: {
            speechSettings: signal({ sttApiKeys: {}, ttsApiKeys: {} }),
            loadSettingsAsync: vi.fn().mockResolvedValue(undefined),
            saveImmediately: vi.fn().mockResolvedValue(undefined),
          },
        },
        { provide: ToastShowService, useValue: { showSuccess: vi.fn(), showError: vi.fn() } },
        { provide: DataSttService, useValue: { testConnection: vi.fn(), getCustomProviders: vi.fn().mockResolvedValue([]) } },
        { provide: DataTtsService, useValue: { getVoices: vi.fn().mockResolvedValue([]) } },
        {
          provide: DataAssistantService,
          useValue: { getModels: vi.fn(), checkSpeechModels: vi.fn() },
        },
        {
          provide: DataManagementAssistantProviderService,
          useValue: { loadProviders: vi.fn().mockResolvedValue([]) },
        },
        { provide: DataTranscriptionDictionaryService, useValue: mockDict },
        { provide: LocalSttEngineService, useValue: makeLocalSttFake() },
      ],
    });

    component = TestBed.runInInjectionContext(
      () => new AssistantSpeechSettingsComponent(),
    );
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('reflects a form edit in the model and preserves sibling fields', () => {
    component.dictionaryEntries.set([makeEntry()]);
    const form = component['dictForm'];
    form[0].correctTerm().value.set('Klacksy');

    const entry = component.dictionaryEntries()[0];
    // (a) model reflects the edit
    expect(entry.correctTerm).toBe('Klacksy');
    // (b) unbound sibling fields survive the immutable update
    expect(entry.id).toBe('e1');
    expect(entry.category).toBe('brand');
    expect(entry.phoneticVariants).toEqual(['klaks']);
    expect(entry.description).toBe('the product');
    expect(entry.language).toBe('de');
  });

  it('persists the edited row read by index on save', async () => {
    component.dictionaryEntries.set([makeEntry()]);
    const form = component['dictForm'];
    form[0].correctTerm().value.set('Klacksy');
    form[0].language().value.set('en');

    await component.updateDictionaryEntry(0);

    // (c) save payload carries the new values, read from the model by index
    expect(mockDict.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'e1', correctTerm: 'Klacksy', language: 'en' }),
    );
  });

  it('updates phonetic variants in the model by index without touching siblings', () => {
    component.dictionaryEntries.set([makeEntry()]);

    component.onVariantsChange(0, 'klaks, klax');

    const entry = component.dictionaryEntries()[0];
    expect(entry.phoneticVariants).toEqual(['klaks', 'klax']);
    expect(entry.correctTerm).toBe('Klacks');
  });

  it('supports variable-length removal via the model signal', async () => {
    component.dictionaryEntries.set([makeEntry({ id: 'e1' }), makeEntry({ id: 'e2' })]);

    await component.deleteDictionaryEntry('e1');

    const ids = component.dictionaryEntries().map((e) => e.id);
    expect(ids).toEqual(['e2']);
  });
});

const PLUGIN_ID = LocalSttPlugin.ProviderId;
const PLUGIN_ENGINE = `${SttEngine.CustomPrefix}${PLUGIN_ID}`;
const OTHER_CUSTOM_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_CUSTOM_ENGINE = `${SttEngine.CustomPrefix}${OTHER_CUSTOM_ID}`;
const DOCKER_ALIASES = [WhisperModelAliases.Parakeet, WhisperModelAliases.Small, WhisperModelAliases.LargeV3Turbo];

interface CustomProviderFixture {
  id: string;
  name: string;
  isEnabled: boolean;
}

function operationFixture(overrides: Partial<WhisperOperationInfo>): WhisperOperationInfo {
  return {
    id: 'op-1',
    operationType: WhisperOperationTypes.Install,
    status: WhisperOperationStatuses.Running,
    modelAlias: WhisperModelAliases.Parakeet,
    message: null,
    requestedAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    completedAt: null,
    ...overrides,
  };
}

function makeLocalSttFake() {
  const status = signal<object | null>({});
  const pollingSuspended = signal(false);
  const isInstalled = signal(false);
  const installedEngineName = signal('');
  const activeOperation = signal<WhisperOperationInfo | null>(null);
  const installActive = signal(false);
  const awaitingUpdater = signal(false);
  const waitingMinutes = signal(0);
  const otherOperationActive = signal(false);
  const failedInstall = signal<WhisperOperationInfo | null>(null);

  return {
    status,
    pollingSuspended,
    isInstalled,
    installedAlias: signal<string | null>(null),
    installedEngineName,
    activeOperation,
    installActive,
    uninstallActive: signal(false),
    awaitingUpdater,
    waitingMinutes,
    otherOperationActive,
    rejectionReason: signal(''),
    failedInstall,
    supportsWhisper: signal(true),
    supportedAliases: signal<string[]>(DOCKER_ALIASES),
    defaultAlias: signal<string>(WhisperModelAliases.Parakeet),
    defaultEngineName: signal('Parakeet'),
    actionsDisabled: signal(false),
    busy: signal(false),
    statusView: computed<LocalSttStatusView>(() => ({
      known: !!status(),
      unavailable: !status() || pollingSuspended(),
      installed: isInstalled(),
      engineName: installedEngineName(),
      activeOperation: activeOperation(),
      installActive: installActive(),
      awaitingUpdater: awaitingUpdater(),
      waitingMinutes: waitingMinutes(),
      otherOperationActive: otherOperationActive(),
      failedInstall: failedInstall(),
    })),
    attach: vi.fn().mockResolvedValue(undefined),
    detach: vi.fn(),
    refresh: vi.fn().mockResolvedValue(undefined),
    install: vi.fn().mockResolvedValue(undefined),
    discardRequest: vi.fn().mockResolvedValue(undefined),
  };
}

type LocalSttFake = ReturnType<typeof makeLocalSttFake>;

interface AppSettingsFake {
  speechSettings: WritableSignal<Partial<ISpeechSettings>>;
  loadSettingsAsync: ReturnType<typeof vi.fn>;
  saveImmediately: ReturnType<typeof vi.fn>;
}

function configureSpeechTestBed(
  localStt: LocalSttFake,
  speechSettings: WritableSignal<Partial<ISpeechSettings>>,
  customProviders: CustomProviderFixture[],
): AppSettingsFake {
  const appSettings: AppSettingsFake = {
    speechSettings,
    loadSettingsAsync: vi.fn().mockResolvedValue(undefined),
    saveImmediately: vi.fn().mockResolvedValue(undefined),
  };

  TestBed.configureTestingModule({
    teardown: { destroyAfterEach: false },
    imports: [TranslateModule.forRoot()],
    providers: [
      { provide: AppSettingsManagementService, useValue: appSettings },
      { provide: ToastShowService, useValue: { showSuccess: vi.fn(), showError: vi.fn() } },
      {
        provide: DataSttService,
        useValue: {
          testConnection: vi.fn().mockResolvedValue({ success: true }),
          getCustomProviders: vi.fn().mockResolvedValue(customProviders),
        },
      },
      { provide: DataTtsService, useValue: { getVoices: vi.fn().mockResolvedValue([]) } },
      { provide: DataAssistantService, useValue: { getModels: vi.fn().mockReturnValue(of([])), checkSpeechModels: vi.fn() } },
      { provide: DataManagementAssistantProviderService, useValue: { loadProviders: vi.fn().mockResolvedValue([]) } },
      { provide: DataTranscriptionDictionaryService, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
      { provide: LocalSttEngineService, useValue: localStt },
    ],
  });

  return appSettings;
}

describe('AssistantSpeechSettingsComponent (local speech recognition entry)', () => {
  let component: AssistantSpeechSettingsComponent;
  let localStt: LocalSttFake;
  let speechSettings: WritableSignal<Partial<ISpeechSettings>>;
  let appSettings: AppSettingsFake;

  const initialize = async (storedEngine: string, customProviders: CustomProviderFixture[] = []): Promise<void> => {
    speechSettings.set({ sttEngine: storedEngine, sttApiKeys: {}, ttsApiKeys: {} });
    appSettings = configureSpeechTestBed(localStt, speechSettings, customProviders);
    component = TestBed.runInInjectionContext(() => new AssistantSpeechSettingsComponent());
    await component.ngOnInit();
    TestBed.tick();
  };

  const serverPersists = (engine: string): void => {
    appSettings.loadSettingsAsync.mockImplementation(async () => {
      speechSettings.set({ sttEngine: engine, sttApiKeys: {}, ttsApiKeys: {} });
    });
  };

  beforeEach(() => {
    localStt = makeLocalSttFake();
    speechSettings = signal<Partial<ISpeechSettings>>({});
  });

  it('attaches to the shared engine service and detaches on destroy', async () => {
    await initialize(SttEngine.Browser);
    expect(localStt.attach).toHaveBeenCalled();
    component.ngOnDestroy();
    expect(localStt.detach).toHaveBeenCalled();
  });

  it('shows the fixed local entry when the plugin engine is stored', async () => {
    await initialize(PLUGIN_ENGINE);
    expect(component.sttSelection()).toBe(SttEngine.Local);
    expect(component.isLocalSelected()).toBe(true);
  });

  it('recognises a stored plugin engine regardless of GUID casing', async () => {
    await initialize(`${SttEngine.CustomPrefix}${PLUGIN_ID.toUpperCase()}`);
    expect(component.isLocalSelected()).toBe(true);
  });

  it('filters the plugin provider out of the custom providers', async () => {
    await initialize(SttEngine.Browser, [
      { id: PLUGIN_ID, name: 'Parakeet (self-hosted)', isEnabled: true },
      { id: OTHER_CUSTOM_ID, name: 'Own server', isEnabled: true },
    ]);
    expect(component.customSttProviders()).toEqual([{ value: OTHER_CUSTOM_ENGINE, label: 'Own server' }]);
  });

  it('does not treat the plugin engine as a custom server', async () => {
    await initialize(PLUGIN_ENGINE);
    expect(component.isCustomStt()).toBe(false);
    component.sttEngine = OTHER_CUSTOM_ENGINE;
    expect(component.isCustomStt()).toBe(true);
  });

  it('keeps the selection local and saves nothing while the engine is not installed', async () => {
    await initialize(SttEngine.Deepgram);
    const before = speechSettings();

    component.onSttSelectionChanged(SttEngine.Local);

    expect(component.isLocalSelected()).toBe(true);
    expect(component.sttEngine).toBe(SttEngine.Deepgram);
    expect(speechSettings()).toBe(before);
  });

  it('persists the plugin engine automatically once the install succeeds', async () => {
    await initialize(SttEngine.Browser);
    component.onSttSelectionChanged(SttEngine.Local);
    TestBed.tick();
    expect(speechSettings().sttEngine).toBe(SttEngine.Browser);

    localStt.isInstalled.set(true);
    TestBed.tick();

    expect(component.sttEngine).toBe(PLUGIN_ENGINE);
    expect(speechSettings().sttEngine).toBe(PLUGIN_ENGINE);
  });

  it('does not persist the plugin engine when the user switched away before the install finished', async () => {
    await initialize(SttEngine.Browser);
    component.onSttSelectionChanged(SttEngine.Local);
    component.onSttSelectionChanged(SttEngine.Deepgram);

    localStt.isInstalled.set(true);
    TestBed.tick();

    expect(speechSettings().sttEngine).toBe(SttEngine.Deepgram);
  });

  it('persists the plugin engine immediately when the local entry is chosen while installed', async () => {
    localStt.isInstalled.set(true);
    await initialize(SttEngine.Browser);

    component.onSttSelectionChanged(SttEngine.Local);

    expect(speechSettings().sttEngine).toBe(PLUGIN_ENGINE);
  });

  it('never persists the UI-only local value', async () => {
    localStt.isInstalled.set(true);
    await initialize(SttEngine.Browser);

    component.onSttSelectionChanged(SttEngine.Local);
    component.onSettingChanged();

    expect(speechSettings().sttEngine).not.toBe(SttEngine.Local);
  });

  it('stores another engine when it is chosen after the local entry', async () => {
    localStt.isInstalled.set(true);
    await initialize(PLUGIN_ENGINE);

    component.onSttSelectionChanged(SttEngine.GroqWhisper);

    expect(component.isLocalSelected()).toBe(false);
    expect(speechSettings().sttEngine).toBe(SttEngine.GroqWhisper);
  });

  it('shows the engine the backend persisted when the uninstall starts (the backend resets it at enqueue time)', async () => {
    localStt.isInstalled.set(true);
    await initialize(PLUGIN_ENGINE);
    serverPersists(SttEngine.Browser);

    localStt.uninstallActive.set(true);
    TestBed.tick();
    await vi.waitFor(() => expect(component.sttSelection()).toBe(SttEngine.Browser));

    expect(component.sttEngine).toBe(SttEngine.Browser);
    expect(appSettings.saveImmediately.mock.invocationCallOrder[0]).toBeLessThan(
      appSettings.loadSettingsAsync.mock.invocationCallOrder[1],
    );
  });

  it('does not write the browser engine itself when the uninstall starts', async () => {
    localStt.isInstalled.set(true);
    await initialize(PLUGIN_ENGINE);
    const before = speechSettings();

    localStt.uninstallActive.set(true);
    TestBed.tick();
    await vi.waitFor(() => expect(appSettings.loadSettingsAsync).toHaveBeenCalledTimes(2));

    expect(speechSettings()).toEqual(before);
    expect(component.sttSelection()).toBe(SttEngine.Local);
  });

  it('reloads again when the uninstall ends, so a failed or discarded uninstall keeps the persisted engine', async () => {
    localStt.isInstalled.set(true);
    await initialize(PLUGIN_ENGINE);
    serverPersists(SttEngine.Browser);

    localStt.uninstallActive.set(true);
    TestBed.tick();
    await vi.waitFor(() => expect(appSettings.loadSettingsAsync).toHaveBeenCalledTimes(2));

    localStt.uninstallActive.set(false);
    TestBed.tick();
    await vi.waitFor(() => expect(appSettings.loadSettingsAsync).toHaveBeenCalledTimes(3));

    expect(component.sttSelection()).toBe(SttEngine.Browser);
    expect(localStt.isInstalled()).toBe(true);
  });

  it('leaves another engine alone when the plugin is being uninstalled', async () => {
    await initialize(SttEngine.Deepgram);
    serverPersists(SttEngine.Deepgram);

    localStt.uninstallActive.set(true);
    TestBed.tick();
    await vi.waitFor(() => expect(appSettings.loadSettingsAsync).toHaveBeenCalledTimes(2));

    expect(component.sttSelection()).toBe(SttEngine.Deepgram);
  });

  it('does not reload when an uninstall is already running as the page opens', async () => {
    localStt.uninstallActive.set(true);
    await initialize(PLUGIN_ENGINE);

    expect(appSettings.loadSettingsAsync).toHaveBeenCalledTimes(1);
  });

  it('can switch to Parakeet only from an installed Whisper engine on an installation that supports it', async () => {
    await initialize(SttEngine.Browser);
    localStt.installedAlias.set(WhisperModelAliases.Small);
    expect(component.canSwitchToParakeet()).toBe(true);

    localStt.installedAlias.set(WhisperModelAliases.Parakeet);
    expect(component.canSwitchToParakeet()).toBe(false);

    localStt.installedAlias.set(WhisperModelAliases.Small);
    localStt.supportedAliases.set([WhisperModelAliases.Small]);
    expect(component.canSwitchToParakeet()).toBe(false);
  });

  it('installs Parakeet from the inline block', async () => {
    await initialize(SttEngine.Browser);
    await component.installOrRetry();
    expect(localStt.install).toHaveBeenCalledWith(WhisperModelAliases.Parakeet);
  });

  it('installs the installation default engine from the inline block when that is Whisper', async () => {
    await initialize(SttEngine.Browser);
    localStt.defaultAlias.set(WhisperModelAliases.LargeV3Turbo);
    await component.installOrRetry();
    expect(localStt.install).toHaveBeenCalledWith(WhisperModelAliases.LargeV3Turbo);
  });

  it('scrolls the plugin card into view', async () => {
    await initialize(SttEngine.Browser);
    const card = document.createElement('div');
    card.id = LocalSttPlugin.CardElementId;
    card.scrollIntoView = vi.fn();
    card.focus = vi.fn();
    document.body.appendChild(card);

    component.scrollToPluginCard();

    expect(card.scrollIntoView).toHaveBeenCalled();
    expect(card.focus).toHaveBeenCalledWith({ preventScroll: true });
    card.remove();
  });
});

describe('AssistantSpeechSettingsComponent (local speech recognition block)', () => {
  let fixture: ComponentFixture<AssistantSpeechSettingsComponent>;
  let localStt: LocalSttFake;

  const element = (): HTMLElement => fixture.nativeElement;
  const text = (): string => element().textContent ?? '';
  const has = (selector: string): boolean => !!element().querySelector(selector);

  const render = async (storedEngine: string): Promise<void> => {
    const speechSettings = signal<Partial<ISpeechSettings>>({ sttEngine: storedEngine, sttApiKeys: {}, ttsApiKeys: {} });
    configureSpeechTestBed(localStt, speechSettings, []);
    fixture = TestBed.createComponent(AssistantSpeechSettingsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(() => {
    localStt = makeLocalSttFake();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('explains an unknown plugin status and offers to try again', async () => {
    localStt.status.set(null);
    await render(PLUGIN_ENGINE);

    expect(has('#assistant-speech-local-stt')).toBe(true);
    expect(text()).toContain('setting.speech.whisper-plugin.status-unavailable');
    expect(has('#assistant-speech-local-install-btn')).toBe(false);

    element().querySelector<HTMLButtonElement>('.status-retry-btn')!.click();
    expect(localStt.refresh).toHaveBeenCalled();
  });

  it('keeps the shown status but flags it when polling was suspended', async () => {
    localStt.pollingSuspended.set(true);
    await render(PLUGIN_ENGINE);

    expect(text()).toContain('setting.speech.whisper-plugin.status-not-installed');
    expect(text()).toContain('setting.speech.whisper-plugin.status-unavailable');
  });

  it('announces status changes in a polite live region', async () => {
    await render(PLUGIN_ENGINE);
    const region = element().querySelector('#assistant-speech-local-stt [role="status"]');
    expect(region?.getAttribute('aria-live')).toBe('polite');
    expect(region?.textContent).toContain('setting.speech.whisper-plugin.status-not-installed');
  });

  it('stacks the status row and the button row of the installed Whisper state instead of placing them side by side', async () => {
    localStt.isInstalled.set(true);
    localStt.installedAlias.set(WhisperModelAliases.Small);
    localStt.installedEngineName.set('Whisper small');
    await render(PLUGIN_ENGINE);

    const rows = Array.from(element().querySelectorAll<HTMLElement>('#assistant-speech-local-stt .row-line'));
    expect(rows.length).toBe(2);
    rows.forEach((row) => expect(getComputedStyle(row).display).toBe('flex'));
  });

  it('renders no block while another engine is selected', async () => {
    await render(SttEngine.Browser);
    expect(has('#assistant-speech-local-stt')).toBe(false);
  });

  it('offers the not-installed entry in the dropdown', async () => {
    await render(SttEngine.Browser);
    expect(text()).toContain('setting.speech.stt-local-not-installed');
  });

  it('offers the installed entry naming the engine', async () => {
    localStt.isInstalled.set(true);
    localStt.installedAlias.set(WhisperModelAliases.Small);
    localStt.installedEngineName.set('Whisper small');
    await render(SttEngine.Browser);
    expect(text()).toContain('setting.speech.stt-local-installed');
    expect(text()).not.toContain('setting.speech.stt-local-not-installed');
  });

  it('shows status, language hint, requirements, licence and the install button when not installed', async () => {
    await render(PLUGIN_ENGINE);

    expect(has('#assistant-speech-local-stt')).toBe(true);
    expect(text()).toContain('setting.speech.whisper-plugin.status-not-installed');
    expect(text()).toContain('setting.speech.local-stt.languages');
    expect(text()).toContain('setting.speech.local-stt.requirements');
    expect(text()).toContain('setting.speech.local-stt.license');
    expect(has('#assistant-speech-local-install-btn')).toBe(true);
    expect(has('#assistant-speech-local-more-btn')).toBe(true);
  });

  it('hides the Whisper link on an installation that only runs Parakeet', async () => {
    localStt.supportsWhisper.set(false);
    localStt.supportedAliases.set([WhisperModelAliases.Parakeet]);
    await render(PLUGIN_ENGINE);
    expect(has('#assistant-speech-local-install-btn')).toBe(true);
    expect(has('#assistant-speech-local-more-btn')).toBe(false);
  });

  it('starts the Parakeet install from the block button', async () => {
    await render(PLUGIN_ENGINE);
    element().querySelector<HTMLButtonElement>('#assistant-speech-local-install-btn')!.click();
    expect(localStt.install).toHaveBeenCalledWith(WhisperModelAliases.Parakeet);
  });

  it('labels the block button with the default engine when that is Whisper', async () => {
    localStt.defaultAlias.set(WhisperModelAliases.LargeV3Turbo);
    localStt.defaultEngineName.set('Whisper large-v3-turbo');
    await render(PLUGIN_ENGINE);
    const button = element().querySelector<HTMLButtonElement>('#assistant-speech-local-install-btn')!;
    expect(button.textContent).toContain('setting.speech.local-stt.install-engine');
    expect(button.textContent).not.toContain('setting.speech.local-stt.install-parakeet');
    button.click();
    expect(localStt.install).toHaveBeenCalledWith(WhisperModelAliases.LargeV3Turbo);
  });

  it('retries a failed Whisper install with the Whisper engine the installation supports', async () => {
    localStt.failedInstall.set(
      operationFixture({ status: WhisperOperationStatuses.Failed, modelAlias: WhisperModelAliases.Small }),
    );
    await render(PLUGIN_ENGINE);
    element().querySelector<HTMLButtonElement>('#assistant-speech-local-install-btn')!.click();
    expect(localStt.install).toHaveBeenCalledWith(WhisperModelAliases.Small);
  });

  it('retries with Parakeet when the failed engine is not supported on this installation', async () => {
    localStt.supportedAliases.set([WhisperModelAliases.Parakeet]);
    localStt.failedInstall.set(
      operationFixture({ status: WhisperOperationStatuses.Failed, modelAlias: WhisperModelAliases.Small }),
    );
    await render(PLUGIN_ENGINE);
    element().querySelector<HTMLButtonElement>('#assistant-speech-local-install-btn')!.click();
    expect(localStt.install).toHaveBeenCalledWith(WhisperModelAliases.Parakeet);
  });

  it('shows the running install without an install button', async () => {
    localStt.activeOperation.set(operationFixture({}));
    localStt.installActive.set(true);
    await render(PLUGIN_ENGINE);

    expect(text()).toContain('setting.speech.whisper-plugin.status-installing');
    expect(text()).toContain('setting.speech.whisper-plugin.install-hint');
    expect(has('#assistant-speech-local-install-btn')).toBe(false);
    expect(has('#assistant-speech-local-discard-btn')).toBe(false);
  });

  it('offers to discard a request the updater never picked up', async () => {
    localStt.activeOperation.set(
      operationFixture({ id: 'op-stuck', status: WhisperOperationStatuses.Pending, startedAt: null }),
    );
    localStt.installActive.set(true);
    localStt.awaitingUpdater.set(true);
    localStt.waitingMinutes.set(20);
    await render(PLUGIN_ENGINE);

    expect(text()).toContain('setting.speech.whisper-plugin.status-awaiting-updater');
    expect(text()).toContain('setting.speech.whisper-plugin.awaiting-updater-hint');
    element().querySelector<HTMLButtonElement>('#assistant-speech-local-discard-btn')!.click();
    expect(localStt.discardRequest).toHaveBeenCalled();
  });

  it('shows the success status and the connection test when installed', async () => {
    localStt.isInstalled.set(true);
    localStt.installedAlias.set(WhisperModelAliases.Parakeet);
    localStt.installedEngineName.set('Parakeet');
    await render(PLUGIN_ENGINE);

    expect(has('#assistant-speech-local-status.status-text-success')).toBe(true);
    expect(has('#assistant-speech-local-test-btn')).toBe(true);
    expect(has('#assistant-speech-local-install-btn')).toBe(false);
    expect(has('#assistant-speech-local-switch-btn')).toBe(false);
  });

  it('points an installed Whisper engine to the card to switch to Parakeet', async () => {
    localStt.isInstalled.set(true);
    localStt.installedAlias.set(WhisperModelAliases.Small);
    localStt.installedEngineName.set('Whisper small');
    await render(PLUGIN_ENGINE);

    expect(has('#assistant-speech-local-switch-btn')).toBe(true);
    expect(text()).not.toContain('setting.speech.local-stt.languages');
  });

  it('shows a failed install with its message and a retry button', async () => {
    localStt.failedInstall.set(
      operationFixture({ id: 'op-failed', status: WhisperOperationStatuses.Failed, message: 'Download failed' }),
    );
    await render(PLUGIN_ENGINE);

    expect(has('#assistant-speech-local-status.status-text-error')).toBe(true);
    expect(text()).toContain('Download failed');
    expect(text()).toContain('setting.speech.local-stt.retry');
    expect(text()).not.toContain('setting.speech.local-stt.install-parakeet');
  });

  it('shows a refused request in the error style', async () => {
    localStt.rejectionReason.set('Whisper model is not supported on this installation.');
    await render(PLUGIN_ENGINE);
    expect(element().querySelector('p.status-text-error')?.textContent).toContain(
      'Whisper model is not supported on this installation.',
    );
  });

  it('hides the API key row while the local engine is selected', async () => {
    await render(PLUGIN_ENGINE);
    expect(has('#sttApiKey')).toBe(false);
    expect(has('#sttCustomServerTest')).toBe(false);
  });
});
