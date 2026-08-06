// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { IWorkNotification } from './work-notification.interface';
import { IWorksBulkCreatedNotification } from './works-bulk-created-notification.interface';
import { IWizard4CandidateNotification } from './wizard4-candidate-notification.interface';
import { IScheduleNotification } from './schedule-notification.interface';
import { IShiftStatsNotification } from './shift-stats-notification.interface';
import {
  IPeriodHoursNotification,
  IPeriodHoursRecalculatedNotification,
  IThoroughRecalculationCompletedNotification,
} from './period-hours-notification.interface';
import { IScheduleChangeNotification } from './schedule-change-notification.interface';
import { ICollisionListNotification } from './collision-notification.interface';
import { IScheduleValidationListNotification } from './schedule-validation-list-notification.interface';

export interface IScheduleSignalR {
  workCreated$: Observable<IWorkNotification>;
  worksBulkCreated$: Observable<IWorksBulkCreatedNotification>;
  wizard4CandidatesChanged$: Observable<IWizard4CandidateNotification>;
  workUpdated$: Observable<IWorkNotification>;
  workDeleted$: Observable<IWorkNotification>;
  scheduleUpdated$: Observable<IScheduleNotification>;
  shiftStatsUpdated$: Observable<IShiftStatsNotification>;
  periodHoursUpdated$: Observable<IPeriodHoursNotification>;
  periodHoursRecalculated$: Observable<IPeriodHoursRecalculatedNotification>;
  thoroughRecalculationCompleted$: Observable<IThoroughRecalculationCompletedNotification>;
  scheduleChangeTracked$: Observable<IScheduleChangeNotification>;
  collisionsDetected$: Observable<ICollisionListNotification>;
  scheduleValidationsDetected$: Observable<IScheduleValidationListNotification>;
  connectionId: string;
  joinScheduleGroup(startDate: string, endDate: string, analyseToken?: string | null): Promise<void>;
  leaveScheduleGroup(startDate: string, endDate: string, analyseToken?: string | null): Promise<void>;
  setSelectedGroup(selectedGroupId: string): Promise<void>;
}

export const SCHEDULE_SIGNALR = new InjectionToken<IScheduleSignalR>('IScheduleSignalR');
