// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Template counterpart of resolveMultiLanguageParams: turns backend translation parameters that carry a name
 * in every language into plain parameters in the reader's current language, for use as
 * {{ key | translate: (params | localizedParams) }}. Impure and memoized like CalendarDatePipe, so a language
 * switch re-resolves a rendered row; the memo keyed on the params object and the language keeps a normal
 * change-detection run to a reference comparison.
 * @param params - Translation parameters as received from the backend
 */

import { inject, Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  hasMultiLanguageParams,
  resolveMultiLanguageParams,
} from 'src/app/domain/helpers/multi-language-params.helper';

interface LocalizedParamsMemo {
  params: Record<string, string>;
  language: string;
  result: Record<string, string>;
}

@Pipe({
  name: 'localizedParams',
  standalone: true,
  pure: false,
})
export class LocalizedParamsPipe implements PipeTransform {
  private readonly translate = inject(TranslateService);
  private memo: LocalizedParamsMemo | null = null;

  transform(params: Record<string, string> | null | undefined): Record<string, string> {
    if (!params) {
      return {};
    }

    if (!hasMultiLanguageParams(params)) {
      return params;
    }

    const language = this.translate.currentLang ?? '';
    const memo = this.memo;
    if (memo && memo.params === params && memo.language === language) {
      return memo.result;
    }

    const result = resolveMultiLanguageParams(params, language);
    this.memo = { params, language, result };
    return result;
  }
}
