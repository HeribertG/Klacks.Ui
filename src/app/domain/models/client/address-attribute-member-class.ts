// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IAttributeValue } from './attribute-value.interface';
import { BaseEntity } from '../general-class';

export class AttributeValue extends BaseEntity implements IAttributeValue {
  id = null;
  name = '';
  position = 0;
  isDirty = 0;
  value = 0;
  valueStr = '';
}
