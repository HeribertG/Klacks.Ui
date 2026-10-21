// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IClientWork } from './client-work.interface';
import { GenderEnum } from 'src/app/domain/enums/client-enum';
import { Membership } from '../client/client-class';
import { Work } from './schedule-class';
import { IScheduleQualification } from './schedule-qualification.interface';

export class ClientWork implements IClientWork {
  company = '';
  firstName = '';
  gender!: GenderEnum;
  id!: string;
  idNumber!: number;
  legalEntity!: boolean;
  maidenName = '';
  membership?: Membership;
  membershipId!: string;
  memberSince?: string;
  memberUntil?: string;
  groupItemValidFrom?: string;
  groupItemValidUntil?: string;
  name = '';
  secondName = '';

  title = '';
  type!: number;
  neededRows = 3;
  displayRows = 3;
  works: Work[] = [];
  hasContract = false;
  qualifications: IScheduleQualification[] = [];
}
