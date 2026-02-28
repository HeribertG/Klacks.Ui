// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export enum SpamRuleType {
  SenderContains = 0,
  SenderDomain = 1,
  SubjectContains = 2,
  BodyContains = 3,
}

export const SPAM_RULE_TYPE_TRANSLATION_KEYS: Record<SpamRuleType, string> = {
  [SpamRuleType.SenderContains]: 'settings.spam-rules.type.sender-contains',
  [SpamRuleType.SenderDomain]: 'settings.spam-rules.type.sender-domain',
  [SpamRuleType.SubjectContains]: 'settings.spam-rules.type.subject-contains',
  [SpamRuleType.BodyContains]: 'settings.spam-rules.type.body-contains',
};

export interface ISpamRule {
  id: string;
  ruleType: SpamRuleType;
  pattern: string;
  isActive: boolean;
  sortOrder: number;
}
