// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, OnInit, OnDestroy, inject, TemplateRef, ViewChild } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
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
})
export class LanguagePluginsComponent implements OnInit, OnDestroy {
  private dataService = inject(DataLanguagePluginService);
  private languageConfigService = inject(LanguageConfigService);
  private toastService = inject(ToastShowService);
  private modalService = inject(NgbModal);
  public translate = inject(TranslateService);
  private destroy$ = new Subject<void>();

  @ViewChild('marketplaceModal') marketplaceModal!: TemplateRef<unknown>;
  @ViewChild(MarketplaceBrowseComponent) marketplaceBrowse?: MarketplaceBrowseComponent;

  allPlugins: LanguagePluginInfo[] = [];
  isLoading = false;

  get plugins(): LanguagePluginInfo[] {
    return this.allPlugins.filter(p => p.isCore || p.isInstalled);
  }

  get installedCodes(): Set<string> {
    return new Set(this.allPlugins.filter(p => p.isInstalled || p.isCore).map(p => p.code));
  }

  ngOnInit(): void {
    this.loadPlugins();
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
        },
        error: () => {
          this.toastService.showError('settings.language-plugins.error.load');
          this.isLoading = false;
        },
      });
  }

  async onUninstall(plugin: LanguagePluginInfo): Promise<void> {
    try {
      await firstValueFrom(this.dataService.uninstall(plugin.code));
      plugin.isInstalled = false;
      await this.languageConfigService.reloadConfig();
      this.toastService.showSuccess(this.translate.instant('settings.language-plugins.success.uninstall'), this.translate.instant('TOAST_SUCCESS'));
    } catch {
      this.toastService.showError(this.translate.instant('settings.language-plugins.error.uninstall'));
    }
  }

  openMarketplaceModal(): void {
    this.modalService.open(this.marketplaceModal, { size: 'lg' });
    setTimeout(() => this.marketplaceBrowse?.search(), 0);
  }

  onMarketplaceInstalled(code: string): void {
    this.loadPlugins();
    this.languageConfigService.reloadConfig();
  }
}
