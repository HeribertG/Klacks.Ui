// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Header that marks one user action on a creating request. A retry of the same request carries the same value, so the
 * server answers it from the first execution instead of creating the entry twice.
 */

export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';
