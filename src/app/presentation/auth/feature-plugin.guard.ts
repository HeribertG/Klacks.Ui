// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Route guard that blocks navigation when a feature plugin is not installed and enabled.
 * Factory function creates a CanActivateFn for a specific plugin name.
 * @param pluginName - The plugin name to check (must match manifest name)
 */
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { FeaturePluginStateService } from 'src/app/application/services/feature-plugin-state.service';

export function featurePluginGuard(pluginName: string): CanActivateFn {
  return async () => {
    const pluginState = inject(FeaturePluginStateService);
    const router = inject(Router);

    await pluginState.ensureLoaded();

    if (!pluginState.isPluginEnabled(pluginName)) {
      router.navigate(['/no-access']);
      return false;
    }

    return true;
  };
}
