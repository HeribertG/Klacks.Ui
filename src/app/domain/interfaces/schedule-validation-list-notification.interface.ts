// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { IScheduleValidationNotification } from './schedule-validation-notification.interface';

export interface IScheduleValidationListNotification {
  entries: IScheduleValidationNotification[];
  isFullRefresh: boolean;
  checkedClientId?: string;
  checkedDate?: string;
  analyseToken?: string | null;
}
