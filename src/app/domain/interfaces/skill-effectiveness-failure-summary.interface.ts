// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ISkillEffectivenessFailureSummary {
  totalRows: number;
  notFound: number;
  permissionDenied: number;
  parameterInvalid: number;
  gateHold: number;
  uiActionContext: number;
  exception: number;
  hallucinationRate: number;
}
