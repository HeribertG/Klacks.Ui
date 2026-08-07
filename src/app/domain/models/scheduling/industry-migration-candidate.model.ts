// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
