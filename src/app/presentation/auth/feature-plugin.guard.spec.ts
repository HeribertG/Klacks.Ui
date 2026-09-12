// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { featurePluginGuard } from './feature-plugin.guard';
import { FeaturePluginStateService } from 'src/app/application/services/feature-plugin-state.service';
import { NoAccessReasonService } from 'src/app/domain/services/navigation/no-access-reason.service';
import {
  NO_ACCESS_REASON_FEATURE,
  NO_ACCESS_REASON_QUERY_PARAM,
} from 'src/app/domain/constants/no-access-reason.constants';

const PLUGIN_NAME = 'messaging';

describe('featurePluginGuard', () => {
  let router: { navigate: ReturnType<typeof vi.fn> };
  let pluginState: {
    ensureLoaded: ReturnType<typeof vi.fn>;
    isPluginEnabled: ReturnType<typeof vi.fn>;
  };
  let noAccessReason: NoAccessReasonService;

  const run = (): Promise<boolean> =>
    TestBed.runInInjectionContext(
      () =>
        featurePluginGuard(PLUGIN_NAME)(
          {} as ActivatedRouteSnapshot,
          {} as RouterStateSnapshot,
        ) as Promise<boolean>,
    );

  beforeEach(() => {
    router = { navigate: vi.fn() };
    pluginState = {
      ensureLoaded: vi.fn().mockResolvedValue(undefined),
      isPluginEnabled: vi.fn().mockReturnValue(true),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: FeaturePluginStateService, useValue: pluginState },
      ],
    });
    noAccessReason = TestBed.inject(NoAccessReasonService);
  });

  it('lets an enabled plugin through and records no reason', async () => {
    expect(await run()).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(noAccessReason.consume()).toBeNull();
  });

  it('records the feature reason, never the permission one, when the plugin is off', async () => {
    pluginState.isPluginEnabled.mockReturnValue(false);

    expect(await run()).toBe(false);
    expect(noAccessReason.consume()).toBe(NO_ACCESS_REASON_FEATURE);
  });

  it('puts the feature reason on the no-access url as well', async () => {
    pluginState.isPluginEnabled.mockReturnValue(false);

    await run();

    expect(router.navigate).toHaveBeenCalledWith(['/no-access'], {
      queryParams: { [NO_ACCESS_REASON_QUERY_PARAM]: NO_ACCESS_REASON_FEATURE },
    });
  });

  it('still records the reason although the plugin state is awaited first', async () => {
    // inject() runs before the await; a reason set after it would arrive too late for the caller.
    let resolveLoad: () => void = () => undefined;
    pluginState.ensureLoaded.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveLoad = resolve;
      }),
    );
    pluginState.isPluginEnabled.mockReturnValue(false);

    const pending = run();
    resolveLoad();
    await pending;

    expect(noAccessReason.consume()).toBe(NO_ACCESS_REASON_FEATURE);
  });
});
