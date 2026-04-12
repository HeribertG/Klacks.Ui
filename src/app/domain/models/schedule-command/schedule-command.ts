// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Interfaces for schedule command resources (FREE, EARLY, LATE, NIGHT keywords).
 * @param commandKeyword - The command keyword string (e.g. 'FREE', '-EARLY')
 */

export interface ScheduleCommandRequest {
  clientId: string;
  currentDate: string;
  commandKeyword: string;
}

export interface ScheduleCommandResource {
  id: string;
  clientId: string;
  currentDate: string;
  commandKeyword: string;
}
