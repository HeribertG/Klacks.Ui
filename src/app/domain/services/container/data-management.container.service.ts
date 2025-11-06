import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { IShift } from '../../models/shift-class';
import { IContainerTemplate } from '../../models/container-template-class';
import {
  IContainerTemplateGrid,
  IContainerTemplateSlot,
} from '../../models/container-template-slot';
import { DataContainerTemplateService } from '../../../infrastructure/api/data-container-template.service';
import { ContainerTemplateSlotCalculationService } from './container-template-slot-calculation.service';

@Injectable({
  providedIn: 'root',
})
export class DataManagementContainerService {
  private dataService = inject(DataContainerTemplateService);
  private slotCalculationService = inject(
    ContainerTemplateSlotCalculationService
  );

  private templateGridSubject =
    new BehaviorSubject<IContainerTemplateGrid | null>(null);
  public templateGrid$ = this.templateGridSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  private currentContainerShift: IShift | null = null;

  initializeTemplateGrid(
    containerShift: IShift
  ): Observable<IContainerTemplateGrid> {
    this.loadingSubject.next(true);
    this.currentContainerShift = containerShift;

    const grid =
      this.slotCalculationService.calculateTemplateGrid(containerShift);
    this.templateGridSubject.next(grid);

    this.loadingSubject.next(false);
    return of(grid);
  }

  loadTasksForWeekday(weekday: number, searchString?: string): Observable<void> {
    const grid = this.templateGridSubject.value;
    if (!grid || !grid.containerShift.id) {
      return of(void 0);
    }

    this.loadingSubject.next(true);

    const slotsForWeekday = grid.slots
      .flat()
      .filter((slot) => slot.weekday === weekday);

    if (slotsForWeekday.length === 0) {
      this.loadingSubject.next(false);
      return of(void 0);
    }

    const loadTasks$ = slotsForWeekday.map((slot) =>
      this.loadAvailableTasksForSlot(grid.containerShift.id!, slot, searchString)
    );

    return forkJoin(loadTasks$).pipe(
      map(() => {
        this.templateGridSubject.next(grid);
        this.loadingSubject.next(false);
        return void 0;
      }),
      catchError((_) => {
        this.loadingSubject.next(false);
        return of(void 0);
      })
    );
  }

  private loadAvailableTasksForSlot(
    containerId: string,
    slot: IContainerTemplateSlot,
    searchString?: string
  ): Observable<IShift[]> {
    return this.dataService
      .getAvailableTasks(
        containerId,
        slot.weekday,
        slot.fromTime,
        slot.untilTime,
        searchString,
        undefined,
        slot.isHoliday,
        slot.isWeekdayOrHoliday
      )
      .pipe(
        tap((tasks) => {
          slot.availableTasks = tasks;
        }),
        catchError((_) => {
          slot.availableTasks = [];
          return of([]);
        })
      );
  }

  refreshAvailableTasksForSlot(
    slot: IContainerTemplateSlot
  ): Observable<IShift[]> {
    if (!this.currentContainerShift?.id) {
      return of([]);
    }

    return this.loadAvailableTasksForSlot(this.currentContainerShift.id, slot);
  }

  getTemplates(containerId: string): Observable<IContainerTemplate[]> {
    return this.dataService.getTemplates(containerId);
  }

  addTemplates(
    containerId: string,
    templates: IContainerTemplate[]
  ): Observable<IContainerTemplate[]> {
    return this.dataService.addTemplates(containerId, templates);
  }

  updateTemplates(
    containerId: string,
    templates: IContainerTemplate[]
  ): Observable<IContainerTemplate[]> {
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

  sortShifts(
    shifts: IShift[],
    orderBy: string,
    sortOrder: 'asc' | 'desc' | ''
  ): IShift[] {
    if (!orderBy || !sortOrder) {
      return shifts;
    }

    return [...shifts].sort((a, b) => {
      let valueA: string;
      let valueB: string;

      switch (orderBy) {
        case 'name':
          valueA = a.name?.toLowerCase() || '';
          valueB = b.name?.toLowerCase() || '';
          break;
        case 'abbreviation':
          valueA = a.abbreviation?.toLowerCase() || '';
          valueB = b.abbreviation?.toLowerCase() || '';
          break;
        case 'startShift':
          valueA = a.startShift || '';
          valueB = b.startShift || '';
          break;
        case 'client':
          valueA = a.client?.name?.toLowerCase() || '';
          valueB = b.client?.name?.toLowerCase() || '';
          break;
        default:
          return 0;
      }

      if (valueA < valueB) {
        return sortOrder === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  getActiveWeekdays(
    shift: IShift
  ): { value: string; labelKey: string }[] {
    const activeWeekdays: { value: string; labelKey: string }[] = [];

    if (shift.isSunday) {
      activeWeekdays.push({
        value: 'sunday',
        labelKey: 'shift.container-template.weekday.sunday',
      });
    }
    if (shift.isMonday) {
      activeWeekdays.push({
        value: 'monday',
        labelKey: 'shift.container-template.weekday.monday',
      });
    }
    if (shift.isTuesday) {
      activeWeekdays.push({
        value: 'tuesday',
        labelKey: 'shift.container-template.weekday.tuesday',
      });
    }
    if (shift.isWednesday) {
      activeWeekdays.push({
        value: 'wednesday',
        labelKey: 'shift.container-template.weekday.wednesday',
      });
    }
    if (shift.isThursday) {
      activeWeekdays.push({
        value: 'thursday',
        labelKey: 'shift.container-template.weekday.thursday',
      });
    }
    if (shift.isFriday) {
      activeWeekdays.push({
        value: 'friday',
        labelKey: 'shift.container-template.weekday.friday',
      });
    }
    if (shift.isSaturday) {
      activeWeekdays.push({
        value: 'saturday',
        labelKey: 'shift.container-template.weekday.saturday',
      });
    }

    return activeWeekdays;
  }

  getWeekdayNumber(weekdayValue: string): number {
    const weekdayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    return weekdayMap[weekdayValue] ?? -1;
  }

  getFilteredRowsForWeekday(
    grid: IContainerTemplateGrid | null,
    weekdayNumber: number
  ): IContainerTemplateSlot[][] {
    if (!grid) {
      return [];
    }

    return grid.slots.filter((row) => row[0].weekday === weekdayNumber);
  }

  getUniqueShifts(shifts: IShift[]): IShift[] {
    return shifts.filter(
      (shift, index, self) => index === self.findIndex((s) => s.id === shift.id)
    );
  }
}
