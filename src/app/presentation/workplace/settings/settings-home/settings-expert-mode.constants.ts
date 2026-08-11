// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export const SETTINGS_EXPERT_MODE_SECTIONS: ReadonlySet<string> = new Set([
  'work',
  'compliance',
  'llm',
  'klacksy',
  'externalServices',
  'erp',
  'plugins',
  'system',
]);

export const SETTINGS_EXPERT_MODE_CARD_TARGETS: ReadonlySet<string> = new Set([
  'data-retention',
  'export-formats',
  'export-format-overrides',
  'identity-providers',
  'email-config',
  'imap-setting',
]);
