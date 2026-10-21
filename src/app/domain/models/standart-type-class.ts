// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { BaseEntity } from './general-class';
import { IStandartType } from './standart-type.interface';

export class StandartType extends BaseEntity implements IStandartType {
  id = undefined;
  name = '';
  position = 0;
}
