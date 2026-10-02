// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Suffix of a translation parameter that carries a name in every language as serialized MultiLanguage,
 * mirroring the backend's LocalizedCommentParamKeys. A finding broadcast to readers of different languages
 * (e.g. the holiday-work entry of the schedule error list) sends "holiday" as readable text plus
 * "holidayI18n" with all translations; the UI resolves the latter to the reader's language.
 */
export const MULTI_LANGUAGE_PARAM_SUFFIX = 'I18n';
