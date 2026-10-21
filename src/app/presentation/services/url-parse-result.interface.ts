// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface UrlParseResult {
  hasId: boolean;
  id: string | undefined;
  isValidRoute: boolean;
}
