// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IIndustryMigrationCandidate {
  contractId: string;
  contractName: string;
  schedulingRuleId: string;
  schedulingRuleName: string;
  industry: string;
  affectedClientCount: number;
  suggestedRuleId?: string | null;
  suggestedRuleName?: string | null;
}
