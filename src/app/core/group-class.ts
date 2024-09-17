import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import {
  BaseFilter,
  BaseTruncated,
  IBaseFilter,
  IBaseTruncated,
} from './general-class';
import { Client, IClient } from './client-class';

export interface IGroup {
  id: string | undefined;
  name: string;
  description: string;
  validFrom: Date;
  validUntil: Date | undefined;
  internalValidFrom: NgbDateStruct | undefined;
  internalValidUntil: NgbDateStruct | undefined;
  groupItems: IGroupItem[];
}

export class Group implements IGroup {
  id: string | undefined = undefined;
  name = '';
  description = '';
  validFrom = new Date();
  validUntil: Date | undefined = undefined;
  internalValidFrom: NgbDateStruct | undefined = undefined;
  internalValidUntil: NgbDateStruct | undefined = undefined;
  groupItems: GroupItem[] = [];
}

export interface IGroupItem {
  id: string | undefined;
  groupId: string | undefined;
  clientId: string | undefined;
  client: IClient | undefined;
}

export class GroupItem implements IGroupItem {
  id: string | undefined = undefined;
  groupId: string | undefined = undefined;
  clientId: string | undefined = undefined;
  client: Client | undefined = undefined;
}

export interface ITruncatedGroup extends IBaseTruncated {
  groups: IGroup[];
}

export class TruncatedGroup extends BaseTruncated implements ITruncatedGroup {
  groups = [];
}

export interface IGroupFilter extends IBaseFilter {
  scopeFromFlag: boolean | undefined;
  scopeUntilFlag: boolean | undefined;
  scopeFrom: Date | undefined;
  internalScopeFrom: NgbDateStruct | undefined;
  scopeUntil: Date | undefined;
  internalScopeUntil: NgbDateStruct | undefined;
  showDeleteEntries: boolean | undefined;
  activeDateRange: boolean;
  formerDateRange: boolean;
  futureDateRange: boolean;
}

export class GroupFilter extends BaseFilter implements IGroupFilter {
  scopeFromFlag = undefined;
  scopeUntilFlag = undefined;
  scopeFrom = undefined;
  internalScopeFrom = undefined;
  scopeUntil = undefined;
  internalScopeUntil = undefined;
  showDeleteEntries = false;
  activeDateRange = false;
  formerDateRange = false;
  futureDateRange = false;

  override orderBy = 'name';
  override sortOrder = 'asc';

  setEmpty() {
    this.activeDateRange = true;
    this.formerDateRange = false;
    this.futureDateRange = false;
  }
}
