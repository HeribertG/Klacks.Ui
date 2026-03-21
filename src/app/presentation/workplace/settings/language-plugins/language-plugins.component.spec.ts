// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { LanguagePluginsComponent } from './language-plugins.component';
import { DataLanguagePluginService } from 'src/app/infrastructure/api/settings/data-language-plugin.service';
import { LanguageConfigService } from 'src/app/application/services/language-config.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { LanguagePluginInfo } from 'src/app/domain/models/settings/language-plugin';

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
    instant: vi.fn().mockReturnValue('Translated text'),
    get: vi.fn().mockReturnValue(of('Translated text')),
    onTranslationChange: of(),
    onLangChange: of(),
    onDefaultLangChange: of(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDataService.getPlugins.mockReturnValue(of(mockPlugins));

    TestBed.configureTestingModule({
      providers: [
        { provide: DataLanguagePluginService, useValue: mockDataService },
        { provide: LanguageConfigService, useValue: mockLanguageConfigService },
        { provide: ToastShowService, useValue: mockToastService },
        { provide: TranslateService, useValue: mockTranslateService },
      ],
    });

    component = TestBed.runInInjectionContext(() => new LanguagePluginsComponent());
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
    expect(mockToastService.showSuccess).toHaveBeenCalledWith('settings.language-plugins.success.uninstall', 'Success');
  });

  it('should show error toast when uninstall fails', async () => {
    mockDataService.uninstall.mockReturnValue(throwError(() => new Error('Uninstall error')));
    const plugin = { ...mockPlugins[1], isInstalled: true };

    await component.onUninstall(plugin);

    expect(mockToastService.showError).toHaveBeenCalledWith('settings.language-plugins.error.uninstall');
  });
});
