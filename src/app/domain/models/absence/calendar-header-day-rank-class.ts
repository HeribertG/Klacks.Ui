// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Rectangle } from 'src/app/domain/models/geometry/rectangle.model';

export class CalendarHeaderDayRank {
  backColor = '';
  name = '';
  rect: Rectangle = new Rectangle(0, 0, 20, 20);
}
