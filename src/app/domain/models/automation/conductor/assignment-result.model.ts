// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IAssignmentResult {
  shiftId: string;
  shiftName: string;
  date: Date;
  agentId: string;
  agentName: string;
  motivation: number;
  hours: number;
}
