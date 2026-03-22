// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings component for managing feature plugins (install, uninstall, enable, disable).
 * @param dataService - API service for feature plugin operations
 * @param toastService - Service for displaying toast notifications
 */
import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import { DataFeaturePluginService } from 'src/app/infrastructure/api/plugins/data-feature-plugin.service';
import { FeaturePluginInfo } from 'src/app/domain/models/plugins/feature-plugin-info';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { FeaturePluginsHeaderComponent } from './feature-plugins-header/feature-plugins-header.component';
import { FeaturePluginsRowComponent } from './feature-plugins-row/feature-plugins-row.component';
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';

@Component({
  selector: 'app-feature-plugins',
  standalone: true,
  imports: [
    TranslateModule,
    FeaturePluginsHeaderComponent,
    FeaturePluginsRowComponent,
    SettingsListCardComponent,
  ],
  templateUrl: './feature-plugins.component.html',
  styleUrls: ['./feature-plugins.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturePluginsComponent implements OnInit, OnDestroy {
  private dataService = inject(DataFeaturePluginService);
  private toastService = inject(ToastShowService);
  public translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  allPlugins: FeaturePluginInfo[] = [];
  isLoading = false;

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

  async onInstall(plugin: FeaturePluginInfo): Promise<void> {
    try {
      await firstValueFrom(this.dataService.install(plugin.name));
      plugin.isInstalled = true;
      plugin.isEnabled = true;
      this.toastService.showSuccess(
        this.translate.instant('settings.feature-plugins.success.install'),
        this.translate.instant('TOAST_SUCCESS')
      );
    } catch {
      this.toastService.showError(this.translate.instant('settings.feature-plugins.error.install'));
    } finally {
      this.cdr.markForCheck();
    }
  }

  async onUninstall(plugin: FeaturePluginInfo): Promise<void> {
    try {
      await firstValueFrom(this.dataService.uninstall(plugin.name));
      plugin.isInstalled = false;
      plugin.isEnabled = false;
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
}
