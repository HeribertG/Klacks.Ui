// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Answer of the anonymous playground status endpoint.
 * @param limitActive - True only on the public playground instance, where the daily token limit is enforced
 * @param deviceToken - Freshly minted signed device token; null when the request already carried a valid one
 */
export interface PlaygroundStatus {
  limitActive: boolean;
  deviceToken: string | null;
}
