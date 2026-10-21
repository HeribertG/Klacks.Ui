// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export enum DomainEventType {
  ERROR = 'domain:error',
  SUCCESS = 'domain:success',
  WARNING = 'domain:warning',
  INFO = 'domain:info',
  NAVIGATE = 'domain:navigate',
  SKILL_EXECUTED = 'domain:skill-executed',
  SKILL_UI_ACTION = 'domain:skill-ui-action',
  ADDRESS_VALIDATION_FAILED = 'domain:address-validation-failed',
  ADDRESS_VALIDATION_NO_LLM = 'domain:address-validation-no-llm',
  KLACKSY_TARGET_REQUESTED = 'domain:klacksy-target-requested',
  UNDO_OFFERED = 'domain:undo-offered',
}
