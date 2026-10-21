// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { QualificationLevel } from '../../enums/qualification-level.enum';

export interface IShiftRequiredQualification {
  id?: string;
  shiftId?: string;
  qualificationId?: string;
  isMandatory: boolean;
  minLevel: QualificationLevel;
  levelBindingOverride: boolean | null;
}
