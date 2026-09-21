// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * One advance approval an administrator gave for a finding type: while it is active Klacksy carries
 * that type out without asking, under the identity of the account that granted it.
 * @param id - Identifier of the approval
 * @param triggerKind - Finding type the approval covers
 * @param groupId - Group the approval is limited to; null means the whole installation
 * @param grantedByUserId - Account whose identity and rights every execution borrows
 * @param grantedAtUtc - Instant the approval was granted
 * @param expiresAtUtc - Instant the approval stops applying
 * @param dailyBudget - Actions allowed per day under this approval
 * @param revokedAtUtc - Instant the approval was revoked; null while it was never revoked
 * @param revokedByUserId - Account that revoked it
 * @param isActive - True while the approval is neither expired nor revoked
 */
export interface IStandingApproval {
  id: string;
  triggerKind: string;
  groupId: string | null;
  grantedByUserId: string;
  grantedAtUtc: string;
  expiresAtUtc: string;
  dailyBudget: number;
  revokedAtUtc: string | null;
  revokedByUserId: string | null;
  isActive: boolean;
}
