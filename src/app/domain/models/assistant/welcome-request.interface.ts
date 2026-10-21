// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IWelcomeRequest {
  lang: string;
  localHour: number;
  weekday: number;
  route?: string;
  latitude?: number;
  longitude?: number;
  displayName?: string;
  excludeVariantIndex?: number;
  isReopen?: boolean;
}
