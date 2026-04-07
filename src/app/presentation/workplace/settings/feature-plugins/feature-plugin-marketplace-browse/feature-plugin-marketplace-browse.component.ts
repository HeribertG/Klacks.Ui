// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Component for browsing and installing marketplace feature plugins.
 * @param installedNames - Set of already installed plugin names
 * @param installed - Event emitted after successful installation
 */
import { Component, ChangeDetectionStrategy, ChangeDetectorRef, inject, input, output } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { DataFeaturePluginService } from 'src/app/infrastructure/api/plugins/data-feature-plugin.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { MarketplacePlugin } from 'src/app/domain/models/plugins/marketplace-plugin';
import { SearchInputComponent } from 'src/app/presentation/shared/search-input/search-input.component';

@Component({
  selector: 'app-feature-plugin-marketplace-browse',
  standalone: true,
  imports: [TranslateModule, FormsModule, SearchInputComponent],
  templateUrl: './feature-plugin-marketplace-browse.component.html',
  styleUrls: ['./feature-plugin-marketplace-browse.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturePluginMarketplaceBrowseComponent {
  private dataService = inject(DataFeaturePluginService);
  private toastService = inject(ToastShowService);
  public translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  installedNames = input<Set<string>>(new Set());
  installed = output<string>();

  plugins: MarketplacePlugin[] = [];
  isLoading = false;
  searchTerm = '';
  totalCount = 0;
  installingName = '';

  async search(): Promise<void> {
    this.isLoading = true;
    try {
      const result = await firstValueFrom(
        this.dataService.searchMarketplace(this.searchTerm)
      );
      this.plugins = result.items;
      this.totalCount = result.totalCount;
    } catch {
      this.toastService.showError('settings.feature-plugins.marketplace.error.search');
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  async onInstall(name: string): Promise<void> {
    this.installingName = name;
    try {
      await firstValueFrom(this.dataService.installFromMarketplace(name));
      this.installed.emit(name);
      this.toastService.showSuccess(
        this.translate.instant('settings.feature-plugins.success.install'),
        this.translate.instant('TOAST_SUCCESS')
      );
    } catch {
      this.toastService.showError(
        this.translate.instant('settings.feature-plugins.error.install')
      );
    } finally {
      this.installingName = '';
      this.cdr.markForCheck();
    }
  }

  isInstalled(name: string): boolean {
    return this.installedNames().has(name);
  }
}
