// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Holds the installation's geo services configuration (geocoding, routing, OpenRouteService, map tiles,
 * external map links) and exposes one signal per capability. Fail-closed: every capability is false until
 * the configuration has been loaded successfully, so a failed or pending load never lets the browser reach
 * a public geo service. Loading is lazy - only the map consumers call ensureLoaded - because the
 * configuration is installation-wide and not tied to the signed-in user. ensureLoaded is idempotent
 * (callers share the in-flight/completed load, a failed load is retried by the next call); reload always
 * re-fetches and discards the answer of any older load still in flight.
 * @param loadState - 'idle' before the first load, then 'loading', 'loaded' or 'failed'
 * @param config - Last configuration received from the backend, null before the first successful load
 */

import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DataGeoServicesConfigService } from 'src/app/infrastructure/api/settings/data-geo-services-config.service';
import { IGeoServicesConfig } from 'src/app/domain/models/settings/geo-services-config.model';
import { IMapTileConfig } from 'src/app/domain/models/settings/map-tile-config.interface';
import { GeoServicesConfigLoadState } from 'src/app/domain/models/settings/geo-services-config-load-state.model';

const GEO_SERVICES_CONFIG_LOAD_WARNING =
  'GeoServicesConfigService: failed to load the geo services configuration, all geo services stay disabled.';

@Injectable({
  providedIn: 'root',
})
export class GeoServicesConfigService {
  private dataGeoServicesConfigService = inject(DataGeoServicesConfigService);

  readonly config = signal<IGeoServicesConfig | null>(null);
  readonly loadState = signal<GeoServicesConfigLoadState>('idle');

  private readonly loadedConfig = computed<IGeoServicesConfig | null>(() =>
    this.loadState() === 'loaded' ? this.config() : null,
  );

  readonly geocodingEnabled = computed(() => this.loadedConfig()?.geocoding.enabled === true);
  readonly routingEnabled = computed(() => this.loadedConfig()?.routing.enabled === true);
  readonly openRouteServiceEnabled = computed(() => this.loadedConfig()?.openRouteService.enabled === true);
  readonly mapTilesEnabled = computed(() => {
    const mapTiles = this.loadedConfig()?.mapTiles;
    return mapTiles?.enabled === true && !!mapTiles.urlTemplate;
  });
  readonly externalMapLinksEnabled = computed(() => this.loadedConfig()?.externalMapLinksEnabled === true);
  readonly mapTiles = computed<IMapTileConfig | null>(() =>
    this.mapTilesEnabled() ? (this.loadedConfig()?.mapTiles ?? null) : null,
  );

  private loadPromise: Promise<void> | null = null;
  private loadGeneration = 0;

  ensureLoaded(): Promise<void> {
    if (this.loadPromise) {
      return this.loadPromise;
    }
    return this.startLoad();
  }

  reload(): Promise<void> {
    this.loadGeneration++;
    return this.startLoad();
  }

  private startLoad(): Promise<void> {
    this.loadState.set('loading');
    const load = this.fetch().then((succeeded) => {
      if (!succeeded && this.loadPromise === load) {
        this.loadPromise = null;
      }
    });
    this.loadPromise = load;
    return load;
  }

  private async fetch(): Promise<boolean> {
    const generation = this.loadGeneration;
    try {
      const config = await firstValueFrom(this.dataGeoServicesConfigService.readGeoServicesConfig());
      if (generation !== this.loadGeneration) {
        return true;
      }
      this.config.set(config);
      this.loadState.set('loaded');
      return true;
    } catch (error) {
      if (generation === this.loadGeneration) {
        console.warn(GEO_SERVICES_CONFIG_LOAD_WARNING, error);
        this.loadState.set('failed');
      }
      return false;
    }
  }
}
