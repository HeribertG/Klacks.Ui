// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Signal that counts every translation event (language switch, translation file loaded or replaced, default language
 * change). A computed() that builds text with TranslateService.instant() reads it first, so the text is recomputed once
 * the translation file has loaded or the language changes instead of keeping the raw key or the old language forever.
 * Must be called in an injection context (field initializer or constructor).
 */

import { inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { merge, scan } from 'rxjs';

const INITIAL_VERSION = 0;
const VERSION_STEP = 1;

export function translationVersionSignal(): Signal<number> {
  const translate = inject(TranslateService);

  return toSignal(
    merge(translate.onLangChange, translate.onTranslationChange, translate.onDefaultLangChange).pipe(
      scan((version) => version + VERSION_STEP, INITIAL_VERSION),
    ),
    { initialValue: INITIAL_VERSION },
  );
}
