// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Model for a required qualification on a shift. MinLevel is the minimum proficiency level;
 * IsMandatory gates eligibility (true = hard requirement, false = soft preference).
 */
import { QualificationLevel } from '../../enums/qualification-level.enum';

export interface IShiftRequiredQualification {
  id?: string;
  shiftId?: string;
  qualificationId?: string;
  isMandatory: boolean;
  minLevel: QualificationLevel;
}

export class ShiftRequiredQualification implements IShiftRequiredQualification {
  id?: string;
  shiftId?: string;
  qualificationId?: string;
  isMandatory = false;
  minLevel: QualificationLevel = QualificationLevel.Basic;
}
