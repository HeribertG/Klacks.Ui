// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Model for a required qualification on a shift. MinLevel is the minimum proficiency level;
 * IsMandatory gates eligibility (true = hard requirement, false = soft preference). LevelBindingOverride decides
 * whether a too-low level blocks on this shift: true = binding, false = hint only, null = as the qualification
 * (IQualification.isLevelBinding).
 */
import { IShiftRequiredQualification } from './shift-required-qualification.interface';
import { QualificationLevel } from '../../enums/qualification-level.enum';

export class ShiftRequiredQualification implements IShiftRequiredQualification {
  id?: string;
  shiftId?: string;
  qualificationId?: string;
  isMandatory = false;
  minLevel: QualificationLevel = QualificationLevel.Basic;
  levelBindingOverride: boolean | null = null;
}
