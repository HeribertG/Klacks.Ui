// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Route guard that blocks navigation when a feature plugin is not installed and enabled.
 * Factory function creates a CanActivateFn for a specific plugin name. The refusal is recorded as
 * a feature reason, never as a rights problem - the plugin is simply not part of this installation.
 * @param pluginName - The plugin name to check (must match manifest name)
 */
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { FeaturePluginStateService } from 'src/app/application/services/feature-plugin-state.service';
import {
  NO_ACCESS_REASON_FEATURE,
  NO_ACCESS_REASON_QUERY_PARAM,
} from 'src/app/domain/constants/no-access-reason.constants';
import { NoAccessReasonService } from 'src/app/domain/services/navigation/no-access-reason.service';

export function featurePluginGuard(pluginName: string): CanActivateFn {
  return async () => {
    const pluginState = inject(FeaturePluginStateService);
    const noAccessReason = inject(NoAccessReasonService);
    const router = inject(Router);

    await pluginState.ensureLoaded();

    if (!pluginState.isPluginEnabled(pluginName)) {
      noAccessReason.set(NO_ACCESS_REASON_FEATURE);
      router.navigate(['/no-access'], {
        queryParams: { [NO_ACCESS_REASON_QUERY_PARAM]: NO_ACCESS_REASON_FEATURE },
      });
      return false;
    }

    return true;
  };
}
