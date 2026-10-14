// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Backend path of the autofill run presence: the runs in progress the caller may see. The schedule asks for it in
 * the background, so the HTTP interceptor treats its failures as a quiet background poll (no toast, no error page).
 */

export const AUTOFILL_RUNS_ACTIVE_PATH = 'AutofillRuns/Active';
