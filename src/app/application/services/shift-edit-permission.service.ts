// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Answers the one question every card of the shift edit form has to ask: may the current user write
 * to the shift that is open right now. One component tree serves two routes - /workplace/new-shift
 * (CanCreateShifts) and /workplace/edit-shift/:id (CanViewShifts, so a reader reaches it too) - so
 * neither right alone is the correct gate. Asking for both at once would let a create-only user
 * change existing shifts; asking only for CanEditShifts would hand a create-only user a form with
 * every field dead. The shift being edited decides: a shift without an id is being created.
 */
import { Injectable, inject } from '@angular/core';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { PERMISSIONS } from 'src/app/domain/constants/permissions.constants';
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
}
