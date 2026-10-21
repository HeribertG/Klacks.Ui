// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IGroupItem } from './group-item.interface';
import { PaymentInterval } from '../contract/payment-interval.enum';
import { ICalendarSelection } from '../calendar/calendar-selection.interface';

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
