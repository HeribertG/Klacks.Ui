// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Resolves translation parameters that carry a name in every language (key + MULTI_LANGUAGE_PARAM_SUFFIX,
 * value = serialized MultiLanguage) to the reader's language: the plain key receives the localized name and
 * the serialized companion is dropped. Parameters without a companion pass through unchanged, and a
 * malformed companion keeps the plain text the backend sent.
 * @param params - Translation parameters as received from the backend
 * @param language - The reader's UI language (e.g. "ja", "zh-CN")
 */

import { MULTI_LANGUAGE_PARAM_SUFFIX } from 'src/app/domain/constants/localized-comment-params.constants';
import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';
import { IMultiLanguage } from 'src/app/domain/models/translation/multi-language-class';

export function resolveMultiLanguageParams(
  params: Record<string, string> | null | undefined,
  language: string,
): Record<string, string> {
  if (!params) {
    return {};
  }

  const resolved: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (!key.endsWith(MULTI_LANGUAGE_PARAM_SUFFIX)) {
      resolved[key] ??= value;
      continue;
    }

    const name = getLocalizedValue(parseMultiLanguage(value), language);
    if (name) {
      resolved[key.slice(0, -MULTI_LANGUAGE_PARAM_SUFFIX.length)] = name;
    }
  }

  return resolved;
}

export function hasMultiLanguageParams(params: Record<string, string> | null | undefined): boolean {
  return !!params && Object.keys(params).some((key) => key.endsWith(MULTI_LANGUAGE_PARAM_SUFFIX));
}

function parseMultiLanguage(value: string): IMultiLanguage | null {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? (parsed as IMultiLanguage) : null;
  } catch {
    return null;
  }
}
