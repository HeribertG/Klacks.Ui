// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface AutoWizardStartRequest {
  periodFrom: string;
  periodUntil: string;
  agentIds: string[];
  shiftIds: string[];
  groupId: string | null;
  analyseToken: string | null;
  language: string | null;
  agentOrderIsUserDefined: boolean;
}
