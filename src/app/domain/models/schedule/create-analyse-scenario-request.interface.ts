// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ICreateAnalyseScenarioRequest {
  name: string;
  description?: string;
  groupId?: string;
  fromDate: string;
  untilDate: string;
  /** Variants (keys) whose shifts the scenario carries; absent or empty for a scenario without keys. */
  variantIds?: string[];
}
