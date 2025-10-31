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

    return this.loadAvailableTasksForAllSlots(grid).pipe(
      tap(() => this.loadingSubject.next(false)),
      catchError(error => {
        console.error('Error initializing template grid:', error);
        this.loadingSubject.next(false);
        return of(grid);
      })
    );
  }

  private loadAvailableTasksForAllSlots(grid: IContainerTemplateGrid): Observable<IContainerTemplateGrid> {
    if (!grid.containerShift.id) {
      return of(grid);
    }

    const loadTasks$ = grid.slots.flat().map(slot =>
      this.loadAvailableTasksForSlot(grid.containerShift.id!, slot)
    );

    return forkJoin(loadTasks$).pipe(
      map(() => {
        this.templateGridSubject.next(grid);
        return grid;
      })
    );
  }

  private loadAvailableTasksForSlot(containerId: string, slot: IContainerTemplateSlot): Observable<IShift[]> {
    return this.dataService.getAvailableTasks(
      containerId,
      [slot.weekday],
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
        console.error(`Error loading tasks for slot ${slot.label}:`, error);
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
    return this.dataService.addTemplates(containerId, templates).pipe(
      tap(() => {
        if (this.currentContainerShift) {
          this.initializeTemplateGrid(this.currentContainerShift).subscribe();
        }
      })
    );
  }

  updateTemplates(containerId: string, templates: IContainerTemplate[]): Observable<IContainerTemplate[]> {
    return this.dataService.updateTemplates(containerId, templates).pipe(
      tap(() => {
        if (this.currentContainerShift) {
          this.initializeTemplateGrid(this.currentContainerShift).subscribe();
        }
      })
    );
  }

  deleteTemplates(containerId: string): Observable<IContainerTemplate[]> {
    return this.dataService.deleteTemplates(containerId).pipe(
      tap(() => {
        if (this.currentContainerShift) {
          this.initializeTemplateGrid(this.currentContainerShift).subscribe();
        }
      })
    );
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
