// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IReportNavigationOutcomeRequest {
  route: string;
  target?: string;
  outcome: string;
  locale: string;
  utterance?: string;
}
