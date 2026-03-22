// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API service for managing feature plugins (install, uninstall, enable, disable).
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, retry } from 'rxjs';
import { environment } from 'src/environments/environment';
import { FeaturePluginInfo } from 'src/app/domain/models/plugins/feature-plugin-info';

@Injectable({ providedIn: 'root' })
export class DataFeaturePluginService {
  private httpClient = inject(HttpClient);
  private readonly apiUrl = environment.baseUrl.replace('backend/', '');

  getPlugins(): Observable<FeaturePluginInfo[]> {
    return this.httpClient.get<FeaturePluginInfo[]>(`${this.apiUrl}plugins/features`).pipe(retry(3));
  }

  getPlugin(name: string): Observable<FeaturePluginInfo> {
    return this.httpClient.get<FeaturePluginInfo>(`${this.apiUrl}plugins/features/${name}`).pipe(retry(3));
  }

  install(name: string): Observable<void> {
    return this.httpClient.post<void>(`${this.apiUrl}plugins/features/${name}/install`, {});
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
}
