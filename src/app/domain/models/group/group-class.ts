// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  BaseFilter,
  BaseTruncated,
  IBaseFilter,
  IBaseTruncated,
} from '../general-class';
import { Client, IClient } from '../client/client-class';
import { PaymentInterval } from '../contract/contract-class';
import { ICalendarSelection } from '../calendar/calendar-selection-class';

export interface IGroup {
  id?: string;
  name: string;
  description: string;
  validFrom: Date;
  validUntil?: Date;
  groupItems: IGroupItem[];
  parent?: string;
  root?: string;
  lft: number;
  rgt: number;
  depth: number;
  clientsCount: number;
  shiftsCount: number;
  customersCount: number;
  employeesCount: number;
  externEmpsCount: number;
  children?: IGroup[];
  clientIds?: string[];
  paymentInterval: PaymentInterval;
  calendarSelectionId?: string;
  calendarSelection?: ICalendarSelection;
}

export class Group implements IGroup {
  id?: string;
  name = '';
  description = '';
  validFrom: Date = new Date();
  validUntil?: Date;
  parent?: string;
  root?: string;
  lft = 0;
  rgt = 0;
  depth = 0;
  clientsCount = 0;
  shiftsCount = 0;
  customersCount = 0;
  employeesCount = 0;
  externEmpsCount = 0;
  children: Group[] = [];
  clientIds?: string[] = [];
  groupItems: GroupItem[] = [];
  paymentInterval: PaymentInterval = PaymentInterval.Monthly;
  calendarSelectionId?: string;
  calendarSelection?: ICalendarSelection;

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

    this.parent = data.parent;
    this.root = data.root;
    this.lft = data.lft || 0;
    this.rgt = data.rgt || 0;
    this.depth = data.depth || 0;
    this.clientsCount = data.clientsCount || 0;
    this.shiftsCount = data.shiftsCount || 0;
    this.customersCount = data.customersCount || 0;
    this.employeesCount = data.employeesCount || 0;
    this.externEmpsCount = data.externEmpsCount || 0;
    this.paymentInterval = data.paymentInterval ?? PaymentInterval.Monthly;
    this.calendarSelectionId = data.calendarSelectionId;
    this.calendarSelection = data.calendarSelection;
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
  group?: IGroup;
  validFrom?: Date;
  validUntil?: Date;
}

export class GroupItem implements IGroupItem {
  id?: string;
  groupId?: string;
  clientId?: string;
  client?: Client;
  group?: Group;
  validFrom?: Date;
  validUntil?: Date;
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
  scopeUntil?: Date;
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
  scopeUntil?: Date;
  showDeleteEntries = false;
  activeDateRange = true;
  formerDateRange = false;
  futureDateRange = false;

  override orderBy = 'name';
  override sortOrder = 'asc';

  selectedGroup: string | undefined = undefined;

}

export interface IGroupTree {
  rootId?: string;
  nodes: IGroup[];
}

export class GroupTree implements IGroupTree {
  rootId?: string;
  nodes: Group[] = [];
}

export interface IGroupVisibility {
  id?: string;
  groupId?: string;
  appUserId?: string;
}

export class GroupVisibility implements IGroupVisibility {
  id?: string;
  groupId?: string;
  appUserId?: string;
}
