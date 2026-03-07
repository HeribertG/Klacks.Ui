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
import { DecimalPipe } from '@angular/common';
import { IconSearchComponent } from 'src/app/presentation/icons/icon-search.component';

@Component({
  selector: 'app-language-plugins',
  standalone: true,
  imports: [
    TranslateModule,
    DecimalPipe,
    LanguagePluginsHeaderComponent,
    LanguagePluginsRowComponent,
    SettingsListCardComponent,
    IconSearchComponent,
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

  @ViewChild('availableModal') availableModal!: TemplateRef<unknown>;

  allPlugins: LanguagePluginInfo[] = [];
  isLoading = false;

  get plugins(): LanguagePluginInfo[] {
    return this.allPlugins.filter(p => p.isCore || p.isInstalled);
  }

  get availablePlugins(): LanguagePluginInfo[] {
    return this.allPlugins.filter(p => !p.isCore && !p.isInstalled);
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

  openAvailableModal(): void {
    this.modalService.open(this.availableModal, { size: 'lg' });
  }

  async onInstallFromModal(plugin: LanguagePluginInfo, modal: { close: () => void }): Promise<void> {
    await this.onInstall(plugin);
    if (this.availablePlugins.length === 0) {
      modal.close();
    }
  }
}
