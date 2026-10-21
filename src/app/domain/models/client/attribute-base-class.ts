// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { BaseEntity } from '../general-class';
import { IAttributeBase } from './attribute-base.interface';
import { IAttributeValue } from './attribute-value.interface';

export class AttributeBase extends BaseEntity implements IAttributeBase {
  id = null;
  name = '';
  position = 0;
  isDirty = 0;
  sealed = false;
  type = 0;
  key = 0;
  hide = false;
  hasSections = false;
  hasWorkshops = false;
  hasQualifications = false;
  hasHistory = false;
  hasAccount = false;
  hasInvoice = false;
  hasAnnualFee = false;
  kindOfCollection = -1;
  nameOfCollection = '';
  attributeValues: IAttributeValue[] = [];
}
