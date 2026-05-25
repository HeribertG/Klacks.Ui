// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
}

export interface ErrorEvent {
  message: string;
  code?: string;
  context?: string;
}

export interface SuccessEvent {
  message: string;
  context?: string;
}

export interface WarningEvent {
  message: string;
  context?: string;
}

export interface InfoEvent {
  message: string;
  context?: string;
}

export interface NavigationEvent {
  route: string;
  params?: Record<string, unknown>;
}

export interface SkillExecutedEvent {
  skillName: string;
  clientId?: string;
}

export interface AddressValidationNoLlmEvent {
  errorMessage: string;
}

export interface AddressValidationFailedEvent {
  street: string;
  zip: string;
  city: string;
  country: string;
  state: string;
  suggestions: { displayName: string; latitude: number; longitude: number }[];
}
