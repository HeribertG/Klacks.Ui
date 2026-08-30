// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * One governance rule: how far Klacksy may go on its own for a single finding type.
 * @param triggerKind - Canonical finding-type identifier; never shown to the user, only its label
 * @param groupId - Null for the installation-wide rule, set for a group scope exception
 * @param maxAction - Configured ceiling: 0 report only, 1 prepare a scenario, 2 carry out
 * @param maxActionName - Backend spelling of that ceiling
 * @param effectiveMaxAction - What actually applies once the global level, the kill switch and enabled are folded in
 * @param globalAutonomyCap - Ceiling the global autonomy level imposes on this rule
 * @param enabled - False pins the kind to reporting only; it never silences the message
 * @param responsibleOwnerUserId - Account a prepared or executed action runs under
 * @param dailyActionBudget - Actions allowed per day for this kind
 * @param windowActionLimit - Actions allowed inside one window before the breaker trips
 * @param windowMinutes - Length of that window in minutes
 * @param isStored - False when the row is the fail-safe default rather than a saved rule
 */
export interface IProactiveGovernanceRule {
  triggerKind: string;
  groupId: string | null;
  maxAction: number;
  maxActionName: string;
  effectiveMaxAction: number;
  globalAutonomyCap: number;
  enabled: boolean;
  responsibleOwnerUserId: string | null;
  dailyActionBudget: number;
  windowActionLimit: number;
  windowMinutes: number;
  isStored: boolean;
}
