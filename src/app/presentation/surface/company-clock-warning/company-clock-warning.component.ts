// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Global banner that tells an administrator that no company time zone is configured, so every
 * business date - "today", period closing, assistant date resets - falls back to UTC. It covers both
 * UTC fallbacks: nothing configured at all, and a company country that spans several time zones, each
 * with its own sentence. The destination is named by the settings card's own headline translation, so
 * the hint cannot drift from the label the user has to look for. It renders inside the signed-in
 * workplace shell only, stays invisible until the company clock has answered, disappears on its own as
 * soon as the resolution source is no longer a UTC fallback, and can be dismissed for the rest of the
 * browser session. Its action opens the company address settings section, where the country and the
 * time zone are configured.
 */
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { CompanyClockService } from 'src/app/domain/services/settings/company-clock.service';
import { KlacksyNavigationService } from 'src/app/domain/services/klacksy/klacksy-navigation.service';
import {
  COMPANY_CLOCK_SOURCE_UTC_MULTI_ZONE_COUNTRY,
  isCompanyClockUtcFallback,
} from 'src/app/domain/models/settings/company-clock.model';
import { ONBOARDING_SETTINGS_ROUTE } from 'src/app/domain/constants/onboarding-stations';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';

export const COMPANY_CLOCK_WARNING_OWNER_ADDRESS_TARGET = 'owner-address';

export const COMPANY_CLOCK_WARNING_KEYS = {
  text: 'companyClock.utcBanner.text',
  multiZoneText: 'companyClock.utcBanner.multiZoneText',
  action: 'companyClock.utcBanner.action',
  dismiss: 'companyClock.utcBanner.dismiss',
} as const;

export const COMPANY_CLOCK_WARNING_TARGET_KEY = 'setting.owner-address.headline';

export const COMPANY_CLOCK_WARNING_TARGET_PARAM = 'target';

const DISMISSED_VALUE = 'true';

@Component({
  selector: 'app-company-clock-warning',
  templateUrl: './company-clock-warning.component.html',
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyClockWarningComponent {
  private readonly authorizationService = inject(AuthorizationService);
  private readonly companyClockService = inject(CompanyClockService);
  private readonly klacksyNavigationService = inject(KlacksyNavigationService);
  private readonly translateService = inject(TranslateService);

  private readonly dismissed = signal(this.wasDismissedThisSession());

  private readonly targetHeadline: Observable<string> = this.translateService.stream(
    COMPANY_CLOCK_WARNING_TARGET_KEY,
  );

  private readonly translatedTarget = toSignal(this.targetHeadline, {
    initialValue: COMPANY_CLOCK_WARNING_TARGET_KEY,
  });

  readonly keys = COMPANY_CLOCK_WARNING_KEYS;

  readonly visible = computed(
    () =>
      !this.dismissed() &&
      this.authorizationService.isAdmin &&
      isCompanyClockUtcFallback(this.companyClockService.source()),
  );

  readonly textKey = computed(() =>
    this.companyClockService.source() === COMPANY_CLOCK_SOURCE_UTC_MULTI_ZONE_COUNTRY
      ? COMPANY_CLOCK_WARNING_KEYS.multiZoneText
      : COMPANY_CLOCK_WARNING_KEYS.text,
  );

  readonly textParams = computed<Record<string, string>>(() => ({
    [COMPANY_CLOCK_WARNING_TARGET_PARAM]: this.translatedTarget(),
  }));

  dismiss(): void {
    this.dismissed.set(true);
    this.rememberDismissedThisSession();
  }

  openCompanyAddress(): void {
    void this.klacksyNavigationService.navigateAndScroll(
      ONBOARDING_SETTINGS_ROUTE,
      COMPANY_CLOCK_WARNING_OWNER_ADDRESS_TARGET,
    );
  }

  private wasDismissedThisSession(): boolean {
    try {
      return sessionStorage.getItem(StorageKeys.COMPANY_CLOCK_UTC_WARNING_DISMISSED) === DISMISSED_VALUE;
    } catch {
      return false;
    }
  }

  private rememberDismissedThisSession(): void {
    try {
      sessionStorage.setItem(StorageKeys.COMPANY_CLOCK_UTC_WARNING_DISMISSED, DISMISSED_VALUE);
    } catch {
      return;
    }
  }
}
