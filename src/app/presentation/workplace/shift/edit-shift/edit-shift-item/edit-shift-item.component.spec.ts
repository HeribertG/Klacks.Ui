// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { IShift, ShiftStatus } from 'src/app/domain/models/shift/shift-class';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { ShiftFormService } from '../services/shift-form.service';
import { EditShiftItemComponent } from './edit-shift-item.component';

describe('EditShiftItemComponent isFieldsDisabled', () => {
  let writeAllowed: boolean;
  let editShift: Partial<IShift>;

  const createComponent = (): EditShiftItemComponent => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DataManagementShiftService,
          useValue: { editShift, isReset: signal(false), isRead: signal(false) },
        },
        { provide: AuthorizationService, useValue: { hasPermission: () => writeAllowed } },
        { provide: ShiftFormService, useValue: {} },
        { provide: LocalStorageService, useValue: {} },
      ],
    });
    TestBed.overrideComponent(EditShiftItemComponent, { set: { template: '', imports: [] } });

    return TestBed.createComponent(EditShiftItemComponent).componentInstance;
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

  it('keeps the fields of an OriginalOrder shift enabled', () => {
    editShift = { id: 'shift-1', status: ShiftStatus.OriginalOrder };

    expect(createComponent().isFieldsDisabled).toBe(false);
  });
});
