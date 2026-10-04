// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { FeaturePluginStateService } from './feature-plugin-state.service';
import { DataFeaturePluginService } from 'src/app/infrastructure/api/plugins/data-feature-plugin.service';
import { FeaturePluginInfo } from 'src/app/domain/models/plugins/feature-plugin-info';
import { AuthorizationService } from './authorization.service';
import { FLOOR_PLAN_PLUGIN_NAME, MESSAGING_PLUGIN_NAME } from 'src/app/domain/constants/feature-plugin.constants';
import { ROLE_ADMIN, ROLE_AUTHORISED } from 'src/app/domain/constants/permissions.constants';

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

const NAVIGATION = {
  icon: 'icon',
  route: '/workplace/messaging',
  labelKey: 'messaging.nav',
  position: 1,
  viewBox: '0 0 24 24',
  svgPaths: [],
};

const MESSAGING_WITH_NAV: FeaturePluginInfo = { ...MESSAGING_PLUGIN, navigation: NAVIGATION };
const FLOOR_PLAN_WITH_NAV: FeaturePluginInfo = {
  ...MESSAGING_PLUGIN,
  name: FLOOR_PLAN_PLUGIN_NAME,
  navigation: { ...NAVIGATION, route: '/workplace/floor-plan', position: 2 },
};

describe('FeaturePluginStateService', () => {
  let service: FeaturePluginStateService;
  let dataServiceSpy: { getPlugins: ReturnType<typeof vi.fn> };
  let rights: string[];
  const authorizationStub = {
    hasPermission: (permission: string): boolean => rights.includes(ROLE_ADMIN) || rights.includes(permission),
  };

  const setup = (): void => {
    TestBed.configureTestingModule({
      providers: [
        FeaturePluginStateService,
        { provide: DataFeaturePluginService, useValue: dataServiceSpy },
        { provide: AuthorizationService, useValue: authorizationStub },
      ],
    });
    service = TestBed.inject(FeaturePluginStateService);
  };

  beforeEach(() => {
    dataServiceSpy = { getPlugins: vi.fn() };
    rights = [ROLE_ADMIN];
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

  describe('pluginNavItems', () => {
    const navNames = (): string[] => service.pluginNavItems().map((item) => item.name);

    it('hides the messaging entry from a planner without a role, because its routes answer only Admin and Authorised', async () => {
      rights = ['CanViewClients', 'CanPlan'];
      dataServiceSpy.getPlugins.mockReturnValue(of([MESSAGING_WITH_NAV, FLOOR_PLAN_WITH_NAV]));
      setup();

      await service.ensureLoaded();

      expect(navNames()).toEqual([FLOOR_PLAN_PLUGIN_NAME]);
    });

    it('shows the messaging entry to a supervisor (Authorised)', async () => {
      rights = [ROLE_AUTHORISED, 'CanViewClients'];
      dataServiceSpy.getPlugins.mockReturnValue(of([MESSAGING_WITH_NAV, FLOOR_PLAN_WITH_NAV]));
      setup();

      await service.ensureLoaded();

      expect(navNames()).toEqual([MESSAGING_PLUGIN_NAME, FLOOR_PLAN_PLUGIN_NAME]);
    });

    it('shows the messaging entry to an admin', async () => {
      rights = [ROLE_ADMIN];
      dataServiceSpy.getPlugins.mockReturnValue(of([MESSAGING_WITH_NAV]));
      setup();

      await service.ensureLoaded();

      expect(navNames()).toEqual([MESSAGING_PLUGIN_NAME]);
    });

    it('keeps isPluginEnabled independent of the right, since it answers availability only', async () => {
      rights = [];
      dataServiceSpy.getPlugins.mockReturnValue(of([MESSAGING_WITH_NAV]));
      setup();

      await service.ensureLoaded();

      expect(service.isPluginEnabled(MESSAGING_PLUGIN_NAME)).toBe(true);
      expect(navNames()).toEqual([]);
    });
  });
});
