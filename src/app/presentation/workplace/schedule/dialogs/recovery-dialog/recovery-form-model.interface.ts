// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IRecoveryFormModel {
  selectedClientId: string;
  selectedAbsenceId: string;
  selectedDate: string;
  selectedUntilDate: string;
  overrideBlock: boolean;
  notifyEscalationRoster: boolean;
}
