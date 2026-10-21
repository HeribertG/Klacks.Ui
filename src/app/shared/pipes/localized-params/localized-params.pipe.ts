// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Template counterpart of resolveMultiLanguageParams and formatDateParams: turns backend translation parameters
 * that carry a name in every language into plain parameters in the reader's current language and shows the
 * date parameters (validUntil, dueDate, ...) in the reader's locale, for use as
 * {{ key | translate: (params | localizedParams) }}. Impure and memoized like CalendarDatePipe, so a language
 * switch re-resolves a rendered row; the memo keyed on the params object, the language and the date locale
 * (LocaleService, the live source the calendarDate pipe reads too) keeps a normal change-detection run to a
 * reference comparison.
 * @param params - Translation parameters as received from the backend
 */

import { inject, Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LOCALE_PROVIDER } from 'src/app/domain/interfaces/locale-provider.interface';
import { formatDateParams, hasDateParams } from 'src/app/domain/helpers/date-params.helper';
import { LocalizedParamsMemo } from './localized-params-memo.interface';
import {
  hasMultiLanguageParams,
  resolveMultiLanguageParams,
} from 'src/app/domain/helpers/multi-language-params.helper';

@Pipe({
  name: 'localizedParams',
  standalone: true,
  pure: false,
})
export class LocalizedParamsPipe implements PipeTransform {
  private readonly translate = inject(TranslateService);
  private readonly localeProvider = inject(LOCALE_PROVIDER);
  private memo: LocalizedParamsMemo | null = null;

  transform(params: Record<string, string> | null | undefined): Record<string, string> {
    if (!params) {
      return {};
    }

    if (!hasMultiLanguageParams(params) && !hasDateParams(params)) {
      return params;
    }

    const language = this.translate.currentLang ?? '';
    const locale = this.localeProvider.getLocale();
    const memo = this.memo;
    if (memo && memo.params === params && memo.language === language && memo.locale === locale) {
      return memo.result;
    }

    const result = formatDateParams(resolveMultiLanguageParams(params, language), locale);
    this.memo = { params, language, locale, result };
    return result;
  }
}
