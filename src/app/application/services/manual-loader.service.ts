// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { LanguageConfigService } from './language-config.service';
import { DataLanguagePluginService } from 'src/app/infrastructure/api/settings/data-language-plugin.service';
import { DomainMessages } from 'src/app/domain/constants/messages';

const MANUAL_NOT_AVAILABLE = '<p>Manual not available</p>';

@Injectable({ providedIn: 'root' })
export class ManualLoaderService {
  private http = inject(HttpClient);
  private languageConfig = inject(LanguageConfigService);
  private pluginService = inject(DataLanguagePluginService);

  loadManual(manualName: string, lang: string): Observable<string> {
    if (!lang) {
      lang = DomainMessages.DEFAULT_LANG;
    }

    if (this.languageConfig.isCoreLanguage(lang)) {
      return this.loadStaticDoc(manualName, lang);
    }

    return this.pluginService.getPluginDoc(lang, manualName).pipe(
      catchError(() => this.loadStaticDoc(manualName, DomainMessages.DEFAULT_LANG))
    );
  }

  private loadStaticDoc(manualName: string, lang: string): Observable<string> {
    return this.http.get(`assets/docs/${manualName}/${lang}.html`, { responseType: 'text' }).pipe(
      catchError(() => {
        if (lang === DomainMessages.DEFAULT_LANG) {
          return of(MANUAL_NOT_AVAILABLE);
        }
        return this.http.get(`assets/docs/${manualName}/${DomainMessages.DEFAULT_LANG}.html`, { responseType: 'text' }).pipe(
          catchError(() => of(MANUAL_NOT_AVAILABLE))
        );
      })
    );
  }
}
