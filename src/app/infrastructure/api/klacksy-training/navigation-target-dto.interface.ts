// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface NavigationTargetDto {
  targetId: string;
  route: string;
  labelKey: string;
  category?: string;
  synonyms: Record<string, string[]>;
  synonymStatus: string;
  obsolete: boolean;
}
