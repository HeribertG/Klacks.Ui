// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PaymentInterval } from '../contract/payment-interval.enum';
import { ICalendarSelection } from '../calendar/calendar-selection.interface';
import { IGroup } from './group.interface';
import { GroupItem } from './group-item-class';
import { companyToday, parseCalendarDate } from 'src/app/shared/helpers/calendar-date.helper';

export class Group implements IGroup {
  id?: string;
  name = '';
  description = '';
  validFrom: Date = companyToday();
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
        : parseCalendarDate(data.validFrom) ?? companyToday();

    this.validUntil =
      data.validUntil instanceof Date
        ? data.validUntil
        : parseCalendarDate(data.validUntil) ?? undefined;

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
