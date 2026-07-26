// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API service for managing feature plugins (install, uninstall, enable, disable).
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, retry, map } from 'rxjs';
import { getApiRootUrl } from 'src/app/infrastructure/helpers/api-root-url.helper';
import { FeaturePluginInfo } from 'src/app/domain/models/plugins/feature-plugin-info';
import { MarketplacePlugin, MarketplacePluginSearchResult } from 'src/app/domain/models/plugins/marketplace-plugin';

@Injectable({ providedIn: 'root' })
export class DataFeaturePluginService {
  private httpClient = inject(HttpClient);
  private readonly apiUrl = getApiRootUrl();

  getPlugins(): Observable<FeaturePluginInfo[]> {
    return this.httpClient.get<FeaturePluginInfo[]>(`${this.apiUrl}plugins/features`).pipe(retry(3));
  }

  getPlugin(name: string): Observable<FeaturePluginInfo> {
    return this.httpClient.get<FeaturePluginInfo>(`${this.apiUrl}plugins/features/${name}`).pipe(retry(3));
  }

  install(name: string): Observable<void> {
    return this.httpClient.post<void>(`${this.apiUrl}plugins/features/${name}/install`, {});
  }

  installFromMarketplace(name: string): Observable<void> {
    return this.httpClient.post<void>(`${this.apiUrl}plugins/features/${name}/install-from-marketplace`, {});
  }

  uninstall(name: string): Observable<void> {
    return this.httpClient.delete<void>(`${this.apiUrl}plugins/features/${name}/uninstall`);
  }

  enable(name: string): Observable<void> {
    return this.httpClient.post<void>(`${this.apiUrl}plugins/features/${name}/enable`, {});
  }

  disable(name: string): Observable<void> {
    return this.httpClient.post<void>(`${this.apiUrl}plugins/features/${name}/disable`, {});
  }

  searchMarketplace(search?: string, category?: string): Observable<MarketplacePluginSearchResult> {
    let params = '?pageSize=100';
    if (search) params += `&search=${encodeURIComponent(search)}`;
    if (category) params += `&category=${encodeURIComponent(category)}`;
    return this.httpClient.get<MarketplacePlugin[]>(`${this.apiUrl}plugins/features/marketplace${params}`).pipe(
      map(items => ({ items, totalCount: items.length, page: 1, pageSize: 100 }))
    );
  }
}
