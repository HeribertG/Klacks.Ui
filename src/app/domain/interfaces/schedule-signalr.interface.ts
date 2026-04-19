// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { IWorkNotification } from './work-notification.interface';
import { IScheduleNotification } from './schedule-notification.interface';
import { IShiftStatsNotification } from './shift-stats-notification.interface';
import {
  IPeriodHoursNotification,
  IPeriodHoursRecalculatedNotification,
} from './period-hours-notification.interface';
import { IScheduleChangeNotification } from './schedule-change-notification.interface';
import { ICollisionListNotification } from './collision-notification.interface';
import { IScheduleValidationListNotification } from './schedule-validation-list-notification.interface';

export interface IScheduleSignalR {
  workCreated$: Observable<IWorkNotification>;
  workUpdated$: Observable<IWorkNotification>;
  workDeleted$: Observable<IWorkNotification>;
  scheduleUpdated$: Observable<IScheduleNotification>;
  shiftStatsUpdated$: Observable<IShiftStatsNotification>;
  periodHoursUpdated$: Observable<IPeriodHoursNotification>;
  periodHoursRecalculated$: Observable<IPeriodHoursRecalculatedNotification>;
  scheduleChangeTracked$: Observable<IScheduleChangeNotification>;
  collisionsDetected$: Observable<ICollisionListNotification>;
  scheduleValidationsDetected$: Observable<IScheduleValidationListNotification>;
  connectionId: string;
  joinScheduleGroup(startDate: string, endDate: string, analyseToken?: string | null): Promise<void>;
  leaveScheduleGroup(startDate: string, endDate: string, analyseToken?: string | null): Promise<void>;
  setSelectedGroup(selectedGroupId: string): Promise<void>;
}

export const SCHEDULE_SIGNALR = new InjectionToken<IScheduleSignalR>('IScheduleSignalR');
