// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { ShiftEditPermissionService } from './shift-edit-permission.service';
import { AuthorizationService } from './authorization.service';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { PERMISSIONS } from 'src/app/domain/constants/permissions.constants';
import { IShift } from 'src/app/domain/models/shift/shift.interface';
import { ShiftStatus } from 'src/app/domain/models/shift/shift-status.enum';

describe('ShiftEditPermissionService', () => {
  let held: Set<string>;
  let shiftService: { editShift: Partial<IShift> | undefined; isCurrentShiftStatusLocked: () => boolean };

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
    shiftService = { editShift: undefined, isCurrentShiftStatusLocked: () => false };
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

  it.each([true, false])('hands on the status lock of the shift service (%s)', (locked) => {
    shiftService.isCurrentShiftStatusLocked = () => locked;

    expect(createService().isCurrentShiftStatusLocked()).toBe(locked);
  });

  it('keeps the write right apart: a planner without it may not write the shift of a key', () => {
    shiftService.editShift = { id: 'shift-1', status: ShiftStatus.SealedOrder, analyseToken: 'key-token' };
    shiftService.isCurrentShiftStatusLocked = () => false;

    expect(createService().canWriteCurrentShift()).toBe(false);
  });
});
