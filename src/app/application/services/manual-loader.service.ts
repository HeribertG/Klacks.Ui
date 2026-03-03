// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, switchMap } from 'rxjs';
import { LanguageConfigService } from './language-config.service';
import { DataLanguagePluginService } from 'src/app/infrastructure/api/settings/data-language-plugin.service';

@Injectable({ providedIn: 'root' })
export class ManualLoaderService {
  private http = inject(HttpClient);
  private languageConfig = inject(LanguageConfigService);
  private pluginService = inject(DataLanguagePluginService);

  loadManual(manualName: string, lang: string): Observable<string> {
    if (!lang) {
      lang = 'de';
    }

    if (this.languageConfig.isCoreLanguage(lang)) {
      return this.loadStaticDoc(manualName, lang);
    }

    return this.pluginService.getPluginDoc(lang, manualName).pipe(
      catchError(() => this.loadStaticDoc(manualName, 'en'))
    );
  }

  private loadStaticDoc(manualName: string, lang: string): Observable<string> {
    return this.http.get(`assets/docs/${manualName}/${lang}.html`, { responseType: 'text' }).pipe(
      catchError(() => {
        if (lang === 'de') {
          return of('<p>Manual not available</p>');
        }
        return this.http.get(`assets/docs/${manualName}/de.html`, { responseType: 'text' }).pipe(
          catchError(() => of('<p>Manual not available</p>'))
        );
      })
    );
  }
}
