// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export enum DomainEventType {
  ERROR = 'domain:error',
  SUCCESS = 'domain:success',
  WARNING = 'domain:warning',
  INFO = 'domain:info',
  NAVIGATE = 'domain:navigate',
  SKILL_EXECUTED = 'domain:skill-executed',
  SKILL_UI_ACTION = 'domain:skill-ui-action',
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
