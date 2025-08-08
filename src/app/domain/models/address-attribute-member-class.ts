import { BaseEntity, IBaseEntity } from './general-class';

export interface IAttributeValue extends IBaseEntity {
  id: string | null;
  name: string | null;
  position: number;
  isDirty: number | null;
  value: number;
  valueStr: string | null;
}

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

export class AttributeValue extends BaseEntity implements IAttributeValue {
  id = null;
  name = '';
  position = 0;
  isDirty = 0;
  value = 0;
  valueStr = '';
}

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
