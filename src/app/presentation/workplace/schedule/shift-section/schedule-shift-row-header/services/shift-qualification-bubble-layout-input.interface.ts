// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IScheduleQualification } from 'src/app/domain/models/schedule/schedule-qualification.interface';

export interface ShiftQualificationBubbleLayoutInput {
  qualifications: IScheduleQualification[];
  cellWidth: number;
  cellHeight: number;
  zoom: number;
  isRtl: boolean;
  iconReserve: number;
  anchorReserve: number;
}
