// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface FloorPlanDragData {
  id?: string;
  workId?: string;
  clientId?: string;
  clientName?: string;
  label?: string;
  shiftId?: string;
  abbreviation?: string;
  startTime?: string;
  endTime?: string;
  fromDate?: Date;
  untilDate?: Date;
  markerType?: number;
}
