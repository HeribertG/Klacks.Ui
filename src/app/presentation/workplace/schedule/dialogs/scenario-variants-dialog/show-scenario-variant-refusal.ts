// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Shows the translated explanation of a refused variant (key) request in a dialog's error line. Any other failure has
 * already been reported by the HTTP interceptor and leaves the line as it is.
 * @param err - The error of the request
 * @param translate - Translates the i18n key of the refusal
 * @param errorMessage - The error line of the dialog
 * @param invalidKey - i18n key that explains an uncoded 400 better than the general text, because the dialog knows its rules
 */

import { WritableSignal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { HttpStatusCode } from '@angular/common/http';
import { SCENARIO_VARIANT_REFUSAL_KEY_BY_STATUS } from 'src/app/domain/constants/scenario-variant.constants';
import { readScenarioVariantRefusalKey } from 'src/app/domain/models/schedule/scenario-variant-refusal.model';

export function showScenarioVariantRefusal(
  err: unknown,
  translate: TranslateService,
  errorMessage: WritableSignal<string | null>,
  invalidKey?: string,
): void {
  const refusalKey = readScenarioVariantRefusalKey(err);
  if (refusalKey === null) {
    return;
  }

  const isInvalid = refusalKey === SCENARIO_VARIANT_REFUSAL_KEY_BY_STATUS[HttpStatusCode.BadRequest];
  errorMessage.set(translate.instant(isInvalid ? (invalidKey ?? refusalKey) : refusalKey));
}
