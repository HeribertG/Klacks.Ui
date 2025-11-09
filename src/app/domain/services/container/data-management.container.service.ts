import { Injectable, inject, signal } from '@angular/core';
import { Observable, forkJoin, of, Subject } from 'rxjs';
import { map, tap, catchError, takeUntil } from 'rxjs/operators';
import { IShift } from '../../models/shift-class';
import { IContainerTemplate, IContainerTemplateItem } from '../../models/container-template-class';
import {
  IContainerTemplateGrid,
  IContainerTemplateSlot,
} from '../../models/container-template-slot';
import { DataContainerTemplateService } from '../../../infrastructure/api/data-container-template.service';
import { ContainerTemplateSlotCalculationService } from './container-template-slot-calculation.service';
import { ContainerTemplateShiftService } from './container-template-shift.service';
import { ISaveable, IResettable, ILoadable, INavigable } from '../../interfaces/manageable.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from '../../interfaces/manageable-service-registry.interface';
import { RouteName } from '../../models/entity-names.enum';
import { cloneObject, compareComplexObjects } from 'src/app/shared/helpers/object.helper';

@Injectable({
  providedIn: 'root',
})
export class DataManagementContainerService implements ISaveable, IResettable, ILoadable, INavigable {
  private dataService = inject(DataContainerTemplateService);
  private slotCalculationService = inject(
    ContainerTemplateSlotCalculationService
  );
  private shiftService = inject(ContainerTemplateShiftService);
  private registry = inject(MANAGEABLE_SERVICE_REGISTRY_TOKEN);
  private destroy$ = new Subject<void>();

  private templateGridSignal = signal<IContainerTemplateGrid | null>(null);
  public templateGrid = this.templateGridSignal.asReadonly();

  private loadingSignal = signal<boolean>(false);
  public loading = this.loadingSignal.asReadonly();

  private currentContainerShiftSignal = signal<IShift | null>(null);
  public currentContainerShift = this.currentContainerShiftSignal.asReadonly();

  private editTemplates = signal<IContainerTemplate[]>([]);
  private editTemplatesDummy = signal<IContainerTemplate[]>([]);

  public isRead = signal(false);
  public isReset = signal(false);
  public onSaveCompleted?: () => void;

  get showProgressSpinner(): boolean {
    return this.loadingSignal();
  }

  constructor() {
    this.registry.register(
      RouteName.CONTAINER_TEMPLATE,
      DataManagementContainerService
    );
  }

  initializeTemplateGrid(
    containerShift: IShift
  ): Observable<IContainerTemplateGrid> {
    this.loadingSignal.set(true);
    this.currentContainerShiftSignal.set(containerShift);

    const grid =
      this.slotCalculationService.calculateTemplateGrid(containerShift);
    this.templateGridSignal.set(grid);

    this.loadingSignal.set(false);
    return of(grid);
  }

  loadTasksForWeekday(weekday: number, searchString?: string): Observable<void> {
    const grid = this.templateGridSignal();
    if (!grid || !grid.containerShift.id) {
      return of(void 0);
    }

    this.loadingSignal.set(true);

    const slotsForWeekday = grid.slots
      .flat()
      .filter((slot) => slot.weekday === weekday);

    if (slotsForWeekday.length === 0) {
      this.loadingSignal.set(false);
      return of(void 0);
    }

    const loadTasks$ = slotsForWeekday.map((slot) =>
      this.loadAvailableTasksForSlot(grid.containerShift.id!, slot, searchString)
    );

    return forkJoin(loadTasks$).pipe(
      map(() => {
        this.templateGridSignal.set(grid);
        this.loadingSignal.set(false);
        return void 0;
      }),
      catchError((_) => {
        this.loadingSignal.set(false);
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
    const containerShift = this.currentContainerShiftSignal();
    if (!containerShift?.id) {
      return of([]);
    }

    return this.loadAvailableTasksForSlot(containerShift.id, slot);
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
    return this.templateGridSignal();
  }

  getSlotAt(rowIndex: number, dayIndex: number): IContainerTemplateSlot | null {
    const grid = this.templateGridSignal();
    if (!grid || rowIndex < 0 || rowIndex >= grid.slots.length) {
      return null;
    }

    const row = grid.slots[rowIndex];
    if (dayIndex < 0 || dayIndex >= row.length) {
      return null;
    }

    return row[dayIndex];
  }

  private reset(): void {
    this.templateGridSignal.set(null);
    this.currentContainerShiftSignal.set(null);
    this.loadingSignal.set(false);
    this.editTemplates.set([]);
    this.editTemplatesDummy.set([]);
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

  canSave(): boolean {
    const hasSelectedTasks = this.shiftService.selectedTasksSignal().length > 0;
    const canSaveTemplates = this.areObjectsDirty() && this.isValid();
    return hasSelectedTasks || canSaveTemplates;
  }

  areObjectsDirty(): boolean {
    const hasSelectedTasks = this.shiftService.selectedTasksSignal().length > 0;
    const hasTemplateChanges = !compareComplexObjects(
      this.editTemplates(),
      this.editTemplatesDummy()
    );
    return hasSelectedTasks || hasTemplateChanges;
  }

  private currentWeekdaySignal = signal<number | undefined>(undefined);
  private currentSlotSignal = signal<IContainerTemplateSlot | undefined>(
    undefined
  );

  setCurrentWeekdayAndSlot(
    weekday: number,
    slot: IContainerTemplateSlot
  ): void {
    this.currentWeekdaySignal.set(weekday);
    this.currentSlotSignal.set(slot);
  }

  save(): void {
    const containerShift = this.currentContainerShiftSignal();
    if (!containerShift?.id) return;

    const hasSelectedTasks = this.shiftService.selectedTasks.length > 0;
    const currentWeekday = this.currentWeekdaySignal();
    const currentSlot = this.currentSlotSignal();

    if (hasSelectedTasks && currentWeekday !== undefined && currentSlot) {
      this.createTemplateFromSelectedTasks(
        containerShift.id,
        currentWeekday,
        currentSlot
      );
    }

    this.loadingSignal.set(true);
    const templates = this.editTemplates();

    if (templates.length === 0) {
      this.loadingSignal.set(false);
      return;
    }

    const hasNewTemplates = templates.some((t) => !t.id);
    const saveAction = hasNewTemplates
      ? this.addTemplates(containerShift.id, templates)
      : this.updateTemplates(containerShift.id, templates);

    saveAction.pipe(takeUntil(this.destroy$)).subscribe({
      next: (savedTemplates) => {
        this.editTemplates.set(savedTemplates);
        this.editTemplatesDummy.set(cloneObject(savedTemplates));
        this.loadingSignal.set(false);
        this.shiftService.clearTasks();
        this.onSaveCompleted?.();
      },
      error: () => {
        this.loadingSignal.set(false);
      },
    });
  }

  resetData(): void {
    this.editTemplates.set(cloneObject(this.editTemplatesDummy()));
    this.shiftService.clearTasks();
    this.shiftService.setSelectedShift(null);

    const currentWeekday = this.currentWeekdaySignal();
    if (currentWeekday !== undefined) {
      this.loadTasksForWeekday(currentWeekday).subscribe();
    }

    this.isReset.set(true);
    setTimeout(() => this.isReset.set(false), 100);
  }

  loadTemplates(containerId: string): void {
    this.loadingSignal.set(true);
    this.getTemplates(containerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (templates) => {
          this.editTemplates.set(templates);
          this.editTemplatesDummy.set(cloneObject(templates));
          this.fireIsReadEvent();
          this.loadingSignal.set(false);
        },
        error: () => {
          this.loadingSignal.set(false);
        },
      });
  }

  goBack(): string {
    return '/workplace/shift';
  }

  private isValid(): boolean {
    const templates = this.editTemplates();
    return templates.every(
      (t) =>
        t.containerId &&
        t.weekday !== undefined &&
        t.fromTime &&
        t.untilTime &&
        t.items.length > 0
    );
  }

  private fireIsReadEvent(): void {
    this.isRead.set(true);
    setTimeout(() => this.isRead.set(false), 100);
  }

  getCurrentTemplates(): IContainerTemplate[] {
    return this.editTemplates();
  }

  createTemplateFromSelectedTasks(
    containerId: string,
    weekday: number,
    slot: IContainerTemplateSlot
  ): void {
    const selectedTasks = this.shiftService.selectedTasks;

    if (selectedTasks.length === 0) return;

    const items: IContainerTemplateItem[] = selectedTasks
      .filter((task) => task.id)
      .map((task) => ({
        shiftId: task.id!,
        shift: task,
      }));

    const newTemplate: IContainerTemplate = {
      containerId: containerId,
      weekday: weekday,
      fromTime: slot.fromTime,
      untilTime: slot.untilTime,
      isHoliday: slot.isHoliday,
      isWeekdayOrHoliday: slot.isWeekdayOrHoliday,
      items: items,
    };

    const templates = this.editTemplates();
    this.editTemplates.set([...templates, newTemplate]);
  }

  removeTemplate(index: number): void {
    const templates = this.editTemplates();
    const updated = [...templates];
    updated.splice(index, 1);
    this.editTemplates.set(updated);
  }

  clearAllTemplates(): void {
    const containerShift = this.currentContainerShiftSignal();
    if (!containerShift?.id) return;

    this.loadingSignal.set(true);
    this.deleteTemplates(containerShift.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.editTemplates.set([]);
          this.editTemplatesDummy.set([]);
          this.loadingSignal.set(false);
        },
        error: () => {
          this.loadingSignal.set(false);
        },
      });
  }

  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.reset();
  }
}
