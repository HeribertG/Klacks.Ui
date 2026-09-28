// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ScheduleNoteRequest {
  clientId: string;
  currentDate: string;
  content: string;
  analyseToken?: string;
}

export interface ScheduleNoteResource {
  id: string;
  clientId: string;
  currentDate: string;
  content: string;
  analyseToken?: string;
}
