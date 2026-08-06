// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * A suggestion of the background optimiser appeared, was replaced by a newer one, or timed out.
 * @param scenarioId - Scenario the change is about; absent when several were affected at once
 * @param groupId - Group the candidate belongs to
 * @param fromDate - Start of the candidate's period
 * @param untilDate - End of the candidate's period
 * @param changeKind - Created, Superseded or Expired
 */
export interface IWizard4CandidateNotification {
  scenarioId?: string | null;
  groupId?: string | null;
  fromDate: string;
  untilDate: string;
  changeKind: 'Created' | 'Superseded' | 'Expired';
}
