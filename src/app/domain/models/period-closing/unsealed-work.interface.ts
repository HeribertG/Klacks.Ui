// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * One service that keeps a period from being closed, as the 409 answer of the seal lists it.
 * @param workId - Id of the work
 * @param clientId - Id of the person
 * @param clientName - Display name of the person
 * @param date - Day of the service as yyyy-MM-dd
 * @param startTime - Start as HH:mm:ss
 * @param endTime - End as HH:mm:ss
 * @param shiftName - Name of the shift
 */

export interface UnsealedWork {
  workId: string;
  clientId: string;
  clientName: string;
  date: string;
  startTime: string;
  endTime: string;
  shiftName: string;
}
