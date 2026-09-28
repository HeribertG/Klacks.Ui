// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IMembership } from './i-membership';
import { IBreakPlaceholder } from '../break/break-class';

export interface IClientBreak {
  id: string | undefined;
  idNumber: number;
  company: string;
  title: string;
  name: string;
  firstName: string;
  secondName: string;
  maidenName: string;
  birthdate: Date | undefined;
  membership: IMembership | undefined;
  gender: string;
  legalEntity: boolean;
  type: number | string;
  breakPlaceholders: IBreakPlaceholder[];
}
