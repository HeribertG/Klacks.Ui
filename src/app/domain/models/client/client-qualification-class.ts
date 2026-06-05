// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { QualificationLevel } from 'src/app/domain/enums/qualification-level.enum';

export interface IClientQualification {
  id?: string;
  clientId?: string;
  qualificationId?: string;
  level: number;
  validFrom?: Date;
  validUntil?: Date;
  note?: string;
}

export class ClientQualification implements IClientQualification {
  id?: string;
  clientId?: string;
  qualificationId?: string;
  level: number = QualificationLevel.Basic;
  validFrom?: Date;
  validUntil?: Date;
  note?: string;
}
