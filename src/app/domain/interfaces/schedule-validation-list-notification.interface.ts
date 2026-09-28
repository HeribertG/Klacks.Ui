// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IScheduleValidationNotification } from './schedule-validation-notification.interface';

export interface IScheduleValidationListNotification {
  entries: IScheduleValidationNotification[];
  isFullRefresh: boolean;
  checkedClientId?: string;
  checkedDate?: string;
  analyseToken?: string | null;
}
