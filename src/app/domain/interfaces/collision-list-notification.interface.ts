// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ICollisionNotification } from './collision-notification.interface';

export interface ICollisionListNotification {
  collisions: ICollisionNotification[];
  isFullRefresh: boolean;
  checkedClientId?: string;
  checkedDate?: string;
  analyseToken?: string | null;
}
