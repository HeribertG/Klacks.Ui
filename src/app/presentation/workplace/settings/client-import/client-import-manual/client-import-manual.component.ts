// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Handbook of the employee import, shown in the manual tab of the settings card and in the manual modal. Loads the localized handbook (core languages from the static assets,
 * language packs from the plugin docs) via ManualLoaderService and reloads it when the UI language changes.
 * @param manualContent - Rendered HTML of the handbook in the current UI language
 */

import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { DomainMessages } from 'src/app/domain/constants/messages';

const CLIENT_IMPORT_MANUAL_NAME = 'client-import-manual';

@Component({
  selector: 'app-client-import-manual',
  standalone: true,
  templateUrl: './client-import-manual.component.html',
  styleUrls: ['./client-import-manual.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientImportManualComponent implements OnInit, OnDestroy {
  private readonly translate = inject(TranslateService);
  private readonly manualLoader = inject(ManualLoaderService);
  private readonly destroy$ = new Subject<void>();

  protected readonly manualContent = signal<string>('');

  ngOnInit(): void {
    this.loadManual();
    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadManual());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadManual(): void {
    const lang = this.translate.currentLang || this.translate.defaultLang || DomainMessages.DEFAULT_LANG;
    this.manualLoader.loadManual(CLIENT_IMPORT_MANUAL_NAME, lang)
      .pipe(takeUntil(this.destroy$))
      .subscribe(content => this.manualContent.set(content));
  }
}
