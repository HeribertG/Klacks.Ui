// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { GenderEnum } from 'src/app/domain/enums/client-enum';
import { Membership } from '../client/client-class';
import { Work } from './schedule-class';
import { IScheduleQualification } from './schedule-qualification.interface';

export interface IClientWork {
  company?: string;
  firstName?: string;
  gender: GenderEnum;
  id: string;
  idNumber: number;
  legalEntity: boolean;
  maidenName?: string;
  membership?: Membership;
  membershipId: string;
  name?: string;
  secondName?: string;
  title?: string;
  type: number;
  neededRows: number;
  displayRows: number;
  works: Work[];
  hasContract: boolean;
  memberSince?: string;
  memberUntil?: string;
  groupItemValidFrom?: string;
  groupItemValidUntil?: string;
  qualifications: IScheduleQualification[];
}
