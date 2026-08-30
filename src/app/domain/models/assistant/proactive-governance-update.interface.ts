// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Patch payload for the governance endpoint: only the supplied fields are written.
 * @param autonomyLevel - New global autonomy level (0–3); caps every rule from above
 * @param triggerKind - Omitted when only the master off switch is being flipped
 * @param groupId - Restricts the rule to one group instead of the whole installation
 * @param maxAction - New ceiling for this finding type
 * @param enabled - Whether Klacksy may handle this finding type autonomously at all
 * @param responsibleOwnerUserId - Account a prepared or executed action runs under
 * @param clearResponsibleOwner - True removes the accountable person; a null id alone cannot say that
 * @param dailyActionBudget - Actions allowed per day for this finding type
 * @param windowActionLimit - Actions allowed inside one window before the breaker trips
 * @param windowMinutes - Length of that window in minutes
 * @param killSwitch - New state of the master off switch
 */
export interface IProactiveGovernanceUpdate {
  autonomyLevel?: number;
  triggerKind?: string;
  groupId?: string | null;
  maxAction?: number;
  enabled?: boolean;
  responsibleOwnerUserId?: string | null;
  clearResponsibleOwner?: boolean;
  dailyActionBudget?: number;
  windowActionLimit?: number;
  windowMinutes?: number;
  killSwitch?: boolean;
}
