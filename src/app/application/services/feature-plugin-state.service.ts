// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Caches feature plugin state and provides reactive signals for plugin availability.
 * Loads plugin info from the API once and exposes navigation items for the sidebar.
 * @param plugins - Signal holding all discovered feature plugins
 * @param pluginNavItems - Computed signal of enabled plugins that have navigation metadata
 */
import { Injectable, inject, signal, computed } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DataFeaturePluginService } from 'src/app/infrastructure/api/plugins/data-feature-plugin.service';
import { FeaturePluginInfo } from 'src/app/domain/models/plugins/feature-plugin-info';
import { PluginNavItem } from 'src/app/domain/models/plugins/plugin-nav-item';

@Injectable({
  providedIn: 'root',
})
export class FeaturePluginStateService {
  private dataService = inject(DataFeaturePluginService);

  private _plugins = signal<FeaturePluginInfo[]>([]);
  private _loaded = false;
  private _loadingPromise: Promise<void> | null = null;

  public plugins = computed(() => this._plugins());

  public pluginNavItems = computed<PluginNavItem[]>(() => {
    return this._plugins()
      .filter((p) => p.isInstalled && p.isEnabled && p.isOperational && p.navigation)
      .map((p) => ({
        name: p.name,
        route: p.navigation!.route,
        labelKey: p.navigation!.labelKey,
        position: p.navigation!.position,
        viewBox: p.navigation!.viewBox,
        svgPaths: p.navigation!.svgPaths,
      }))
      .sort((a, b) => a.position - b.position);
  });

  public isPluginEnabled(name: string): boolean {
    const plugin = this._plugins().find((p) => p.name === name);
    return !!plugin?.isInstalled && !!plugin?.isEnabled;
  }

  public async ensureLoaded(): Promise<void> {
    if (this._loaded) {
      return;
    }

    if (this._loadingPromise) {
      return this._loadingPromise;
    }

    this._loadingPromise = this.loadPlugins();
    await this._loadingPromise;
  }

  public async refresh(): Promise<void> {
    this._loaded = false;
    this._loadingPromise = null;
    await this.loadPlugins();
  }

  private async loadPlugins(): Promise<void> {
    try {
      const plugins = await firstValueFrom(this.dataService.getPlugins());
      this._plugins.set(plugins);
      this._loaded = true;
    } catch {
      this._plugins.set([]);
      this._loaded = true;
    } finally {
      this._loadingPromise = null;
    }
  }
}
