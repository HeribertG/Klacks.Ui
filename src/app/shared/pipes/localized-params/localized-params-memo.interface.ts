// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface LocalizedParamsMemo {
  params: Record<string, string>;
  language: string;
  locale: string;
  result: Record<string, string>;
}
