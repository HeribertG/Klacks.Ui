// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IExcludedCandidate {
  clientId: string;
  name: string;
  reason: string;
  /** The person belongs to a sister group under the same root; absent on older servers (= false). */
  isBorrowed?: boolean;
}
