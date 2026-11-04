// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Builds the form value of a new order, duty without a customer or container, with the defaults the new-shift form opens with.
 * @param kind - What the new-shift form creates
 */

import { Shift } from 'src/app/domain/models/shift/shift-class';
import { ShiftStatus } from 'src/app/domain/models/shift/shift-status.enum';
import { ShiftType } from 'src/app/domain/models/shift/shift-type.enum';
import { NewShiftKind } from 'src/app/domain/enums/new-shift-kind.enum';
import { companyToday } from 'src/app/domain/helpers/calendar-date.helper';

export function buildNewShift(kind: NewShiftKind): Shift {
  const value = new Shift();
  value.fromDate = companyToday();
  value.startShift = '07:00:00';
  value.endShift = '15:00:00';
  value.workTime = 8;
  value.beforeShift = '';
  value.afterShift = '';
  value.abbreviation = '';
  value.isMonday = true;
  value.isTuesday = true;
  value.isWednesday = true;
  value.isThursday = true;
  value.isFriday = true;
  value.quantity = 1;
  value.sumEmployees = 1;

  // A duty without a customer is created SEALED, never as a draft. OriginalOrder means "a customer's
  // request still being worked out", so a draft without a customer would be indistinguishable from one
  // where the customer was simply not filled in yet - and after saving, only ClientId = null remains,
  // because isClientless lives in the browser and is gone after a reload. The status carries the
  // intent instead, which the backend enforces: a draft without a customer is refused, and a sealed
  // order without one must already meet the sealing requirements. Owner decision 2026-09-07.
  const clientless = kind === NewShiftKind.Clientless;
  value.status = clientless ? ShiftStatus.SealedOrder : ShiftStatus.OriginalOrder;
  value.isClientless = clientless;

  // A container is a template, not an order: it never names a customer or an address and has no time range. It starts
  // as a draft like an order and becomes its one-row shape when sealed (ContainerShiftRules in the backend).
  if (kind === NewShiftKind.Container) {
    value.shiftType = ShiftType.IsContainer;
    value.clientId = undefined;
    value.addressName = undefined;
    value.isTimeRange = false;
  }

  return value;
}
