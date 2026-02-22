// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject, signal, effect } from '@angular/core';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { ShiftFormModel } from 'src/app/presentation/view-models/shift-form.model';

@Injectable({
  providedIn: 'root',
})
export class ShiftFormService {
  private dataManagementShiftService = inject(DataManagementShiftService);

  private _shiftForm = signal<ShiftFormModel | undefined>(undefined);
  readonly shiftForm = this._shiftForm.asReadonly();

  constructor() {
    effect(() => {
      this.dataManagementShiftService.isReset();
      this.dataManagementShiftService.isRead();
      const editShift = this.dataManagementShiftService.editShift;
      if (editShift) {
        this._shiftForm.set(new ShiftFormModel(editShift));
      } else {
        this._shiftForm.set(undefined);
      }
    });
  }

  applyFormToShift(): void {
    const form = this._shiftForm();
    if (form) {
      form.applyToShift();
    }
  }

  refreshForm(): void {
    const editShift = this.dataManagementShiftService.editShift;
    if (editShift) {
      this._shiftForm.set(new ShiftFormModel(editShift));
    }
  }
}
