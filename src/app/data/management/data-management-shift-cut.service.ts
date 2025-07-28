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

  private newCuts: Shift[] = [];
  private existingCuts: Shift[] = [];

  constructor() {
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

  public onSaveCompleted?: () => void;

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
    // Setze Parent-Child Beziehungen ZUERST
    childShift.parentId = parentShift.id;
    childShift.rootId = parentShift.rootId || parentShift.id;
    
    // Stelle sicher, dass das childShift zur Liste hinzugefügt wurde
    // (normalerweise passiert das durch addCutShift nach diesem Aufruf)
    const childExists = this.cutShifts.some(shift => shift.id === childShift.id);
    if (!childExists) {
      this.cutShifts.push(childShift);
    }
    
    // Jetzt berechne die gesamte Hierarchie neu
    this.recalculateAllNestedSetValues();
  }
  
  private recalculateAllNestedSetValues(): void {
    // Finde alle Root-Knoten (Knoten ohne Parent)
    const roots = this.cutShifts.filter(shift => !shift.parentId);
    
    let counter = 1;
    
    // Berechne für jeden Root-Baum
    roots.forEach(root => {
      counter = this.calculateTreeNestedSetValues(root, counter);
    });
  }
  
  private calculateTreeNestedSetValues(node: Shift, leftValue: number): number {
    // Setze den linken Wert
    node.lft = leftValue;
    
    // Finde alle direkten Kinder dieses Knotens
    const children = this.cutShifts.filter(shift => shift.parentId === node.id);
    
    // Berechne die Werte für alle Kinder rekursiv
    let rightValue = leftValue + 1;
    children.forEach(child => {
      rightValue = this.calculateTreeNestedSetValues(child, rightValue);
    });
    
    // Setze den rechten Wert
    node.rgt = rightValue;
    
    // Gebe den nächsten verfügbaren Wert zurück (für Geschwisterknoten)
    return rightValue + 1;
  }
  
  private shiftNodesRight(fromPosition: number, offset: number, parentShift?: Shift): void {
    // Verschiebe alle Knoten in der cutShifts Liste
    this.cutShifts.forEach(shift => {
      if (shift.lft !== undefined && shift.lft >= fromPosition) {
        shift.lft += offset;
      }
      if (shift.rgt !== undefined && shift.rgt >= fromPosition) {
        shift.rgt += offset;
      }
    });
    
    // Verschiebe auch den parentShift, falls er übergeben wurde
    // Dies ist wichtig, da der Parent möglicherweise noch nicht in cutShifts ist
    if (parentShift) {
      if (parentShift.lft !== undefined && parentShift.lft >= fromPosition) {
        parentShift.lft += offset;
      }
      if (parentShift.rgt !== undefined && parentShift.rgt >= fromPosition) {
        parentShift.rgt += offset;
      }
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

  /* #endregion Cut Shift Methods */

  // IManageable methods
  save(): void {
    if (this.areObjectsDirty()) {
      this.saveCuts();
    }
  }

  private saveCuts(): void {
    this.showProgressSpinner.set(true);

    this.separateNewAndExistingCuts();

    this.operationsCompleted = 0;
    this.totalOperations = 0;
    if (this.newCuts.length > 0) this.totalOperations++;
    if (this.existingCuts.length > 0) this.totalOperations++;

    if (this.newCuts.length > 0) {
      this.dataShiftCutsService.addCuts(this.newCuts).subscribe({
        next: (createdCuts) => {
          this.updateCutsAfterSave(createdCuts, true);
          this.checkAndCallSaveCompleted();
        },
        error: (error) => {
          this.toastShowService.showError(error, 'Cut Create Error');
          this.showProgressSpinner.set(false);
          if (this.onSaveCompleted) {
            this.onSaveCompleted();
          }
        },
      });
    }

    if (this.existingCuts.length > 0) {
      this.dataShiftCutsService.updateCuts(this.existingCuts).subscribe({
        next: (updatedCuts) => {
          this.updateCutsAfterSave(updatedCuts, false);
          this.checkAndCallSaveCompleted();
        },
        error: (error) => {
          this.toastShowService.showError(error, 'Cut Update Error');
          this.showProgressSpinner.set(false);
          if (this.onSaveCompleted) {
            this.onSaveCompleted();
          }
        },
        complete: () => {
          this.showProgressSpinner.set(false);
        },
      });
    }

    if (this.newCuts.length === 0 && this.existingCuts.length === 0) {
      this.showProgressSpinner.set(false);
      if (this.onSaveCompleted) {
        this.onSaveCompleted();
      }
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

  private operationsCompleted = 0;
  private totalOperations = 0;

  private checkAndCallSaveCompleted(): void {
    this.operationsCompleted++;
    if (this.operationsCompleted >= this.totalOperations) {
      this.showProgressSpinner.set(false);
      if (this.onSaveCompleted) {
        this.onSaveCompleted();
      }
      // Reset for next save operation
      this.operationsCompleted = 0;
      this.totalOperations = 0;
    }
  }
}
