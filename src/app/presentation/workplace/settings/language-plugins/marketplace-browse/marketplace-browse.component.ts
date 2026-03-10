// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Komponente zum Durchsuchen und Installieren von Marketplace-Sprachpaketen.
 * @param installedCodes - Set der bereits installierten Sprachcodes
 * @param installed - Event das nach erfolgreicher Installation emittiert wird
 */
import { Component, inject, input, output } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { firstValueFrom } from 'rxjs';
import { DataLanguagePluginService } from 'src/app/infrastructure/api/settings/data-language-plugin.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { MarketplacePackage } from 'src/app/domain/models/settings/marketplace-package';

@Component({
  selector: 'app-marketplace-browse',
  standalone: true,
  imports: [TranslateModule, DecimalPipe, FormsModule, FontAwesomeModule],
  templateUrl: './marketplace-browse.component.html',
  styleUrls: ['./marketplace-browse.component.scss'],
})
export class MarketplaceBrowseComponent {
  private dataService = inject(DataLanguagePluginService);
  private toastService = inject(ToastShowService);
  public translate = inject(TranslateService);

  faSearch = faSearch;

  installedCodes = input<Set<string>>(new Set());
  installed = output<string>();

  packages: MarketplacePackage[] = [];
  isLoading = false;
  searchTerm = '';
  currentPage = 1;
  totalCount = 0;
  pageSize = 12;
  installingCode = '';

  async search(): Promise<void> {
    this.isLoading = true;
    try {
      const result = await firstValueFrom(
        this.dataService.searchMarketplace(this.searchTerm, this.currentPage, this.pageSize)
      );
      this.packages = result.items;
      this.totalCount = result.totalCount;
    } catch {
      this.toastService.showError('settings.language-plugins.marketplace.error.search');
    } finally {
      this.isLoading = false;
    }
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.search();
  }

  async onDownloadAndInstall(code: string): Promise<void> {
    this.installingCode = code;
    try {
      await firstValueFrom(this.dataService.downloadAndInstall(code));
      this.installed.emit(code);
      this.toastService.showSuccess('settings.language-plugins.marketplace.success.install', 'Success');
    } catch {
      this.toastService.showError('settings.language-plugins.marketplace.error.install');
    } finally {
      this.installingCode = '';
    }
  }

  isInstalled(code: string): boolean {
    return this.installedCodes().has(code);
  }
}
