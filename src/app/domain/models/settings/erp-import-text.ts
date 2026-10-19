// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * An i18n key with its interpolation parameters, resolved by the caller (translate pipe or TranslateService).
 * @param key - Translation key under settings.erp-drop-points.files
 * @param params - Interpolation values (counts, raw error detail)
 */

export interface IErpImportText {
  key: string;
  params: Record<string, string | number>;
}
