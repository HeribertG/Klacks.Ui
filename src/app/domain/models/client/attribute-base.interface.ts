// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IBaseEntity } from '../base-entity.interface';
import { IAttributeValue } from './attribute-value.interface';

export interface IAttributeBase extends IBaseEntity {
  id: string | null;
  name: string | null;
  position: number;
  isDirty: number | null;
  sealed: boolean;
  type: number;
  key: number;
  hide: boolean;
  hasSections: boolean;
  hasWorkshops: boolean;
  hasQualifications: boolean;
  hasHistory: boolean;
  hasAccount: boolean;
  hasInvoice: boolean;
  hasAnnualFee: boolean;
  kindOfCollection: number;
  nameOfCollection: string | null;
  attributeValues: IAttributeValue[];
}
