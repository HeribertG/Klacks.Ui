// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ContractFormModel {
  name: string;
  nightRate: number | null;
  holidayRate: number | null;
  we1Rate: number | null;
  we2Rate: number | null;
  we3Rate: number | null;
  nightStart: string;
  nightEnd: string;
}
