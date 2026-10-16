// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Answers the one question every card of the shift edit form has to ask: may the current user write
 * to the shift that is open right now. One component tree serves two routes - /workplace/new-shift
 * (CanCreateShifts) and /workplace/edit-shift/:id (CanViewShifts, so a reader reaches it too) - so
 * neither right alone is the correct gate. Asking for both at once would let a create-only user
 * change existing shifts; asking only for CanEditShifts would hand a create-only user a form with
 * every field dead. The shift being edited decides: a shift without an id is being created.
 * It also answers whether the status of the open shift freezes its fields: a new shift never does,
 * because a clientless duty is prepared as SealedOrder before its first save.
 */
import { Injectable, inject } from '@angular/core';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { PERMISSIONS } from 'src/app/domain/constants/permissions.constants';
import { ShiftStatus } from 'src/app/domain/models/shift/shift-class';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';

@Injectable({ providedIn: 'root' })
export class ShiftEditPermissionService {
  private authorizationService = inject(AuthorizationService);
  private dataManagementShiftService = inject(DataManagementShiftService);

  canWriteCurrentShift(): boolean {
    const isNewShift = !this.dataManagementShiftService.editShift?.id;
    const required = isNewShift ? PERMISSIONS.CanCreateShifts : PERMISSIONS.CanEditShifts;

    return this.authorizationService.hasPermission(required);
  }

  isCurrentShiftStatusLocked(): boolean {
    const shift = this.dataManagementShiftService.editShift;
    if (!shift?.id) return false;

    return shift.status !== undefined && shift.status !== ShiftStatus.OriginalOrder;
  }
}
