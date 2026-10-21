// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IScheduleQualification } from 'src/app/domain/models/schedule/schedule-qualification.interface';

/** A single bubble slot before it is positioned on the canvas. */
export interface QualificationBubbleSlot {
  emoji: string;
  overflowCount: number;
  qualification: IScheduleQualification | null;
}
