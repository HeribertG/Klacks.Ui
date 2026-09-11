// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings card listing the installed language packs, with uninstall and a marketplace browser. After a
 * pack is installed or uninstalled, Klacksy's search index is rebuilt in the background; the card polls
 * the rebuild status and shows an indicator while it runs, also when the page is opened mid-rebuild.
 * @param isIndexRebuilding - True while the knowledge index sync is running or pending
 */
import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy, inject, signal, TemplateRef, viewChild } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable, Subject, catchError, exhaustMap, firstValueFrom, map, of, switchMap, takeUntil, takeWhile, timer } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DataLanguagePluginService } from 'src/app/infrastructure/api/settings/data-language-plugin.service';
import { LanguagePluginInfo } from 'src/app/domain/models/settings/language-plugin';
import { LanguageConfigService } from 'src/app/application/services/language-config.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { LanguagePluginsHeaderComponent } from './language-plugins-header/language-plugins-header.component';
import { LanguagePluginsRowComponent } from './language-plugins-row/language-plugins-row.component';
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { IconSearchComponent } from 'src/app/presentation/icons/icon-search.component';
import { MarketplaceBrowseComponent } from './marketplace-browse/marketplace-browse.component';
import { LANGUAGE_PLUGINS } from './language-plugins.constants';

@Component({
  selector: 'app-language-plugins',
  standalone: true,
  imports: [
    TranslateModule,
    LanguagePluginsHeaderComponent,
    LanguagePluginsRowComponent,
    SettingsListCardComponent,
    IconSearchComponent,
    MarketplaceBrowseComponent,
  ],
  templateUrl: './language-plugins.component.html',
  styleUrls: ['./language-plugins.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguagePluginsComponent implements OnInit, OnDestroy {
  private dataService = inject(DataLanguagePluginService);
  private languageConfigService = inject(LanguageConfigService);
  private toastService = inject(ToastShowService);
  private modalService = inject(NgbModal);
  public translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();
  private readonly indexSyncPollRequested$ = new Subject<void>();

  readonly marketplaceModal = viewChild.required<TemplateRef<unknown>>('marketplaceModal');
  readonly marketplaceBrowse = viewChild(MarketplaceBrowseComponent);
  readonly isIndexRebuilding = signal(false);

  allPlugins: LanguagePluginInfo[] = [];
  isLoading = false;

  get plugins(): LanguagePluginInfo[] {
    return this.allPlugins.filter(p => p.isCore || p.isInstalled);
  }

  get installedCodes(): Set<string> {
    return new Set(this.allPlugins.filter(p => p.isInstalled || p.isCore).map(p => p.code));
  }

  ngOnInit(): void {
    this.setupIndexSyncPolling();
    this.loadPlugins();
    this.indexSyncPollRequested$.next();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPlugins(): void {
    this.isLoading = true;
    this.dataService.getPlugins()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (plugins) => {
          this.allPlugins = plugins;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.toastService.showError('settings.language-plugins.error.load');
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  private setupIndexSyncPolling(): void {
    this.indexSyncPollRequested$
      .pipe(
        switchMap(() => this.pollIndexSyncStatus()),
        takeUntil(this.destroy$),
      )
      .subscribe((isBusy) => this.isIndexRebuilding.set(isBusy));
  }

  private pollIndexSyncStatus(): Observable<boolean> {
    return timer(0, LANGUAGE_PLUGINS.INDEX_SYNC_POLL_INTERVAL_MS).pipe(
      exhaustMap(() =>
        this.dataService.getKnowledgeIndexSyncStatus().pipe(
          map((status) => status.isRunning || status.isPending),
          catchError(() => of(this.isIndexRebuilding())),
        ),
      ),
      takeWhile((isBusy) => isBusy, true),
    );
  }

  private startIndexSyncPolling(): void {
    this.isIndexRebuilding.set(true);
    this.indexSyncPollRequested$.next();
  }

  async onUninstall(plugin: LanguagePluginInfo): Promise<void> {
    try {
      await firstValueFrom(this.dataService.uninstall(plugin.code));
      plugin.isInstalled = false;
      this.startIndexSyncPolling();
      await this.languageConfigService.reloadConfig();
      this.toastService.showSuccess(
        `${this.translate.instant('settings.language-plugins.success.uninstall')}\n${this.translate.instant('settings.language-plugins.index-rebuild-hint')}`,
        this.translate.instant('TOAST_SUCCESS'),
      );
    } catch {
      this.toastService.showError(this.translate.instant('settings.language-plugins.error.uninstall'));
    } finally {
      this.cdr.markForCheck();
    }
  }

  openMarketplaceModal(): void {
    this.modalService.open(this.marketplaceModal(), { size: 'lg' });
    setTimeout(() => this.marketplaceBrowse()?.search(), 0);
  }

  onMarketplaceInstalled(_code: string): void {
    this.startIndexSyncPolling();
    this.loadPlugins();
    this.languageConfigService.reloadConfig();
  }
}
