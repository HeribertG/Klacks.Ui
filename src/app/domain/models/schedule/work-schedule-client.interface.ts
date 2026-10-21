// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IScheduleQualification } from './schedule-qualification.interface';

export interface IWorkScheduleClient {
  id: string;
  company: string | null;
  firstName: string | null;
  name: string | null;
  secondName: string | null;
  title: string | null;
  maidenName: string | null;
  gender: number;
  idNumber: number;
  legalEntity: boolean;
  type: number;
  neededRows: number;
  hasContract: boolean;
  memberSince?: string | null;
  memberUntil?: string | null;
  groupItemValidFrom?: string | null;
  groupItemValidUntil?: string | null;
  qualifications: IScheduleQualification[];
}
