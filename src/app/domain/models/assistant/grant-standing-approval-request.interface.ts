// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Request body for granting a standing approval; the duration is sent in days, never as an instant.
 * @param triggerKind - Finding type to approve in advance
 * @param groupId - Group to limit the approval to; null for the whole installation
 * @param durationDays - How long the approval applies
 * @param dailyBudget - Actions allowed per day
 */
export interface IGrantStandingApprovalRequest {
  triggerKind: string;
  groupId: string | null;
  durationDays: number;
  dailyBudget: number;
}
