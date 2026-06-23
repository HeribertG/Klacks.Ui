// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings component for managing installed feature plugins.
 * Shows only installed plugins. Marketplace modal for browsing and installing new ones.
 * @param dataService - API service for feature plugin operations
 * @param toastService - Service for displaying toast notifications
 */
import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy, inject, TemplateRef, viewChild } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DataFeaturePluginService } from 'src/app/infrastructure/api/plugins/data-feature-plugin.service';
import { FeaturePluginInfo } from 'src/app/domain/models/plugins/feature-plugin-info';
import { FeaturePluginStateService } from 'src/app/application/services/feature-plugin-state.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { FeaturePluginsHeaderComponent } from './feature-plugins-header/feature-plugins-header.component';
import { FeaturePluginsRowComponent } from './feature-plugins-row/feature-plugins-row.component';
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { IconSearchComponent } from 'src/app/presentation/icons/icon-search.component';
import { FeaturePluginMarketplaceBrowseComponent } from './feature-plugin-marketplace-browse/feature-plugin-marketplace-browse.component';

@Component({
  selector: 'app-feature-plugins',
  standalone: true,
  imports: [
    TranslateModule,
    FeaturePluginsHeaderComponent,
    FeaturePluginsRowComponent,
    SettingsListCardComponent,
    IconSearchComponent,
    FeaturePluginMarketplaceBrowseComponent,
  ],
  templateUrl: './feature-plugins.component.html',
  styleUrls: ['./feature-plugins.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturePluginsComponent implements OnInit, OnDestroy {
  private dataService = inject(DataFeaturePluginService);
  private pluginState = inject(FeaturePluginStateService);
  private toastService = inject(ToastShowService);
  private modalService = inject(NgbModal);
  public translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  readonly marketplaceModal = viewChild.required<TemplateRef<unknown>>('marketplaceModal');
  readonly marketplaceBrowse = viewChild(FeaturePluginMarketplaceBrowseComponent);

  allPlugins: FeaturePluginInfo[] = [];
  isLoading = false;

  get installedPlugins(): FeaturePluginInfo[] {
    return this.allPlugins.filter(p => p.isInstalled);
  }

  get installedNames(): Set<string> {
    return new Set(this.allPlugins.filter(p => p.isInstalled).map(p => p.name));
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
          this.cdr.markForCheck();
        },
        error: () => {
          this.toastService.showError('settings.feature-plugins.error.load');
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  async onUninstall(plugin: FeaturePluginInfo): Promise<void> {
    try {
      await firstValueFrom(this.dataService.uninstall(plugin.name));
      plugin.isInstalled = false;
      plugin.isEnabled = false;
      await this.pluginState.refresh();
      await this.reloadTranslations();
      this.toastService.showSuccess(
        this.translate.instant('settings.feature-plugins.success.uninstall'),
        this.translate.instant('TOAST_SUCCESS')
      );
    } catch {
      this.toastService.showError(this.translate.instant('settings.feature-plugins.error.uninstall'));
    } finally {
      this.cdr.markForCheck();
    }
  }

  async onToggleEnabled(plugin: FeaturePluginInfo): Promise<void> {
    const newState = !plugin.isEnabled;
    try {
      if (newState) {
        await firstValueFrom(this.dataService.enable(plugin.name));
      } else {
        await firstValueFrom(this.dataService.disable(plugin.name));
      }
      plugin.isEnabled = newState;
      await this.pluginState.refresh();
      await this.reloadTranslations();
      const messageKey = newState
        ? 'settings.feature-plugins.success.enable'
        : 'settings.feature-plugins.success.disable';
      this.toastService.showSuccess(
        this.translate.instant(messageKey),
        this.translate.instant('TOAST_SUCCESS')
      );
    } catch {
      this.toastService.showError(this.translate.instant('settings.feature-plugins.error.toggle'));
    } finally {
      this.cdr.markForCheck();
    }
  }

  openMarketplaceModal(): void {
    this.modalService.open(this.marketplaceModal(), { size: 'lg' });
    setTimeout(() => this.marketplaceBrowse()?.search(), 0);
  }

  async onMarketplaceInstalled(_name: string): Promise<void> {
    this.loadPlugins();
    await this.pluginState.refresh();
    await this.reloadTranslations();
  }

  private async reloadTranslations(): Promise<void> {
    const currentLang = this.translate.currentLang;
    if (!currentLang) {
      return;
    }
    await firstValueFrom(this.translate.reloadLang(currentLang));
    this.translate.use(currentLang);
  }
}
