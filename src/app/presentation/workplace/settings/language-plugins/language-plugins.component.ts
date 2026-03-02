// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import { DataLanguagePluginService } from 'src/app/infrastructure/api/settings/data-language-plugin.service';
import { LanguagePluginInfo } from 'src/app/domain/models/settings/language-plugin';
import { LanguageConfigService } from 'src/app/application/services/language-config.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { LanguagePluginsHeaderComponent } from './language-plugins-header/language-plugins-header.component';
import { LanguagePluginsRowComponent } from './language-plugins-row/language-plugins-row.component';
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';

@Component({
  selector: 'app-language-plugins',
  standalone: true,
  imports: [
    TranslateModule,
    LanguagePluginsHeaderComponent,
    LanguagePluginsRowComponent,
    SettingsListCardComponent,
  ],
  templateUrl: './language-plugins.component.html',
  styleUrls: ['./language-plugins.component.scss'],
})
export class LanguagePluginsComponent implements OnInit, OnDestroy {
  private dataService = inject(DataLanguagePluginService);
  private languageConfigService = inject(LanguageConfigService);
  private toastService = inject(ToastShowService);
  public translate = inject(TranslateService);
  private destroy$ = new Subject<void>();

  plugins: LanguagePluginInfo[] = [];
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
          this.plugins = plugins;
          this.isLoading = false;
        },
        error: () => {
          this.toastService.showError('settings.language-plugins.error.load');
          this.isLoading = false;
        },
      });
  }

  async onInstall(plugin: LanguagePluginInfo): Promise<void> {
    try {
      await firstValueFrom(this.dataService.install(plugin.code));
      plugin.isInstalled = true;
      await this.languageConfigService.reloadConfig();
      this.toastService.showSuccess('settings.language-plugins.success.install', 'Success');
    } catch {
      this.toastService.showError('settings.language-plugins.error.install');
    }
  }

  async onUninstall(plugin: LanguagePluginInfo): Promise<void> {
    try {
      await firstValueFrom(this.dataService.uninstall(plugin.code));
      plugin.isInstalled = false;
      await this.languageConfigService.reloadConfig();
      this.toastService.showSuccess('settings.language-plugins.success.uninstall', 'Success');
    } catch {
      this.toastService.showError('settings.language-plugins.error.uninstall');
    }
  }
}
