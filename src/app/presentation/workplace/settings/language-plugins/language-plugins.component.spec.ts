// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { LanguagePluginsComponent } from './language-plugins.component';
import { DataLanguagePluginService } from 'src/app/infrastructure/api/settings/data-language-plugin.service';
import { LanguageConfigService } from 'src/app/application/services/language-config.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { LanguagePluginInfo } from 'src/app/domain/models/settings/language-plugin';
import { KnowledgeIndexSyncStatus } from 'src/app/domain/models/settings/knowledge-index-sync-status';
import { LANGUAGE_PLUGINS } from './language-plugins.constants';

const POLL_MS = LANGUAGE_PLUGINS.INDEX_SYNC_POLL_INTERVAL_MS;
const INDEX_REBUILD_HINT_KEY = 'settings.language-plugins.index-rebuild-hint';

const syncStatus = (overrides: Partial<KnowledgeIndexSyncStatus> = {}): KnowledgeIndexSyncStatus => ({
  isRunning: false,
  isPending: false,
  lastCompletedUtc: null,
  lastFailedUtc: null,
  lastReason: null,
  lastError: null,
  ...overrides,
});

const IDLE = syncStatus();
const RUNNING = syncStatus({ isRunning: true });
const PENDING = syncStatus({ isPending: true });

describe('LanguagePluginsComponent', () => {
  let component: LanguagePluginsComponent;

  const mockPlugins: LanguagePluginInfo[] = [
    {
      code: 'de',
      name: 'German',
      displayName: 'Deutsch',
      speechLocale: 'de-CH',
      version: '1.0.0',
      author: '',
      coverage: 100,
      isInstalled: true,
      isCore: true,
      translationCount: 0,
    },
    {
      code: 'es',
      name: 'Spanish',
      displayName: 'Español',
      speechLocale: 'es-ES',
      version: '1.0.0',
      author: 'Klacks Community',
      coverage: 15,
      isInstalled: false,
      isCore: false,
      translationCount: 80,
    },
  ];

  const mockDataService = {
    getPlugins: vi.fn().mockReturnValue(of(mockPlugins)),
    install: vi.fn().mockReturnValue(of(void 0)),
    uninstall: vi.fn().mockReturnValue(of(void 0)),
    getTranslations: vi.fn().mockReturnValue(of({})),
    getKnowledgeIndexSyncStatus: vi.fn().mockReturnValue(of(IDLE)),
  };

  const mockLanguageConfigService = {
    reloadConfig: vi.fn().mockResolvedValue(undefined),
    CORE_LANGUAGES: ['de', 'en', 'fr', 'it'],
    supportedLanguages$: vi.fn(),
    fallbackOrder$: vi.fn(),
    metadata$: vi.fn(),
    loaded$: vi.fn(),
  };

  const mockToastService = {
    showSuccess: vi.fn(),
    showError: vi.fn(),
  };

  const mockTranslateService = {
    instant: vi.fn().mockImplementation((key: string) => key),
    get: vi.fn().mockReturnValue(of('Translated text')),
    onTranslationChange: of(),
    onLangChange: of(),
    onDefaultLangChange: of(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockDataService.getPlugins.mockReturnValue(of(mockPlugins));
    mockDataService.uninstall.mockReturnValue(of(void 0));
    mockDataService.getKnowledgeIndexSyncStatus.mockReset();
    mockDataService.getKnowledgeIndexSyncStatus.mockReturnValue(of(IDLE));

    TestBed.configureTestingModule({
      providers: [
        { provide: DataLanguagePluginService, useValue: mockDataService },
        { provide: LanguageConfigService, useValue: mockLanguageConfigService },
        { provide: ToastShowService, useValue: mockToastService },
        { provide: TranslateService, useValue: mockTranslateService },
        { provide: ChangeDetectorRef, useValue: { markForCheck: vi.fn(), detectChanges: vi.fn() } },
      ],
    });

    component = TestBed.runInInjectionContext(() => new LanguagePluginsComponent());
  });

  afterEach(() => {
    component.ngOnDestroy();
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load plugins on init', () => {
    // Arrange & Act
    component.ngOnInit();

    // Assert
    expect(mockDataService.getPlugins).toHaveBeenCalled();
    expect(component.allPlugins).toEqual(mockPlugins);
    expect(component.plugins).toEqual([mockPlugins[0]]);
  });

  it('should show error toast when loading fails', () => {
    mockDataService.getPlugins.mockReturnValue(throwError(() => new Error('Network error')));

    component.ngOnInit();

    expect(mockToastService.showError).toHaveBeenCalledWith('settings.language-plugins.error.load');
  });

  it('should reload plugins and config on marketplace install', () => {
    // Arrange
    mockDataService.getPlugins.mockReturnValue(of(mockPlugins));

    // Act
    component.onMarketplaceInstalled('es');

    // Assert
    expect(mockDataService.getPlugins).toHaveBeenCalled();
    expect(mockLanguageConfigService.reloadConfig).toHaveBeenCalled();
  });

  it('should uninstall plugin and reload config', async () => {
    mockDataService.uninstall.mockReturnValue(of(void 0));
    const plugin = { ...mockPlugins[1], isInstalled: true };

    await component.onUninstall(plugin);

    expect(mockDataService.uninstall).toHaveBeenCalledWith('es');
    expect(plugin.isInstalled).toBe(false);
    expect(mockLanguageConfigService.reloadConfig).toHaveBeenCalled();
    expect(mockToastService.showSuccess).toHaveBeenCalledWith(
      `settings.language-plugins.success.uninstall\n${INDEX_REBUILD_HINT_KEY}`,
      'TOAST_SUCCESS',
    );
  });

  it('should show error toast when uninstall fails', async () => {
    mockDataService.uninstall.mockReturnValue(throwError(() => new Error('Uninstall error')));
    const plugin = { ...mockPlugins[1], isInstalled: true };

    await component.onUninstall(plugin);

    expect(mockToastService.showError).toHaveBeenCalledWith('settings.language-plugins.error.uninstall');
  });

  describe('knowledge index rebuild polling', () => {
    it('should fetch the status once on init and stop when the index is idle', async () => {
      // Arrange & Act
      component.ngOnInit();
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(POLL_MS * 3);

      // Assert
      expect(mockDataService.getKnowledgeIndexSyncStatus).toHaveBeenCalledTimes(1);
      expect(component.isIndexRebuilding()).toBe(false);
    });

    it('should show the indicator on init when a rebuild is already running', async () => {
      // Arrange
      mockDataService.getKnowledgeIndexSyncStatus.mockReturnValue(of(RUNNING));

      // Act
      component.ngOnInit();
      await vi.advanceTimersByTimeAsync(0);

      // Assert
      expect(component.isIndexRebuilding()).toBe(true);
    });

    it('should keep polling while the index is running or pending and stop once it is idle', async () => {
      // Arrange
      mockDataService.getKnowledgeIndexSyncStatus
        .mockReturnValueOnce(of(RUNNING))
        .mockReturnValueOnce(of(PENDING))
        .mockReturnValue(of(IDLE));
      component.ngOnInit();

      // Act & Assert
      await vi.advanceTimersByTimeAsync(0);
      expect(mockDataService.getKnowledgeIndexSyncStatus).toHaveBeenCalledTimes(1);
      expect(component.isIndexRebuilding()).toBe(true);

      await vi.advanceTimersByTimeAsync(POLL_MS);
      expect(mockDataService.getKnowledgeIndexSyncStatus).toHaveBeenCalledTimes(2);
      expect(component.isIndexRebuilding()).toBe(true);

      await vi.advanceTimersByTimeAsync(POLL_MS);
      expect(mockDataService.getKnowledgeIndexSyncStatus).toHaveBeenCalledTimes(3);
      expect(component.isIndexRebuilding()).toBe(false);

      await vi.advanceTimersByTimeAsync(POLL_MS * 3);
      expect(mockDataService.getKnowledgeIndexSyncStatus).toHaveBeenCalledTimes(3);
    });

    it('should start polling after a successful uninstall', async () => {
      // Arrange
      component.ngOnInit();
      await vi.advanceTimersByTimeAsync(0);
      mockDataService.getKnowledgeIndexSyncStatus.mockClear();
      mockDataService.getKnowledgeIndexSyncStatus.mockReturnValueOnce(of(RUNNING)).mockReturnValue(of(IDLE));
      const plugin = { ...mockPlugins[1], isInstalled: true };

      // Act
      await component.onUninstall(plugin);

      // Assert
      expect(component.isIndexRebuilding()).toBe(true);

      await vi.advanceTimersByTimeAsync(0);
      expect(mockDataService.getKnowledgeIndexSyncStatus).toHaveBeenCalledTimes(1);
      expect(component.isIndexRebuilding()).toBe(true);

      await vi.advanceTimersByTimeAsync(POLL_MS);
      expect(mockDataService.getKnowledgeIndexSyncStatus).toHaveBeenCalledTimes(2);
      expect(component.isIndexRebuilding()).toBe(false);
    });

    it('should not start polling when the uninstall fails', async () => {
      // Arrange
      component.ngOnInit();
      await vi.advanceTimersByTimeAsync(0);
      mockDataService.getKnowledgeIndexSyncStatus.mockClear();
      mockDataService.uninstall.mockReturnValue(throwError(() => new Error('Uninstall error')));
      const plugin = { ...mockPlugins[1], isInstalled: true };

      // Act
      await component.onUninstall(plugin);
      await vi.advanceTimersByTimeAsync(POLL_MS * 2);

      // Assert
      expect(component.isIndexRebuilding()).toBe(false);
      expect(mockDataService.getKnowledgeIndexSyncStatus).not.toHaveBeenCalled();
    });

    it('should start polling after a marketplace install', async () => {
      // Arrange
      component.ngOnInit();
      await vi.advanceTimersByTimeAsync(0);
      mockDataService.getKnowledgeIndexSyncStatus.mockClear();
      mockDataService.getKnowledgeIndexSyncStatus.mockReturnValueOnce(of(PENDING)).mockReturnValue(of(IDLE));

      // Act
      component.onMarketplaceInstalled('es');

      // Assert
      expect(component.isIndexRebuilding()).toBe(true);

      await vi.advanceTimersByTimeAsync(0);
      expect(mockDataService.getKnowledgeIndexSyncStatus).toHaveBeenCalledTimes(1);
      expect(component.isIndexRebuilding()).toBe(true);

      await vi.advanceTimersByTimeAsync(POLL_MS);
      expect(mockDataService.getKnowledgeIndexSyncStatus).toHaveBeenCalledTimes(2);
      expect(component.isIndexRebuilding()).toBe(false);
    });

    it('should stop polling on destroy', async () => {
      // Arrange
      mockDataService.getKnowledgeIndexSyncStatus.mockReturnValue(of(RUNNING));
      component.ngOnInit();
      await vi.advanceTimersByTimeAsync(0);

      // Act
      component.ngOnDestroy();
      await vi.advanceTimersByTimeAsync(POLL_MS * 3);

      // Assert
      expect(mockDataService.getKnowledgeIndexSyncStatus).toHaveBeenCalledTimes(1);
    });

    it('should stop quietly when the status request fails while no rebuild is known', async () => {
      // Arrange
      mockDataService.getKnowledgeIndexSyncStatus.mockReturnValue(throwError(() => new Error('Status error')));

      // Act
      component.ngOnInit();
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(POLL_MS * 3);

      // Assert
      expect(mockDataService.getKnowledgeIndexSyncStatus).toHaveBeenCalledTimes(1);
      expect(component.isIndexRebuilding()).toBe(false);
      expect(mockToastService.showError).not.toHaveBeenCalled();
    });

    it('should keep polling through a transient failure during a rebuild', async () => {
      // Arrange
      component.ngOnInit();
      await vi.advanceTimersByTimeAsync(0);
      mockDataService.getKnowledgeIndexSyncStatus.mockClear();
      mockDataService.getKnowledgeIndexSyncStatus
        .mockReturnValueOnce(of(RUNNING))
        .mockReturnValueOnce(throwError(() => new Error('Status error')))
        .mockReturnValue(of(IDLE));

      // Act
      component.onMarketplaceInstalled('es');
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(POLL_MS);

      // Assert
      expect(mockDataService.getKnowledgeIndexSyncStatus).toHaveBeenCalledTimes(2);
      expect(component.isIndexRebuilding()).toBe(true);
      expect(mockToastService.showError).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(POLL_MS);
      expect(mockDataService.getKnowledgeIndexSyncStatus).toHaveBeenCalledTimes(3);
      expect(component.isIndexRebuilding()).toBe(false);
    });
  });
});
