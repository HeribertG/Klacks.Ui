/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable, signal } from '@angular/core';
import { cloneObject, compareComplexObjects } from 'src/app/shared/helpers/object.helper';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { DataShiftCutsService } from 'src/app/infrastructure/api/data-shift-cuts.service';
import { IShift, Shift, ShiftStatus } from 'src/app/domain/models/shift-class';
import {
  ILoadable,
  IResettable,
  ISaveable,
  INavigable,
} from 'src/app/domain/interfaces/manageable.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from 'src/app/domain/interfaces/manageable-service-registry.interface';
import { RouteName } from 'src/app/domain/models/entity-names.enum';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CutOperation } from 'src/app/domain/models/cut-operation';
import { newGuid } from 'src/app/shared/helpers/guid.helper';

@Injectable({
  providedIn: 'root',
})
export class DataManagementShiftCutService
  implements ISaveable, IResettable, ILoadable, INavigable
{
  private eventBus = inject(EVENT_BUS_TOKEN);
  private dataShiftCutsService = inject(DataShiftCutsService);
  private registry = inject(MANAGEABLE_SERVICE_REGISTRY_TOKEN);
  private destroy$ = new Subject<void>();

  private originalShiftId = '';

  private shiftIdToTempId = new Map<string, string>();
  private tempIdToShiftId = new Map<string, string>();

  constructor() {
    this.registry.register(RouteName.CUT_SHIFT, DataManagementShiftCutService);
  }

  private _showProgressSpinner = signal(false);
  get showProgressSpinner(): boolean {
    return this._showProgressSpinner();
  }

  public isReset = signal(false);
  public isRead = signal(false);

  public cutShifts: Shift[] = [];
  public cutShiftsDummy: Shift[] = [];

  public onSaveCompleted?: () => void;
  public onResetCompleted?: () => void;
  public onReadCompleted?: () => void;

  /* #region Cut Shift Methods */

  readCutShiftList(id: string): void {
    if (id !== '') {
      this.originalShiftId = id;
      this._showProgressSpinner.set(true);
      this.dataShiftCutsService
        .getCutShiftList(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe((x) => {
          this.cutShifts = x;
          this.cutShiftsDummy = cloneObject<Shift[]>(this.cutShifts);

          setTimeout(
            () => history.pushState(null, '', this.createCutShiftUrl(id)),
            100
          );

          this.fireIsReadEvent();
          this._showProgressSpinner.set(false);

          if (this.onReadCompleted) {
            this.onReadCompleted();
          }
        });
    }
  }

  addCutShift(shift: Shift): void {
    if (!shift.id || (shift as any).isNew) {
      (shift as any).__tempId = newGuid();
    }
    this.cutShifts.push(shift);
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
    this._showProgressSpinner.set(true);

    const operations = this.buildCutOperations();

    if (operations.length === 0) {
      this._showProgressSpinner.set(false);
      if (this.onSaveCompleted) {
        this.onSaveCompleted();
      }
      return;
    }

    this.dataShiftCutsService
      .batchCuts(operations)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (savedShifts) => {
          savedShifts.forEach((savedShift) => {
            const tempId = (savedShift as any).__tempId;
            if (tempId && savedShift.id) {
              this.shiftIdToTempId.set(savedShift.id, tempId);
            }

            const index = this.cutShifts.findIndex((cut) => {
              const cutTempId = (cut as any).__tempId;
              if (cutTempId && cutTempId === tempId) {
                return true;
              }
              return cut.id === savedShift.id;
            });

            if (index !== -1) {
              this.cutShifts[index] = savedShift;
            }
          });

          this.cutShiftsDummy = cloneObject<Shift[]>(this.cutShifts);

          this.shiftIdToTempId.clear();
          this.tempIdToShiftId.clear();

          this._showProgressSpinner.set(false);
          if (this.onSaveCompleted) {
            this.onSaveCompleted();
          }
        },
        error: (error) => {
          this.eventBus.emit(DomainEventType.ERROR, {
            message: error,
            code: 'Batch Cut Error',
            context: 'DataManagementShiftCutService.saveCuts',
          });
          this._showProgressSpinner.set(false);
          if (this.onSaveCompleted) {
            this.onSaveCompleted();
          }
        },
      });
  }

  resetCuts(originalId: string, newStartDate: Date): void {
    this._showProgressSpinner.set(true);

    this.dataShiftCutsService
      .resetCuts(originalId, newStartDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedShifts) => {
          this.cutShifts = updatedShifts;
          this.cutShiftsDummy = cloneObject<Shift[]>(this.cutShifts);

          this._showProgressSpinner.set(false);

          this.eventBus.emit(DomainEventType.INFO, {
            message: 'Cuts successfully reset',
            code: 'Reset Success',
            context: 'DataManagementShiftCutService.resetCuts',
          });

          if (this.onResetCompleted) {
            this.onResetCompleted();
          }
        },
        error: (error) => {
          this.eventBus.emit(DomainEventType.ERROR, {
            message: error,
            code: 'Reset Cut Error',
            context: 'DataManagementShiftCutService.resetCuts',
          });
          this._showProgressSpinner.set(false);
        },
      });
  }

  private buildCutOperations(): CutOperation[] {
    const operations: CutOperation[] = [];

    this.cutShifts.forEach((cut) => {
      const existsInOriginal = this.cutShiftsDummy.some(
        (dummy) => dummy.id === cut.id
      );

      if (!existsInOriginal || !cut.id || (cut as any).isNew) {
        cut.status = ShiftStatus.SplitShift;

        const parentId = this.determineParentIdForCut(cut);

        operations.push({
          type: 'CREATE',
          parentId: parentId,
          data: cut,
        });
      } else {
        const originalCut = this.cutShiftsDummy.find(
          (dummy) => dummy.id === cut.id
        );
        if (originalCut && !compareComplexObjects(cut, originalCut)) {
          const parentId = this.determineParentIdForCut(cut);

          operations.push({
            type: 'UPDATE',
            parentId: parentId,
            data: cut,
          });
        }
      }
    });

    return operations;
  }

  private determineParentIdForCut(cut: Shift): string {
    if (cut.parentId) {
      const parentTempId = this.shiftIdToTempId.get(cut.parentId);
      if (parentTempId) {
        return parentTempId;
      }
      return cut.parentId;
    }

    if (cut.originalId) {
      return cut.originalId;
    }

    if (this.originalShiftId) {
      return this.originalShiftId;
    }

    return '';
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

  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
