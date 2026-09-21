// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Limits and status values of standing approvals, mirrored from
 * Klacks.Api/Domain/Constants/StandingApprovalDefaults.cs. The server refuses values outside these
 * limits; the form uses them only to stop an obviously invalid request before it is sent.
 */
export const STANDING_APPROVAL_LIMITS = {
  DefaultDurationDays: 30,
  MinimumDurationDays: 1,
  MaximumDurationDays: 90,
  DefaultDailyBudget: 20,
  MinimumDailyBudget: 1,
  MaximumDailyBudget: 100,
} as const;

export const STANDING_APPROVAL_STATUS = {
  Active: 'active',
  Expired: 'expired',
  Revoked: 'revoked',
} as const;

export type StandingApprovalStatus =
  (typeof STANDING_APPROVAL_STATUS)[keyof typeof STANDING_APPROVAL_STATUS];

export const STANDING_APPROVAL_HTTP_CONFLICT = 409;

export const STANDING_APPROVAL_SHORT_ID_LENGTH = 8;
