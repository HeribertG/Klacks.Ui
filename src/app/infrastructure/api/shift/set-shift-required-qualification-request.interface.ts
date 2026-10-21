// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { QualificationLevel } from 'src/app/domain/enums/qualification-level.enum';

export interface SetShiftRequiredQualificationRequest {
  shiftId: string;
  qualificationId: string;
  isMandatory: boolean;
  minLevel: QualificationLevel;
  levelBindingOverride: boolean | null;
}
