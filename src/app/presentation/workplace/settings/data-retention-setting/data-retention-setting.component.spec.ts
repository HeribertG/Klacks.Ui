// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { DataRetentionSettingComponent } from './data-retention-setting.component';

const RETENTION_DAYS_TWO_YEARS = 730;
const YEARS_KEY = 'settings.data-retention.years';
const TRANSLATION_LANGUAGE = 'en';
const YEARS_TEXT = 'years';
const RETENTION_HINT_SELECTOR = '.hint-column .settings-hint';

describe('DataRetentionSettingComponent', () => {
  let fixture: ComponentFixture<DataRetentionSettingComponent>;

  beforeEach(() => {
    const dataManagementSettingsService = {
      isReset: signal(false),
      settingsChangeTrigger: signal(0),
      appSettings: { dataRetentionSettings: signal({ dataRetentionDays: RETENTION_DAYS_TWO_YEARS }) },
    };

    TestBed.configureTestingModule({
      imports: [DataRetentionSettingComponent, TranslateModule.forRoot()],
      providers: [{ provide: DataManagementSettingsService, useValue: dataManagementSettingsService }],
    });
    fixture = TestBed.createComponent(DataRetentionSettingComponent);
    fixture.detectChanges();
  });

  const hint = (): string => (fixture.nativeElement.querySelector(RETENTION_HINT_SELECTOR).textContent ?? '').trim();

  it('shows the translated retention period once the translations arrive after the first render', () => {
    expect(hint()).toContain(YEARS_KEY);

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(TRANSLATION_LANGUAGE, { [YEARS_KEY]: YEARS_TEXT });
    translate.use(TRANSLATION_LANGUAGE);
    fixture.detectChanges();

    expect(hint()).toBe(`≈ 2 ${YEARS_TEXT}`);
  });
});
