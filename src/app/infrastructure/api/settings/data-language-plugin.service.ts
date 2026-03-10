// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, retry } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LanguagePluginInfo } from 'src/app/domain/models/settings/language-plugin';
import { MarketplacePackage, MarketplaceSearchResult } from 'src/app/domain/models/settings/marketplace-package';

@Injectable({ providedIn: 'root' })
export class DataLanguagePluginService {
  private httpClient = inject(HttpClient);
  private readonly apiUrl = environment.baseUrl.replace('backend/', '');

  getPlugins(): Observable<LanguagePluginInfo[]> {
    return this.httpClient.get<LanguagePluginInfo[]>(`${this.apiUrl}config/language-plugins`).pipe(retry(3));
  }

  getTranslations(lang: string): Observable<Record<string, string>> {
    return this.httpClient.get<Record<string, string>>(`${this.apiUrl}config/translations/${lang}`).pipe(retry(3));
  }

  install(code: string): Observable<void> {
    return this.httpClient.post<void>(`${this.apiUrl}config/language-plugins/${code}/install`, {});
  }

  uninstall(code: string): Observable<void> {
    return this.httpClient.delete<void>(`${this.apiUrl}config/language-plugins/${code}/uninstall`);
  }

  getPluginDoc(code: string, manualName: string): Observable<string> {
    return this.httpClient.get(`${this.apiUrl}config/language-plugins/${code}/docs/${manualName}`, { responseType: 'text' }).pipe(retry(3));
  }

  searchMarketplace(search: string, page: number, pageSize: number): Observable<MarketplaceSearchResult> {
    const params = new HttpParams()
      .set('search', search)
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    return this.httpClient.get<MarketplaceSearchResult>(
      `${this.apiUrl}config/marketplace/packages`, { params }
    ).pipe(retry(3));
  }

  getMarketplacePackage(code: string): Observable<MarketplacePackage> {
    return this.httpClient.get<MarketplacePackage>(
      `${this.apiUrl}config/marketplace/packages/${code}`
    ).pipe(retry(3));
  }

  downloadAndInstall(code: string): Observable<void> {
    return this.httpClient.post<void>(
      `${this.apiUrl}config/marketplace/packages/${code}/download-and-install`, {}
    );
  }
}
