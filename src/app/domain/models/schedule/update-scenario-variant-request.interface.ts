// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IUpdateScenarioVariantRequest {
  name: string;
  description?: string;
  fromDate: string;
  untilDate: string;
}
