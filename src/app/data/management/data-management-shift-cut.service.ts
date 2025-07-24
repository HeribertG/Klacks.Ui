import { inject, Injectable, signal, computed } from '@angular/core';
import {
  cloneObject,
  compareComplexObjects,
} from 'src/app/helpers/object-helpers';
import { ToastShowService } from 'src/app/toast/toast-show.service';
import { NavigationService } from 'src/app/services/navigation.service';
import { DataShiftService } from '../data-shift.service';
import { IShift, Shift } from 'src/app/core/shift-class';
import { IManageable } from './imanageable';
import { ManageableServiceRegistry } from './manageable-service-registry';
import { RouteName } from './entity-names.enum';

@Injectable({
  providedIn: 'root',
})
export class DataManagementShiftCutService implements IManageable {
  public toastShowService = inject(ToastShowService);
  private navigationService = inject(NavigationService);
  private dataShiftService = inject(DataShiftService);

  constructor() {
    // Selbst-Registrierung für die cut-shift Route
    ManageableServiceRegistry.register(
      RouteName.CUT_SHIFT,
      DataManagementShiftCutService
    );
  }

  // IManageable implementation
  public showProgressSpinner = signal(false);

  // Cut-specific properties
  public isReset = signal(false);
  public isRead = signal(false);

  public cutShifts: Shift[] = [];
  public cutShiftsDummy: Shift[] = [];

  /* #region Cut Shift Methods */

  readCutShiftList(id: string): void {
    if (id !== '') {
      this.showProgressSpinner.set(true);
      this.dataShiftService.getCutShiftList(id).subscribe((x) => {
        this.cutShifts = x;
        this.cutShiftsDummy = cloneObject<Shift[]>(this.cutShifts);

        this.navigationService.navigateToCutShift();

        setTimeout(
          () => history.pushState(null, '', this.createCutShiftUrl(id)),
          100
        );

        this.fireIsReadEvent();
        this.showProgressSpinner.set(false);
      });
    }
  }

  addCutShift(shift: Shift): void {
    this.cutShifts.push(shift);
  }

  calculateNestedSetValues(childShift: Shift, parentShift: Shift): void {
    // Im Nested Set Model:
    // - Das Parent hat lft und rgt Werte
    // - Das neue Child wird als letztes Child eingefügt
    // - Child.lft = Parent.rgt (das neue Child startet wo das Parent endet)
    // - Child.rgt = Parent.rgt + 1 (das Child bekommt den nächsten Wert)
    // - Parent.rgt wird um 2 erhöht (um Platz für das neue Child zu schaffen)

    if (parentShift.rgt !== undefined) {
      // Setze die Werte für das neue Child
      childShift.lft = parentShift.rgt;
      childShift.rgt = parentShift.rgt + 1;

      // Erweitere den rgt-Wert des Parents um 2
      parentShift.rgt = parentShift.rgt + 2;

      // Aktualisiere alle anderen Shifts in der Liste, die betroffen sind
      this.updateOtherShiftsNestedSetValues(parentShift.rgt - 2);
    } else {
      // Falls das Parent keine rgt Werte hat, setze Standard-Werte
      childShift.lft = 1;
      childShift.rgt = 2;
      parentShift.lft = parentShift.lft || 0;
      parentShift.rgt = 3;
    }
  }

  areObjectsDirty(): boolean {
    if (this.isCutShifts_Dirty()) {
      return true;
    }
    return false;
  }

  resetCutData(): void {
    this.cutShifts = cloneObject<Shift[]>(this.cutShiftsDummy);
  }

  private createCutShiftUrl(id: string): string {
    return 'workplace/cut-shift?id=' + id;
  }

  private fireIsReadEvent(): void {
    this.isRead.set(true);
    setTimeout(() => this.isRead.set(false), 100);
  }

  private isCutShifts_Dirty(): boolean {
    let result = false;
    const a = this.cutShifts as IShift[];
    const b = this.cutShiftsDummy as IShift[];

    if (!compareComplexObjects(a, b)) {
      result = true;
    }

    return result;
  }

  private updateOtherShiftsNestedSetValues(insertionPoint: number): void {
    // Alle Cut-Shifts, die nach dem Einfügepunkt liegen, müssen ihre lft/rgt Werte um 2 erhöhen
    this.cutShifts.forEach((shift) => {
      if (shift.lft !== undefined && shift.lft > insertionPoint) {
        shift.lft += 2;
      }
      if (shift.rgt !== undefined && shift.rgt > insertionPoint) {
        shift.rgt += 2;
      }
    });
  }

  /* #endregion Cut Shift Methods */

  // IManageable methods
  save(): void {
    // Cut shifts don't have a traditional save method, they are handled differently
    // This could be implemented if needed in the future
    console.log('Cut shifts save not implemented yet');
  }

  resetData(): void {
    this.resetCutData();
  }

  goBack(): string {
    return 'workplace/shift';
  }
}
