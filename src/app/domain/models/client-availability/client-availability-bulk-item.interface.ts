// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * One hour sent to the availability bulk endpoint.
 * @param isAvailable - true = can work, false = blocked, null = remove the stored hour (no entry)
 */
export interface IClientAvailabilityBulkItem {
  id: string;
  clientId: string;
  date: string;
  hour: number;
  isAvailable: boolean | null;
}
