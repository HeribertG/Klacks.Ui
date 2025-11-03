import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { IShift } from '../../models/shift-class';
import { IContainerTemplate } from '../../models/container-template-class';
import { IContainerTemplateGrid, IContainerTemplateSlot } from '../../models/container-template-slot';
import { DataContainerTemplateService } from '../../../infrastructure/api/data-container-template.service';
import { ContainerTemplateSlotCalculationService } from './container-template-slot-calculation.service';

@Injectable({
  providedIn: 'root'
})
export class DataManagementContainerService {
  private dataService = inject(DataContainerTemplateService);
  private slotCalculationService = inject(ContainerTemplateSlotCalculationService);

  private templateGridSubject = new BehaviorSubject<IContainerTemplateGrid | null>(null);
  public templateGrid$ = this.templateGridSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  private currentContainerShift: IShift | null = null;

  initializeTemplateGrid(containerShift: IShift): Observable<IContainerTemplateGrid> {
    this.loadingSubject.next(true);
    this.currentContainerShift = containerShift;

    const grid = this.slotCalculationService.calculateTemplateGrid(containerShift);
    this.templateGridSubject.next(grid);

    this.loadingSubject.next(false);
    return of(grid);
  }

  loadTasksForWeekday(weekday: number): Observable<void> {
    const grid = this.templateGridSubject.value;
    if (!grid || !grid.containerShift.id) {
      return of(void 0);
    }

    this.loadingSubject.next(true);

    const slotsForWeekday = grid.slots
      .flat()
      .filter(slot => slot.weekday === weekday);

    if (slotsForWeekday.length === 0) {
      this.loadingSubject.next(false);
      return of(void 0);
    }

    const loadTasks$ = slotsForWeekday.map(slot =>
      this.loadAvailableTasksForSlot(grid.containerShift.id!, slot)
    );

    return forkJoin(loadTasks$).pipe(
      map(() => {
        this.templateGridSubject.next(grid);
        this.loadingSubject.next(false);
        return void 0;
      }),
      catchError(error => {
        this.loadingSubject.next(false);
        return of(void 0);
      })
    );
  }

  private loadAvailableTasksForSlot(containerId: string, slot: IContainerTemplateSlot): Observable<IShift[]> {
    return this.dataService.getAvailableTasks(
      containerId,
      slot.weekday,
      slot.fromTime,
      slot.untilTime,
      undefined,
      undefined,
      slot.isHoliday,
      slot.isWeekdayOrHoliday
    ).pipe(
      tap(tasks => {
        slot.availableTasks = tasks;
      }),
      catchError(error => {
        slot.availableTasks = [];
        return of([]);
      })
    );
  }

  refreshAvailableTasksForSlot(slot: IContainerTemplateSlot): Observable<IShift[]> {
    if (!this.currentContainerShift?.id) {
      return of([]);
    }

    return this.loadAvailableTasksForSlot(this.currentContainerShift.id, slot);
  }

  getTemplates(containerId: string): Observable<IContainerTemplate[]> {
    return this.dataService.getTemplates(containerId);
  }

  addTemplates(containerId: string, templates: IContainerTemplate[]): Observable<IContainerTemplate[]> {
    return this.dataService.addTemplates(containerId, templates);
  }

  updateTemplates(containerId: string, templates: IContainerTemplate[]): Observable<IContainerTemplate[]> {
    return this.dataService.updateTemplates(containerId, templates);
  }

  deleteTemplates(containerId: string): Observable<IContainerTemplate[]> {
    return this.dataService.deleteTemplates(containerId);
  }

  getCurrentGrid(): IContainerTemplateGrid | null {
    return this.templateGridSubject.value;
  }

  getSlotAt(rowIndex: number, dayIndex: number): IContainerTemplateSlot | null {
    const grid = this.templateGridSubject.value;
    if (!grid || rowIndex < 0 || rowIndex >= grid.slots.length) {
      return null;
    }

    const row = grid.slots[rowIndex];
    if (dayIndex < 0 || dayIndex >= row.length) {
      return null;
    }

    return row[dayIndex];
  }

  reset(): void {
    this.templateGridSubject.next(null);
    this.currentContainerShift = null;
    this.loadingSubject.next(false);
  }
}
