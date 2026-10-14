// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * A running autofill (AutoWizard) run as every viewer of its group sees it, from the server's presence record.
 * @param runId - Presence id of the run (not the starter's job id)
 * @param groupId - Group the run plans; null = run without a group
 * @param periodFrom - First planned day, "yyyy-MM-dd" (inclusive)
 * @param periodUntil - Last planned day, "yyyy-MM-dd" (inclusive)
 * @param progressPercent - Progress in percent; null while the run reports none
 */
export interface IAutofillRunPresence {
  runId: string;
  groupId: string | null;
  periodFrom: string;
  periodUntil: string;
  progressPercent: number | null;
}
