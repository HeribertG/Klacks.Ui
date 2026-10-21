// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IBaseEntity } from '../base-entity.interface';

export interface IAttributeValue extends IBaseEntity {
  id: string | null;
  name: string | null;
  position: number;
  isDirty: number | null;
  value: number;
  valueStr: string | null;
}
