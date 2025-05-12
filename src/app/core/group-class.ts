import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import {
  BaseFilter,
  BaseTruncated,
  IBaseFilter,
  IBaseTruncated,
} from './general-class';
import { Client, IClient } from './client-class';

export interface IGroup {
  id?: string;
  name: string;
  description: string;
  validFrom: Date;
  validUntil?: Date;
  internalValidFrom?: NgbDateStruct;
  internalValidUntil?: NgbDateStruct;
  groupItems: IGroupItem[];
  parent?: string;
  root?: string;
  lft: number;
  rgt: number;
  depth: number;
  clientsCount: number;
  children?: IGroup[];
  clientIds?: string[];
}

export class Group implements IGroup {
  id?: string;
  name: string = '';
  description: string = '';
  validFrom: Date = new Date();
  validUntil?: Date;
  internalValidFrom?: NgbDateStruct;
  internalValidUntil?: NgbDateStruct;
  parent?: string;
  root?: string;
  lft: number = 0;
  rgt: number = 0;
  depth: number = 0;
  clientsCount: number = 0;
  children: Group[] = [];
  clientIds?: string[] = [];
  groupItems: GroupItem[] = [];

  constructor(data?: Partial<IGroup>) {
    if (!data) return;

    this.id = data.id;
    this.name = data.name || '';
    this.description = data.description || '';
    this.validFrom =
      data.validFrom instanceof Date
        ? data.validFrom
        : new Date(data.validFrom || new Date());

    this.validUntil = data.validUntil
      ? data.validUntil instanceof Date
        ? data.validUntil
        : new Date(data.validUntil)
      : undefined;

    this.internalValidFrom = data.internalValidFrom;
    this.internalValidUntil = data.internalValidUntil;
    this.parent = data.parent;
    this.root = data.root;
    this.lft = data.lft || 0;
    this.rgt = data.rgt || 0;
    this.depth = data.depth || 0;
    this.clientsCount = data.clientsCount || 0;
    this.clientIds = data.clientIds || [];
    this.groupItems = data.groupItems
      ? data.groupItems.map((item) => {
          const groupItem = new GroupItem();
          Object.assign(groupItem, item);
          return groupItem;
        })
      : [];

    this.children = [];
    if (data.children && Array.isArray(data.children)) {
      this.children = data.children.map((child) => {
        if (child instanceof Group) {
          return child;
        }
        return new Group(child);
      });
    }
  }
}

export interface IGroupItem {
  id?: string;
  groupId?: string;
  clientId?: string;
  client?: IClient;
}

export class GroupItem implements IGroupItem {
  id?: string;
  groupId?: string;
  clientId?: string;
  client?: Client;
}

export interface ITruncatedGroup extends IBaseTruncated {
  groups: IGroup[];
}

export class TruncatedGroup extends BaseTruncated implements ITruncatedGroup {
  groups: IGroup[] = [];
}

export interface IGroupFilter extends IBaseFilter {
  scopeFromFlag?: boolean;
  scopeUntilFlag?: boolean;
  scopeFrom?: Date;
  internalScopeFrom?: NgbDateStruct;
  scopeUntil?: Date;
  internalScopeUntil?: NgbDateStruct;
  showDeleteEntries?: boolean;
  activeDateRange: boolean;
  formerDateRange: boolean;
  futureDateRange: boolean;
  selectedGroup: string | undefined;
}

export class GroupFilter extends BaseFilter implements IGroupFilter {
  scopeFromFlag?: boolean;
  scopeUntilFlag?: boolean;
  scopeFrom?: Date;
  internalScopeFrom?: NgbDateStruct;
  scopeUntil?: Date;
  internalScopeUntil?: NgbDateStruct;
  showDeleteEntries: boolean = false;
  activeDateRange: boolean = false;
  formerDateRange: boolean = false;
  futureDateRange: boolean = false;

  override orderBy: string = 'name';
  override sortOrder: string = 'asc';

  selectedGroup: string | undefined = undefined;

  setEmpty(): void {
    this.activeDateRange = true;
    this.formerDateRange = false;
    this.futureDateRange = false;
  }
}

export interface IGroupTree {
  rootId?: string;
  nodes: IGroup[];
}

export class GroupTree implements IGroupTree {
  rootId?: string;
  nodes: Group[] = [];
}
