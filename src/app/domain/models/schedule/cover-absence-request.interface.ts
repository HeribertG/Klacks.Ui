// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ICoverAbsenceRequest {
  clientId: string;
  date: string;
  groupId: string;
  absenceId: string;
  /** Last day of a multi-day absence; omit for a single day. */
  untilDate?: string;
  /** Let a supervisor push the proposal through a rule that only blocks in escalation mode. */
  overrideBlock?: boolean;
  /**
   * Wake the group's escalation roster (planner call list) for the affected shifts. Off when the planner
   * handles the absence interactively; the backend defaults to on for unattended callers (skill/MCP).
   */
  notifyEscalationRoster?: boolean;
  /** The planner's language; the server writes the scenario name in it, falling back to the installation language. */
  language?: string;
  /** When the absence was reported (ISO UTC); the server uses "now" when omitted. */
  reportedAtUtc?: string;
  /**
   * Token of the scenario the planner works in; the server builds the cover on that scenario (a copy of it plus the
   * absence) instead of the real plan. Omit in the original plan.
   */
  analyseToken?: string;
}
