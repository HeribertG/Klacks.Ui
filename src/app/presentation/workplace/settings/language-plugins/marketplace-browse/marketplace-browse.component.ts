// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Component for browsing and installing marketplace language packages.
 * @param installedCodes - Set of already installed language codes
 * @param installed - Event emitted after successful installation
 */
import { Component, ChangeDetectionStrategy, ChangeDetectorRef, inject, input, output } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { DataLanguagePluginService } from 'src/app/infrastructure/api/settings/data-language-plugin.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { MarketplacePackage } from 'src/app/domain/models/settings/marketplace-package';
import { SearchInputComponent } from 'src/app/presentation/shared/search-input/search-input.component';

@Component({
  selector: 'app-marketplace-browse',
  standalone: true,
  imports: [TranslateModule, DecimalPipe, FormsModule, SearchInputComponent],
  templateUrl: './marketplace-browse.component.html',
  styleUrls: ['./marketplace-browse.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketplaceBrowseComponent {
  private dataService = inject(DataLanguagePluginService);
  private toastService = inject(ToastShowService);
  public translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

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
      this.cdr.markForCheck();
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
      this.toastService.showSuccess(this.translate.instant('settings.language-plugins.marketplace.success.install'), this.translate.instant('TOAST_SUCCESS'));
    } catch {
      this.toastService.showError(this.translate.instant('settings.language-plugins.marketplace.error.install'));
    } finally {
      this.installingCode = '';
      this.cdr.markForCheck();
    }
  }

  isInstalled(code: string): boolean {
    return this.installedCodes().has(code);
  }
}
