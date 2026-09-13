// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

import {
  CompanyClockWarningComponent,
  COMPANY_CLOCK_WARNING_OWNER_ADDRESS_TARGET,
  COMPANY_CLOCK_WARNING_KEYS,
  COMPANY_CLOCK_WARNING_TARGET_KEY,
  COMPANY_CLOCK_WARNING_TARGET_PARAM,
} from './company-clock-warning.component';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { CompanyClockService } from 'src/app/domain/services/settings/company-clock.service';
import { KlacksyNavigationService } from 'src/app/domain/services/klacksy/klacksy-navigation.service';
import { CompanyClockSource } from 'src/app/domain/models/settings/company-clock.model';
import { ONBOARDING_SETTINGS_ROUTE } from 'src/app/domain/constants/onboarding-stations';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';

const BANNER_SELECTOR = '#company-clock-utc-banner';
const OPEN_BUTTON_SELECTOR = '#company-clock-utc-banner-open';
const DISMISS_BUTTON_SELECTOR = '#company-clock-utc-banner-dismiss';
const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'] as const;
const TARGET_LANGUAGE = 'en';
const TARGET_HEADLINE = 'Secretary Address';
const I18N_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../assets/i18n');

describe('CompanyClockWarningComponent', () => {
  let fixture: ComponentFixture<CompanyClockWarningComponent>;
  let source: WritableSignal<CompanyClockSource | null>;
  let admin: WritableSignal<boolean>;
  let mockNavigation: { navigateAndScroll: ReturnType<typeof vi.fn> };

  const setup = async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [CompanyClockWarningComponent, TranslateModule.forRoot()],
      providers: [
        { provide: CompanyClockService, useValue: { source } },
        {
          provide: AuthorizationService,
          useValue: {
            get isAdmin(): boolean {
              return admin();
            },
          },
        },
        { provide: KlacksyNavigationService, useValue: mockNavigation },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CompanyClockWarningComponent);
    fixture.detectChanges();
  };

  const banner = (): Element | null => fixture.nativeElement.querySelector(BANNER_SELECTOR);

  beforeEach(() => {
    sessionStorage.clear();
    source = signal<CompanyClockSource | null>('Utc');
    admin = signal(true);
    mockNavigation = { navigateAndScroll: vi.fn().mockResolvedValue({ success: true }) };
  });

  afterEach(() => {
    sessionStorage.clear();
    TestBed.resetTestingModule();
  });

  it('shows the banner for an administrator while the company clock falls back to UTC', async () => {
    await setup();

    expect(banner()).not.toBeNull();
  });

  it('uses the unconfigured-zone sentence for the plain UTC fallback', async () => {
    await setup();

    expect(fixture.componentInstance.textKey()).toBe(COMPANY_CLOCK_WARNING_KEYS.text);
  });

  it('shows the banner with its own sentence when the company country spans several time zones', async () => {
    source.set('UtcMultiZoneCountry');

    await setup();

    expect(banner()).not.toBeNull();
    expect(fixture.componentInstance.textKey()).toBe(COMPANY_CLOCK_WARNING_KEYS.multiZoneText);
  });

  it('names the destination with the settings card headline', async () => {
    await setup();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(TARGET_LANGUAGE, {
      [COMPANY_CLOCK_WARNING_TARGET_KEY]: TARGET_HEADLINE,
    });
    translate.use(TARGET_LANGUAGE);

    expect(fixture.componentInstance.textParams()).toEqual({
      [COMPANY_CLOCK_WARNING_TARGET_PARAM]: TARGET_HEADLINE,
    });
  });

  it('hides the banner for a user who is not an administrator', async () => {
    admin.set(false);

    await setup();

    expect(banner()).toBeNull();
  });

  it('hides the banner when the time zone comes from the setting', async () => {
    source.set('Setting');

    await setup();

    expect(banner()).toBeNull();
  });

  it('hides the banner before the company clock was loaded', async () => {
    source.set(null);

    await setup();

    expect(banner()).toBeNull();
  });

  it('hides the banner as soon as the source stops being the UTC fallback', async () => {
    await setup();

    source.set('AddressCountry');
    fixture.detectChanges();

    expect(banner()).toBeNull();
  });

  it('hides the banner for the rest of the session once it was dismissed', async () => {
    await setup();

    fixture.nativeElement.querySelector(DISMISS_BUTTON_SELECTOR).click();
    fixture.detectChanges();

    expect(banner()).toBeNull();
    expect(sessionStorage.getItem(StorageKeys.COMPANY_CLOCK_UTC_WARNING_DISMISSED)).not.toBeNull();

    TestBed.resetTestingModule();
    await setup();

    expect(banner()).toBeNull();
  });

  it('opens the company address section of the settings page', async () => {
    await setup();

    fixture.nativeElement.querySelector(OPEN_BUTTON_SELECTOR).click();

    expect(mockNavigation.navigateAndScroll).toHaveBeenCalledWith(
      ONBOARDING_SETTINGS_ROUTE,
      COMPANY_CLOCK_WARNING_OWNER_ADDRESS_TARGET,
    );
  });
});

describe('company clock warning translations', () => {
  const load = (language: string): Record<string, string> =>
    JSON.parse(readFileSync(resolve(I18N_DIR, `${language}.json`), 'utf8'));

  const TARGET_PLACEHOLDER = `{{${COMPANY_CLOCK_WARNING_TARGET_PARAM}}}`;
  const SENTENCE_KEYS: readonly string[] = [
    COMPANY_CLOCK_WARNING_KEYS.text,
    COMPANY_CLOCK_WARNING_KEYS.multiZoneText,
  ];

  it.each(CORE_LANGUAGES)('translates every banner key in %s', (language) => {
    const translations = load(language);

    [...Object.values(COMPANY_CLOCK_WARNING_KEYS), COMPANY_CLOCK_WARNING_TARGET_KEY].forEach((key) => {
      expect(translations[key], `${language}: ${key}`).toBeTruthy();
      expect(translations[key], `${language}: ${key}`).not.toBe(key);
    });
  });

  it.each(CORE_LANGUAGES)('interpolates the settings card headline only in the sentences in %s', (language) => {
    const translations = load(language);

    Object.values(COMPANY_CLOCK_WARNING_KEYS).forEach((key) => {
      expect(translations[key].includes(TARGET_PLACEHOLDER), `${language}: ${key}`).toBe(
        SENTENCE_KEYS.includes(key),
      );
    });
  });
});
