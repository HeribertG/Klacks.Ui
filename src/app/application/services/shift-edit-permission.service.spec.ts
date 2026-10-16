// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { ShiftEditPermissionService } from './shift-edit-permission.service';
import { AuthorizationService } from './authorization.service';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { PERMISSIONS } from 'src/app/domain/constants/permissions.constants';
import { IShift, ShiftStatus } from 'src/app/domain/models/shift/shift-class';

describe('ShiftEditPermissionService', () => {
  let held: Set<string>;
  let shiftService: { editShift: Partial<IShift> | undefined };

  const createService = (): ShiftEditPermissionService => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthorizationService,
          useValue: { hasPermission: (permission: string) => held.has(permission) },
        },
        { provide: DataManagementShiftService, useValue: shiftService },
      ],
    });

    return TestBed.inject(ShiftEditPermissionService);
  };

  beforeEach(() => {
    held = new Set<string>();
    shiftService = { editShift: undefined };
  });

  it('demands CanCreateShifts for a shift that has no id yet, which is the new-shift route', () => {
    shiftService.editShift = { id: undefined };
    held.add(PERMISSIONS.CanCreateShifts);

    expect(createService().canWriteCurrentShift()).toBe(true);
  });

  it('does not accept CanEditShifts alone on a new shift', () => {
    shiftService.editShift = { id: undefined };
    held.add(PERMISSIONS.CanEditShifts);

    expect(createService().canWriteCurrentShift()).toBe(false);
  });

  it('demands CanEditShifts for a shift that already exists', () => {
    shiftService.editShift = { id: 'shift-1' };
    held.add(PERMISSIONS.CanEditShifts);

    expect(createService().canWriteCurrentShift()).toBe(true);
  });

  // The whole reason the two rights are not simply OR-ed: edit-shift/:id only asks for
  // CanViewShifts, so a create-only user reaches an existing shift and must not be able to change it.
  it('refuses an existing shift to a user who may only create shifts', () => {
    shiftService.editShift = { id: 'shift-1' };
    held.add(PERMISSIONS.CanCreateShifts);

    expect(createService().canWriteCurrentShift()).toBe(false);
  });

  it('refuses a planer holding neither right', () => {
    shiftService.editShift = { id: 'shift-1' };

    expect(createService().canWriteCurrentShift()).toBe(false);
  });

  describe('isCurrentShiftStatusLocked', () => {
    it('does not lock a new clientless shift that is prepared as SealedOrder', () => {
      shiftService.editShift = { id: undefined, status: ShiftStatus.SealedOrder, isClientless: true };

      expect(createService().isCurrentShiftStatusLocked()).toBe(false);
    });

    it('locks a saved SealedOrder shift', () => {
      shiftService.editShift = { id: 'shift-1', status: ShiftStatus.SealedOrder };

      expect(createService().isCurrentShiftStatusLocked()).toBe(true);
    });

    it('locks a saved cut shift', () => {
      shiftService.editShift = { id: 'shift-1', status: ShiftStatus.SplitShift };

      expect(createService().isCurrentShiftStatusLocked()).toBe(true);
    });

    it('does not lock an OriginalOrder shift', () => {
      shiftService.editShift = { id: 'shift-1', status: ShiftStatus.OriginalOrder };

      expect(createService().isCurrentShiftStatusLocked()).toBe(false);
    });

    it('does not lock while no shift is loaded', () => {
      shiftService.editShift = undefined;

      expect(createService().isCurrentShiftStatusLocked()).toBe(false);
    });
  });
});
