// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { IShift, ShiftStatus } from 'src/app/domain/models/shift/shift-class';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';
import { EditShiftAddressComponent } from './edit-shift-address.component';

describe('EditShiftAddressComponent isFieldsDisabled', () => {
  let writeAllowed: boolean;
  let editShift: Partial<IShift>;

  const createComponent = (): EditShiftAddressComponent => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DataManagementShiftService,
          useValue: { editShift, isReset: signal(false), isRead: signal(false) },
        },
        { provide: AuthorizationService, useValue: { hasPermission: () => writeAllowed } },
        { provide: DataClientService, useValue: {} },
      ],
    });
    TestBed.overrideComponent(EditShiftAddressComponent, { set: { template: '', imports: [] } });

    return TestBed.createComponent(EditShiftAddressComponent).componentInstance;
  };

  beforeEach(() => {
    writeAllowed = true;
    editShift = {};
  });

  it('keeps the fields enabled on a new clientless shift prepared as SealedOrder', () => {
    editShift = { id: undefined, status: ShiftStatus.SealedOrder, isClientless: true };

    expect(createComponent().isFieldsDisabled).toBe(false);
  });

  it('disables the fields on a saved SealedOrder shift', () => {
    editShift = { id: 'shift-1', status: ShiftStatus.SealedOrder };

    expect(createComponent().isFieldsDisabled).toBe(true);
  });

  it('still disables the fields on a new shift when the write right is missing', () => {
    writeAllowed = false;
    editShift = { id: undefined, status: ShiftStatus.SealedOrder, isClientless: true };

    expect(createComponent().isFieldsDisabled).toBe(true);
  });
});
