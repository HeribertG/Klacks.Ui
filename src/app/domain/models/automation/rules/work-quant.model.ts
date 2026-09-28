// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IWorkQuant {
  startDate: Date;
  endDate: Date;
  workDays: number;
  restDays: number;
  isComplete: boolean;
}
