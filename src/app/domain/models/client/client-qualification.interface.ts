// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IClientQualification {
  id?: string;
  clientId?: string;
  qualificationId?: string;
  level: number;
  validFrom?: Date;
  validUntil?: Date;
  note?: string;
}
