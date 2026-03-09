// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface ScheduleNoteRequest {
  clientId: string;
  currentDate: string;
  content: string;
}

export interface ScheduleNoteResource {
  id: string;
  clientId: string;
  currentDate: string;
  content: string;
}
