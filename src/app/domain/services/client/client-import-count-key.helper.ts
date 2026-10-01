// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Picks the singular or the plural translation key of an employee import count text.
 * @param keys - Singular ("one") and plural ("other") key of the text
 * @param count - Number the text shows; exactly 1 selects the singular
 */

import { IClientImportCountKeys } from 'src/app/domain/models/client-import/i-client-import-count-keys';

const SINGULAR_COUNT = 1;

export function clientImportCountKey(keys: IClientImportCountKeys, count: number): string {
  return count === SINGULAR_COUNT ? keys.one : keys.other;
}
