// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Interfaces for schedule command resources (FREE, EARLY, LATE, NIGHT keywords).
 * @param commandKeyword - The command keyword string (e.g. 'FREE', '-EARLY')
 */

export interface ScheduleCommandRequest {
  clientId: string;
  currentDate: string;
  commandKeyword: string;
  analyseToken?: string;
}

export interface ScheduleCommandResource {
  id: string;
  clientId: string;
  currentDate: string;
  commandKeyword: string;
  analyseToken?: string;
}
