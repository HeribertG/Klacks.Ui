// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export enum SpamRuleType {
  SenderContains = 0,
  SenderDomain = 1,
  SubjectContains = 2,
  BodyContains = 3,
}

export const SPAM_RULE_TYPE_LABELS: Record<SpamRuleType, string> = {
  [SpamRuleType.SenderContains]: 'Sender Contains',
  [SpamRuleType.SenderDomain]: 'Sender Domain',
  [SpamRuleType.SubjectContains]: 'Subject Contains',
  [SpamRuleType.BodyContains]: 'Body Contains',
};

export interface ISpamRule {
  id: string;
  ruleType: SpamRuleType;
  pattern: string;
  isActive: boolean;
  sortOrder: number;
}
