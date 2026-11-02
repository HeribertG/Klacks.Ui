// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';
import { EditShiftAddressComponent } from './edit-shift-address.component';

describe('EditShiftAddressComponent isFieldsDisabled', () => {
  let writeAllowed: boolean;
  let statusLocked: boolean;

  const createComponent = (): EditShiftAddressComponent => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DataManagementShiftService,
          useValue: {
            editShift: {},
            isReset: signal(false),
            isRead: signal(false),
            isCurrentShiftStatusLocked: () => statusLocked,
          },
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
    statusLocked = false;
  });

  it('keeps the fields enabled with the write right on a shift without a status lock', () => {
    expect(createComponent().isFieldsDisabled).toBe(false);
  });

  it('disables the fields on a status lock', () => {
    statusLocked = true;

    expect(createComponent().isFieldsDisabled).toBe(true);
  });

  it('still disables the fields when the write right is missing', () => {
    writeAllowed = false;

    expect(createComponent().isFieldsDisabled).toBe(true);
  });
});
