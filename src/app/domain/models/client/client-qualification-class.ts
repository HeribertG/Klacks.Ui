// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IClientQualification } from './client-qualification.interface';
import { QualificationLevel } from 'src/app/domain/enums/qualification-level.enum';

export class ClientQualification implements IClientQualification {
  id?: string;
  clientId?: string;
  qualificationId?: string;
  level: number = QualificationLevel.Basic;
  validFrom?: Date;
  validUntil?: Date;
  note?: string;
}
