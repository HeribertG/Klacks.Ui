// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * First-run page "Country and industry", opened right after the own admin account was created and reachable later
 * under /company-setup. Shows the country the installation applied (holiday calendar country written by the region
 * profile) read-only, because the installed country package is not re-applied after the installation, and embeds the
 * regular active-industries settings card, so the industry is chosen and saved exactly as in the settings. Works
 * without Klacksy; the text only points to it for the rest of the setup.
 * @param isLoaded - True once the app settings were read, so the embedded card starts from the stored industry
 * @param countryName - Installed country in the UI language, empty when the installation applied no country profile
 */
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { countryDisplayName } from 'src/app/domain/helpers/country-display-name.helper';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { ActiveIndustriesSettingsComponent } from 'src/app/presentation/workplace/settings/active-industries-settings/active-industries-settings.component';

@Component({
  selector: 'app-company-setup',
  templateUrl: './company-setup.component.html',
  styleUrls: ['./company-setup.component.scss'],
  standalone: true,
  imports: [TranslateModule, ActiveIndustriesSettingsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanySetupComponent implements OnInit {
  private readonly settings = inject(DataManagementSettingsService);
  private readonly translate = inject(TranslateService);
  private readonly navigationService = inject(NavigationService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly language = signal(this.currentLanguage());

  readonly isLoaded = signal(false);

  readonly countryName = computed(() =>
    countryDisplayName(this.settings.appSettings.contactSettings().globalCalendarCountry ?? '', this.language())
  );

  async ngOnInit(): Promise<void> {
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.language.set(this.currentLanguage()));

    await this.settings.appSettings.loadSettingsAsync();
    this.isLoaded.set(true);
  }

  onContinue(): void {
    this.navigationService.navigateToDashboard();
  }

  private currentLanguage(): string {
    return this.translate.currentLang || DomainMessages.DEFAULT_LANG;
  }
}
