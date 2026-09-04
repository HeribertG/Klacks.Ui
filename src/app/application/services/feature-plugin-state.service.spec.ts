// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { FeaturePluginStateService } from './feature-plugin-state.service';
import { DataFeaturePluginService } from 'src/app/infrastructure/api/plugins/data-feature-plugin.service';
import { FeaturePluginInfo } from 'src/app/domain/models/plugins/feature-plugin-info';

const MESSAGING_PLUGIN: FeaturePluginInfo = {
  name: 'messaging',
  displayName: 'Messaging',
  category: 'communication',
  version: '1.0.0',
  author: 'Klacks',
  description: 'Messaging plugin',
  minKlacksVersion: '1.0.0',
  isInstalled: true,
  isEnabled: true,
  isOperational: true,
  providedSkills: [],
};

describe('FeaturePluginStateService', () => {
  let service: FeaturePluginStateService;
  let dataServiceSpy: { getPlugins: ReturnType<typeof vi.fn> };

  const setup = (): void => {
    TestBed.configureTestingModule({
      providers: [
        FeaturePluginStateService,
        { provide: DataFeaturePluginService, useValue: dataServiceSpy },
      ],
    });
    service = TestBed.inject(FeaturePluginStateService);
  };

  beforeEach(() => {
    dataServiceSpy = { getPlugins: vi.fn() };
  });

  it('resolves isPluginEnabled to false and does not propagate the error when the backend answers 404', async () => {
    dataServiceSpy.getPlugins.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404 }))
    );
    setup();

    await expect(service.ensureLoaded()).resolves.toBeUndefined();

    expect(service.isPluginEnabled('messaging')).toBe(false);
    expect(service.plugins()).toEqual([]);
  });

  it('resolves isPluginEnabled to true when the plugin is installed and enabled', async () => {
    dataServiceSpy.getPlugins.mockReturnValue(of([MESSAGING_PLUGIN]));
    setup();

    await service.ensureLoaded();

    expect(service.isPluginEnabled('messaging')).toBe(true);
  });

  it('returns false for a plugin that is installed but not enabled', async () => {
    dataServiceSpy.getPlugins.mockReturnValue(of([{ ...MESSAGING_PLUGIN, isEnabled: false }]));
    setup();

    await service.ensureLoaded();

    expect(service.isPluginEnabled('messaging')).toBe(false);
  });

  it('returns false for a plugin that is not known at all', async () => {
    dataServiceSpy.getPlugins.mockReturnValue(of([]));
    setup();

    await service.ensureLoaded();

    expect(service.isPluginEnabled('messaging')).toBe(false);
  });

  it('caches the result and calls the backend only once across repeated ensureLoaded calls', async () => {
    dataServiceSpy.getPlugins.mockReturnValue(of([MESSAGING_PLUGIN]));
    setup();

    await service.ensureLoaded();
    await service.ensureLoaded();
    await service.ensureLoaded();

    expect(dataServiceSpy.getPlugins).toHaveBeenCalledTimes(1);
  });

  it('refresh() forces a new backend call and updates the cached state', async () => {
    dataServiceSpy.getPlugins.mockReturnValueOnce(of([MESSAGING_PLUGIN]));
    setup();
    await service.ensureLoaded();
    expect(service.isPluginEnabled('messaging')).toBe(true);

    dataServiceSpy.getPlugins.mockReturnValueOnce(of([{ ...MESSAGING_PLUGIN, isEnabled: false }]));
    await service.refresh();

    expect(dataServiceSpy.getPlugins).toHaveBeenCalledTimes(2);
    expect(service.isPluginEnabled('messaging')).toBe(false);
  });

  it('coalesces concurrent ensureLoaded calls into a single backend request', async () => {
    dataServiceSpy.getPlugins.mockReturnValue(of([MESSAGING_PLUGIN]));
    setup();

    await Promise.all([service.ensureLoaded(), service.ensureLoaded(), service.ensureLoaded()]);

    expect(dataServiceSpy.getPlugins).toHaveBeenCalledTimes(1);
  });
});
