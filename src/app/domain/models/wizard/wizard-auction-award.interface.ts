// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface WizardAuctionAward {
  agentId: string;
  date: string;
  shiftId: string;
  round: number;
  winningScore: number;
  firedRules: string[];
}
