// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { computed, Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { translationVersionSignal } from './translation-version.helper';

const LANGUAGE_DE = 'de';
const LANGUAGE_EN = 'en';
const TEXT_KEY = 'some.key';

describe('translationVersionSignal', () => {
  let translate: TranslateService;
  let label: () => string;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TranslateModule.forRoot()] });
    translate = TestBed.inject(TranslateService);
    label = runInInjectionContext(TestBed.inject(Injector), () => {
      const version = translationVersionSignal();
      return computed(() => {
        version();
        return translate.instant(TEXT_KEY);
      });
    });
  });

  it('keeps the raw key until the translations arrive and then recomputes', () => {
    expect(label()).toBe(TEXT_KEY);

    translate.setTranslation(LANGUAGE_DE, { [TEXT_KEY]: 'Text' });
    translate.use(LANGUAGE_DE);

    expect(label()).toBe('Text');
  });

  it('recomputes when the language switches', () => {
    translate.setTranslation(LANGUAGE_DE, { [TEXT_KEY]: 'Text' });
    translate.setTranslation(LANGUAGE_EN, { [TEXT_KEY]: 'Label' });
    translate.use(LANGUAGE_DE);
    expect(label()).toBe('Text');

    translate.use(LANGUAGE_EN);

    expect(label()).toBe('Label');
  });
});
