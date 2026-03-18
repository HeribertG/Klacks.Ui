// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Orchestrierungs-Service fuer Container-Template CRUD, State-Management und Persistenz.
 * Delegiert Task/Shift-Hilfsfunktionen an ContainerTaskService.
 * @param dataService - API-Service fuer Container-Template HTTP-Calls
 * @param slotCalculationService - Berechnet das Template-Grid aus Schicht-Daten
 * @param shiftService - Verwaltet die ausgewaehlten Container-Template-Items pro Wochentag
 * @param taskService - Stellt Task/Shift-Hilfsfunktionen bereit (Sortierung, Filterung, Weekday-Mapping)
 */
import { Injectable, inject, signal } from '@angular/core';
import { Observable, forkJoin, of, Subject } from 'rxjs';
import { map, tap, catchError, takeUntil } from 'rxjs/operators';
import { IShift } from '../../models/shift/shift-class';
import {
  IContainerTemplate,
  IContainerTemplateItem,
  IRouteInfo,
} from '../../models/container/container-template-class';
import { ContainerTransportModeEnum } from '../../enums/transport-mode.enum';
import {
  IContainerTemplateGrid,
  IContainerTemplateSlot,
} from '../../models/container/container-template-slot';
import { DataContainerTemplateService } from '../../../infrastructure/api/container/data-container-template.service';
import { ContainerTemplateSlotCalculationService } from './container-template-slot-calculation.service';
import {
  ContainerTemplateShiftService,
  IWeekdayContainerTemplateItemsMap,
} from './container-template-shift.service';
import { ContainerTaskService } from './container-task.service';
import {
  ISaveable,
  IResettable,
  ILoadable,
  INavigable,
} from '../../interfaces/manageable.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from '../../interfaces/manageable-service-registry.interface';
import { RouteName } from '../../enums/entity-names.enum';
import {
  cloneObject,
  compareComplexObjects,
} from 'src/app/shared/helpers/object.helper';

@Injectable({
  providedIn: 'root',
})
export class DataManagementContainerService
  implements ISaveable, IResettable, ILoadable, INavigable
{
  private dataService = inject(DataContainerTemplateService);
  private slotCalculationService = inject(
    ContainerTemplateSlotCalculationService
  );
  private shiftService = inject(ContainerTemplateShiftService);
  private taskService = inject(ContainerTaskService);
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

  private currentWeekdaySignal = signal<number | undefined>(undefined);
  private currentSlotSignal = signal<IContainerTemplateSlot | undefined>(
    undefined
  );
  private allLoadedShiftsSignal = signal<IShift[]>([]);

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

  loadTasksForWeekday(
    weekday: number,
    searchString?: string
  ): Observable<void> {
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
      this.loadAvailableTasksForSlot(
        grid.containerShift.id!,
        slot,
        searchString
      )
    );

    return forkJoin(loadTasks$).pipe(
      map(() => {
        const allShifts: IShift[] = [];
        grid.slots.flat().forEach((slot) => {
          if (slot.availableTasks) {
            allShifts.push(...slot.availableTasks);
          }
        });
        this.allLoadedShiftsSignal.set(this.taskService.getUniqueShifts(allShifts));

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
        slot.effectiveWeekday,
        slot.fromTime,
        slot.untilTime,
        searchString,
        undefined,
        slot.isHoliday,
        slot.isWeekdayAndHoliday
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

  postTemplates(
    containerId: string,
    templates: IContainerTemplate[]
  ): Observable<IContainerTemplate[]> {
    return this.dataService.postTemplates(containerId, templates);
  }

  putTemplates(
    containerId: string,
    templates: IContainerTemplate[]
  ): Observable<IContainerTemplate[]> {
    return this.dataService.putTemplates(containerId, templates);
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

  getActiveWeekdays(shift: IShift): { value: string; labelKey: string }[] {
    return this.taskService.getActiveWeekdays(shift);
  }

  getWeekdayNumber(weekdayValue: string): number {
    return this.taskService.getWeekdayNumber(weekdayValue);
  }

  getFilteredRowsForWeekday(
    grid: IContainerTemplateGrid | null,
    weekdayNumber: number
  ): IContainerTemplateSlot[][] {
    return this.taskService.getFilteredRowsForWeekday(grid, weekdayNumber);
  }

  getUniqueShifts(shifts: IShift[]): IShift[] {
    return this.taskService.getUniqueShifts(shifts);
  }

  sortShifts(
    shifts: IShift[],
    orderBy: string,
    sortOrder: 'asc' | 'desc' | ''
  ): IShift[] {
    return this.taskService.sortShifts(shifts, orderBy, sortOrder);
  }

  filterAvailableTasksBySearch(
    shifts: IShift[],
    searchString: string,
    includeAddress = false
  ): IShift[] {
    return this.taskService.filterAvailableTasksBySearch(shifts, searchString, includeAddress);
  }

  canSave(): boolean {
    const hasSelectedTasks = this.hasAnyWeekdayTasks();
    const canSaveTemplates = this.areObjectsDirty() && this.isValid();
    return hasSelectedTasks || canSaveTemplates;
  }

  areObjectsDirty(): boolean {
    const hasTemplateChanges = !compareComplexObjects(
      this.editTemplates(),
      this.editTemplatesDummy()
    );
    const hasUnsavedTasks = this.hasUnsavedTasks();
    return hasTemplateChanges || hasUnsavedTasks;
  }

  private hasUnsavedTasks(): boolean {
    const weekdayTasksMap = this.shiftService.getAllWeekdayTasks();
    for (const tasks of Object.values(weekdayTasksMap)) {
      if (
        tasks.some((task: IContainerTemplateItem) => !task.id && task.tmpId)
      ) {
        return true;
      }
    }
    return false;
  }

  private hasAnyWeekdayTasks(): boolean {
    const weekdayTasksMap = this.shiftService.getAllWeekdayTasks();
    return Object.values(weekdayTasksMap).some((tasks) => tasks.length > 0);
  }

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

    this.createTemplatesFromAllWeekdayTasks(containerShift.id);

    this.loadingSignal.set(true);
    const templates = this.editTemplates();

    if (templates.length === 0) {
      this.loadingSignal.set(false);
      return;
    }

    const hasExistingItems = templates.some((t) =>
      t.containerTemplateItems?.some(
        (containerTemplateItem) => containerTemplateItem.id != null
      )
    );
    const saveAction = hasExistingItems
      ? this.putTemplates(containerShift.id, templates)
      : this.postTemplates(containerShift.id, templates);

    saveAction.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.editTemplates.set([]);
        this.editTemplatesDummy.set([]);
        this.shiftService.clearAllTasks();
        this.shiftService.setSelectedShift(null);
        this.loadingSignal.set(false);
        this.onSaveCompleted?.();
      },
      error: () => {
        this.loadingSignal.set(false);
      },
    });
  }

  resetData(): void {
    this.editTemplates.set(cloneObject(this.editTemplatesDummy()));
    this.shiftService.clearAllTasks();
    this.shiftService.setSelectedShift(null);

    const templates = this.editTemplatesDummy();
    this.restoreWeekdayTasksFromTemplates(templates);

    const currentWeekday = this.currentWeekdaySignal();
    if (currentWeekday !== undefined) {
      this.loadTasksForWeekday(currentWeekday).subscribe();
    }

    this.isReset.set(true);
    setTimeout(() => this.isReset.set(false), 100);
  }

  loadTemplates(containerId: string): Observable<void> {
    this.loadingSignal.set(true);
    return this.getTemplates(containerId).pipe(
      takeUntil(this.destroy$),
      map((templates) => {
        this.editTemplates.set(templates);
        this.editTemplatesDummy.set(cloneObject(templates));
        this.restoreWeekdayTasksFromTemplates(templates);
        this.fireIsReadEvent();
        this.loadingSignal.set(false);
        return void 0;
      }),
      catchError(() => {
        this.loadingSignal.set(false);
        return of(void 0);
      })
    );
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
        t.containerTemplateItems &&
        t.containerTemplateItems.length > 0
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
    const selectedContainerTemplateItems =
      this.shiftService.selectedContainerTemplateItems;

    if (selectedContainerTemplateItems.length === 0) return;

    const containerTemplateItems: IContainerTemplateItem[] =
      selectedContainerTemplateItems.filter((task) => task.shiftId);

    const newTemplate: IContainerTemplate = {
      containerId: containerId,
      weekday: weekday,
      fromTime: slot.fromTime,
      untilTime: slot.untilTime,
      isHoliday: slot.isHoliday,
      isWeekdayAndHoliday: slot.isWeekdayAndHoliday,
      containerTemplateItems: containerTemplateItems,
    };

    const templates = this.editTemplates();
    this.editTemplates.set([...templates, newTemplate]);
  }

  private createTemplatesFromAllWeekdayTasks(containerId: string): void {
    const weekdayTasksMap = this.shiftService.getAllWeekdayTasks();
    const grid = this.templateGridSignal();

    if (!grid) return;

    let templates = this.editTemplates();

    Object.entries(weekdayTasksMap).forEach(([weekdayName, tasks]) => {
      if (tasks.length === 0) return;

      const weekdayNumber = ContainerTaskService.WEEKDAY_NAME_TO_NUMBER[weekdayName];
      const slotsForWeekday = grid.slots
        .flat()
        .filter((slot) => slot.weekday === weekdayNumber);

      if (slotsForWeekday.length === 0) return;

      const slot = slotsForWeekday[0];

      const containerTemplateItems: IContainerTemplateItem[] = tasks.filter(
        (task: IContainerTemplateItem) => task.shiftId
      );

      const existingTemplate = templates.find(
        (t) => t.weekday === weekdayNumber && t.isHoliday === slot.isHoliday
      );

      const newTemplate: IContainerTemplate = {
        id: existingTemplate?.id,
        containerId: containerId,
        weekday: weekdayNumber,
        fromTime: existingTemplate?.fromTime ?? slot.fromTime,
        untilTime: existingTemplate?.untilTime ?? slot.untilTime,
        isHoliday: slot.isHoliday,
        isWeekdayAndHoliday: slot.isWeekdayAndHoliday,
        startBase: existingTemplate?.startBase,
        endBase: existingTemplate?.endBase,
        routeInfo: existingTemplate?.routeInfo,
        transportMode: existingTemplate?.transportMode,
        containerTemplateItems: containerTemplateItems,
      };

      if (existingTemplate) {
        templates = templates.map((t) =>
          t.weekday === weekdayNumber && t.isHoliday === slot.isHoliday
            ? newTemplate
            : t
        );
      } else {
        templates = [...templates, newTemplate];
      }
    });

    this.editTemplates.set(templates);
  }

  private restoreWeekdayTasksFromTemplates(
    templates: IContainerTemplate[]
  ): void {
    const weekdayContainerTemplateItemsMap: IWeekdayContainerTemplateItemsMap =
      {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
      };

    const allLoadedShifts = this.allLoadedShiftsSignal();

    templates.forEach((template) => {
      const weekdayName = ContainerTaskService.WEEKDAY_NUMBER_TO_NAME[template.weekday];
      if (weekdayName && template.containerTemplateItems) {
        const enrichedItems = template.containerTemplateItems.map((item) => {
          const matchingShift = allLoadedShifts.find(
            (s) => s.id === item.shiftId
          );
          if (matchingShift) {
            return {
              ...item,
              shift: matchingShift,
            };
          }
          return item;
        });

        weekdayContainerTemplateItemsMap[weekdayName] = enrichedItems;
      }
    });

    this.shiftService.setAllWeekdayTasks(weekdayContainerTemplateItemsMap);
  }

  removeTemplate(index: number): void {
    const templates = this.editTemplates();
    const updated = [...templates];
    updated.splice(index, 1);
    this.editTemplates.set(updated);
  }

  removeTaskItemFromTemplates(
    taskId: string,
    weekday: number,
    isHoliday: boolean
  ): void {
    const templates = this.editTemplates();
    const updated = templates.map((template) => {
      if (template.weekday === weekday && template.isHoliday === isHoliday) {
        return {
          ...template,
          containerTemplateItems: (
            template.containerTemplateItems || []
          ).filter((item) => (item.id || item.tmpId) !== taskId),
        };
      }
      return template;
    });
    this.editTemplates.set(updated);
  }

  updateTaskOrderInTemplates(
    orderedTasks: IContainerTemplateItem[],
    weekday: number,
    isHoliday: boolean
  ): void {
    const templates = this.editTemplates();
    const updated = templates.map((template) => {
      if (template.weekday === weekday && template.isHoliday === isHoliday) {
        return {
          ...template,
          containerTemplateItems: orderedTasks,
        };
      }
      return template;
    });
    this.editTemplates.set(updated);
  }

  updateStartBase(
    weekday: number,
    isHoliday: boolean,
    startBase: string
  ): void {
    this.updateTemplateProperty(weekday, isHoliday, { startBase });
  }

  updateEndBase(weekday: number, isHoliday: boolean, endBase: string): void {
    this.updateTemplateProperty(weekday, isHoliday, { endBase });
  }

  updateTransportMode(
    weekday: number,
    isHoliday: boolean,
    transportMode: ContainerTransportModeEnum
  ): void {
    this.updateTemplateProperty(weekday, isHoliday, { transportMode });
  }

  private updateTemplateProperty(
    weekday: number,
    isHoliday: boolean,
    properties: Partial<IContainerTemplate>
  ): void {
    const templates = this.editTemplates();
    const exists = templates.some(
      (t) => t.weekday === weekday && t.isHoliday === isHoliday
    );

    if (exists) {
      const updated = templates.map((template) => {
        if (template.weekday === weekday && template.isHoliday === isHoliday) {
          return { ...template, ...properties };
        }
        return template;
      });
      this.editTemplates.set(updated);
    } else {
      this.createOrUpdateTemplateProperty(weekday, isHoliday, properties);
    }
  }

  private createOrUpdateTemplateProperty(
    weekday: number,
    isHoliday: boolean,
    properties: Partial<IContainerTemplate>
  ): void {
    const containerShift = this.currentContainerShiftSignal();
    if (!containerShift?.id) return;

    const grid = this.templateGridSignal();
    if (!grid) return;

    const slot = grid.slots
      .flat()
      .find((s) => s.weekday === weekday && s.isHoliday === isHoliday);
    if (!slot) return;

    const newTemplate: IContainerTemplate = {
      containerId: containerShift.id,
      weekday,
      fromTime: slot.fromTime,
      untilTime: slot.untilTime,
      isHoliday,
      isWeekdayAndHoliday: slot.isWeekdayAndHoliday,
      containerTemplateItems: [],
      ...properties,
    };

    const templates = this.editTemplates();
    this.editTemplates.set([...templates, newTemplate]);
  }

  getTemplateForWeekday(
    weekday: number,
    isHoliday: boolean
  ): IContainerTemplate | undefined {
    const templates = this.editTemplates();
    return templates.find(
      (template) =>
        template.weekday === weekday && template.isHoliday === isHoliday
    );
  }

  updateFromTime(weekday: number, isHoliday: boolean, fromTime: string): void {
    this.updateTemplateProperty(weekday, isHoliday, { fromTime });
  }

  updateUntilTime(
    weekday: number,
    isHoliday: boolean,
    untilTime: string
  ): void {
    this.updateTemplateProperty(weekday, isHoliday, { untilTime });
  }

  updateRouteInfo(
    weekday: number,
    isHoliday: boolean,
    routeInfo: IRouteInfo
  ): void {
    this.updateTemplateProperty(weekday, isHoliday, { routeInfo });
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

  addShiftToAvailableTasks(shift: IShift, weekday: number): void {
    const grid = this.templateGridSignal();
    if (!grid) return;

    const slotsForWeekday = grid.slots
      .flat()
      .filter((slot) => slot.weekday === weekday);

    slotsForWeekday.forEach((slot) => {
      if (!slot.availableTasks) {
        slot.availableTasks = [];
      }

      const exists = slot.availableTasks.some((t) => t.id === shift.id);
      if (!exists) {
        slot.availableTasks.push(shift);
      }
    });

    this.templateGridSignal.set({ ...grid });
  }

  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.reset();
  }
}
