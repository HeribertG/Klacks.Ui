// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ITranslatedEmail {
  subject: string;
  bodyHtml: string | null;
  bodyText: string | null;
  targetLanguage: string;
}
