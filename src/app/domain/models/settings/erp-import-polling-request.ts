// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Options of one ERP import polling session.
 * @param graceMs - Scheduled poll offset (ms after the session start) before which "nothing pending" does not end
 *   the session (used after a queued manual run, whose inbox-folder files are registered only when the run starts)
 * @param skipImmediateFetch - Start with the first backoff poll instead of an immediate one, because the caller
 *   has just loaded the listing itself
 */

export interface IErpImportPollingRequest {
  graceMs: number;
  skipImmediateFetch: boolean;
}
