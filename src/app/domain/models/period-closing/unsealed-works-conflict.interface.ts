// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * The refusal of a period close because services of the period are not confirmed yet.
 * @param count - Number of unconfirmed services of the period, including those the caller may not see
 * @param works - The first of them the caller may see
 */

import { UnsealedWork } from './unsealed-work.interface';

export interface UnsealedWorksConflict {
  count: number;
  works: UnsealedWork[];
}
