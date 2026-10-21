// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IBaseEntity } from './base-entity.interface';

export interface IStandartType extends IBaseEntity {
  id: string | undefined;
  name: string;
  position: number;
}
