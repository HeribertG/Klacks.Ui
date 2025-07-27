/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable, signal } from '@angular/core';
import {
  cloneObject,
  compareComplexObjects,
} from 'src/app/helpers/object-helpers';
import { ToastShowService } from 'src/app/toast/toast-show.service';
import { NavigationService } from 'src/app/services/navigation.service';
import { DataShiftCutsService } from '../data-shift-cuts.service';
import { IShift, Shift, ShiftStatus } from 'src/app/core/shift-class';
import { IManageable } from './imanageable';
import { ManageableServiceRegistry } from './manageable-service-registry';
import { RouteName } from './entity-names.enum';

@Injectable({
  providedIn: 'root',
})
export class DataManagementShiftCutService implements IManageable {
  public toastShowService = inject(ToastShowService);
  private navigationService = inject(NavigationService);
  private dataShiftCutsService = inject(DataShiftCutsService);

  // Track which cuts are new vs existing
  private newCuts: Shift[] = [];
  private existingCuts: Shift[] = [];

  constructor() {
    // Selbst-Registrierung für die cut-shift Route
    ManageableServiceRegistry.register(
      RouteName.CUT_SHIFT,
      DataManagementShiftCutService
    );
  }

  public showProgressSpinner = signal(false);

  public isReset = signal(false);
  public isRead = signal(false);

  public cutShifts: Shift[] = [];
  public cutShiftsDummy: Shift[] = [];

  /* #region Cut Shift Methods */

  readCutShiftList(id: string): void {
    if (id !== '') {
      this.showProgressSpinner.set(true);
      this.dataShiftCutsService.getCutShiftList(id).subscribe((x) => {
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
    // - Parent umschließt alle seine Children
    // - Child wird INNERHALB des Parents eingefügt
    // - Child.lft = Parent.rgt - 1 (neues Child wird vor dem Ende des Parents eingefügt)
    // - Child.rgt = Parent.rgt (Child endet wo Parent ursprünglich endete)
    // - Parent.rgt wird um 2 erhöht (um Platz für das neue Child zu schaffen)

    if (parentShift.rgt !== undefined && parentShift.lft !== undefined) {
      // Das neue Child wird INNERHALB des Parents eingefügt
      childShift.lft = parentShift.rgt - 1;
      childShift.rgt = parentShift.rgt;

      // Erweitere den rgt-Wert des Parents um 2 (macht Platz für das Child)
      parentShift.rgt = parentShift.rgt + 2;

      // Aktualisiere alle anderen Shifts in der Liste, die betroffen sind
      this.updateOtherShiftsNestedSetValues(childShift.lft!);
    } else {
      // Falls das Parent keine rgt/lft Werte hat, initialisiere sie
      // Parent: lft=1, rgt=4 (umschließt das Child)
      // Child: lft=2, rgt=3 (innerhalb des Parents)
      parentShift.lft = 1;
      parentShift.rgt = 4;
      childShift.lft = 2;
      childShift.rgt = 3;
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
    return '/workplace/cut-shift/' + id;
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
    // ABER: Nicht den Parent-Shift und das neue Child-Shift selbst aktualisieren
    this.cutShifts.forEach((shift) => {
      if (shift.lft !== undefined && shift.lft >= insertionPoint) {
        shift.lft += 2;
      }
      if (shift.rgt !== undefined && shift.rgt >= insertionPoint) {
        shift.rgt += 2;
      }
    });
  }

  /* #endregion Cut Shift Methods */

  // IManageable methods
  save(): void {
    if (this.areObjectsDirty()) {
      this.saveCuts();
    }
  }

  private saveCuts(): void {
    this.showProgressSpinner.set(true);

    // Separate new cuts from existing cuts
    this.separateNewAndExistingCuts();

    // Handle new cuts (POST)
    if (this.newCuts.length > 0) {
      this.dataShiftCutsService.addCuts(this.newCuts).subscribe({
        next: (createdCuts) => {
          // Update the local array with the returned cuts
          this.updateCutsAfterSave(createdCuts, true);
          this.toastShowService.showSuccess(
            `${createdCuts.length} neue Cuts erstellt`,
            'Erfolg'
          );
        },
        error: (error) => {
          this.toastShowService.showError(error, 'Cut Create Error');
          this.showProgressSpinner.set(false);
        },
      });
    }

    // Handle existing cuts (PUT)
    if (this.existingCuts.length > 0) {
      this.dataShiftCutsService.updateCuts(this.existingCuts).subscribe({
        next: (updatedCuts) => {
          // Update the local array with the returned cuts
          this.updateCutsAfterSave(updatedCuts, false);
          this.toastShowService.showSuccess(
            `${updatedCuts.length} Cuts aktualisiert`,
            'Erfolg'
          );
        },
        error: (error) => {
          this.toastShowService.showError(error, 'Cut Update Error');
          this.showProgressSpinner.set(false);
        },
        complete: () => {
          this.showProgressSpinner.set(false);
        },
      });
    }

    // If no cuts to save, just hide spinner
    if (this.newCuts.length === 0 && this.existingCuts.length === 0) {
      this.showProgressSpinner.set(false);
    }
  }

  private separateNewAndExistingCuts(): void {
    this.newCuts = [];
    this.existingCuts = [];

    this.cutShifts.forEach((cut) => {
      // Check if cut exists in dummy array (original data)
      const existsInOriginal = this.cutShiftsDummy.some(
        (dummy) => dummy.id === cut.id
      );

      // Neu: Prüfe auch das isNew Flag von der Component
      if (!existsInOriginal || !cut.id || (cut as any).isNew) {
        // New cut - stelle sicher dass Status IsCut ist
        cut.status = ShiftStatus.IsCut;
        this.newCuts.push(cut);
      } else {
        // Existing cut - check if it was modified
        const originalCut = this.cutShiftsDummy.find(
          (dummy) => dummy.id === cut.id
        );
        if (originalCut && !compareComplexObjects(cut, originalCut)) {
          this.existingCuts.push(cut);
        }
      }
    });
  }

  private updateCutsAfterSave(savedCuts: Shift[], isNew: boolean): void {
    if (isNew) {
      // For new cuts, replace temporary cuts with saved ones
      savedCuts.forEach((savedCut) => {
        const index = this.cutShifts.findIndex(
          (cut) =>
            cut.parentId === savedCut.parentId &&
            cut.lft === savedCut.lft &&
            cut.rgt === savedCut.rgt
        );
        if (index !== -1) {
          this.cutShifts[index] = savedCut;
        }
      });
    } else {
      // For existing cuts, update them
      savedCuts.forEach((savedCut) => {
        const index = this.cutShifts.findIndex((cut) => cut.id === savedCut.id);
        if (index !== -1) {
          this.cutShifts[index] = savedCut;
        }
      });
    }

    // Update dummy array to reflect saved state
    this.cutShiftsDummy = cloneObject<Shift[]>(this.cutShifts);
  }

  resetData(): void {
    this.resetCutData();
    this.fireIsResetEvent();
  }

  private fireIsResetEvent(): void {
    this.isReset.set(true);
    setTimeout(() => this.isReset.set(false), 100);
  }

  goBack(): string {
    return '/workplace/shift';
  }
}
