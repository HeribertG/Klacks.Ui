import { Injectable, inject, signal } from '@angular/core';
import { Observable, forkJoin, of, Subject } from 'rxjs';
import { map, tap, catchError, takeUntil } from 'rxjs/operators';
import { IShift } from '../../models/shift-class';
import {
  IContainerTemplate,
  IContainerTemplateItem,
  IRouteInfo,
} from '../../models/container-template-class';
import { ContainerTransportModeEnum } from '../../enums/transport-mode.enum';
import {
  IContainerTemplateGrid,
  IContainerTemplateSlot,
} from '../../models/container-template-slot';
import { DataContainerTemplateService } from '../../../infrastructure/api/data-container-template.service';
import { ContainerTemplateSlotCalculationService } from './container-template-slot-calculation.service';
import {
  ContainerTemplateShiftService,
  IWeekdayContainerTemplateItemsMap,
} from './container-template-shift.service';
import {
  ISaveable,
  IResettable,
  ILoadable,
  INavigable,
} from '../../interfaces/manageable.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from '../../interfaces/manageable-service-registry.interface';
import { RouteName } from '../../models/entity-names.enum';
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
        this.allLoadedShiftsSignal.set(this.getUniqueShifts(allShifts));

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

  getActiveWeekdays(shift: IShift): { value: string; labelKey: string }[] {
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

  private currentWeekdaySignal = signal<number | undefined>(undefined);
  private currentSlotSignal = signal<IContainerTemplateSlot | undefined>(
    undefined
  );
  private allLoadedShiftsSignal = signal<IShift[]>([]);

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

    const weekdayMapping: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    let templates = this.editTemplates();

    Object.entries(weekdayTasksMap).forEach(([weekdayName, tasks]) => {
      if (tasks.length === 0) return;

      const weekdayNumber = weekdayMapping[weekdayName];
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
    const weekdayNumberToName: Record<
      number,
      keyof IWeekdayContainerTemplateItemsMap
    > = {
      0: 'sunday',
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday',
    };

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
      const weekdayName = weekdayNumberToName[template.weekday];
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
    const templates = this.editTemplates();
    const existingTemplate = templates.find(
      (t) => t.weekday === weekday && t.isHoliday === isHoliday
    );

    if (existingTemplate) {
      const updated = templates.map((template) => {
        if (template.weekday === weekday && template.isHoliday === isHoliday) {
          return { ...template, startBase };
        }
        return template;
      });
      this.editTemplates.set(updated);
    } else {
      this.createOrUpdateTemplateProperty(weekday, isHoliday, { startBase });
    }
  }

  updateEndBase(weekday: number, isHoliday: boolean, endBase: string): void {
    const templates = this.editTemplates();
    const existingTemplate = templates.find(
      (t) => t.weekday === weekday && t.isHoliday === isHoliday
    );

    if (existingTemplate) {
      const updated = templates.map((template) => {
        if (template.weekday === weekday && template.isHoliday === isHoliday) {
          return { ...template, endBase };
        }
        return template;
      });
      this.editTemplates.set(updated);
    } else {
      this.createOrUpdateTemplateProperty(weekday, isHoliday, { endBase });
    }
  }

  updateTransportMode(
    weekday: number,
    isHoliday: boolean,
    transportMode: ContainerTransportModeEnum
  ): void {
    const templates = this.editTemplates();
    const existingTemplate = templates.find(
      (t) => t.weekday === weekday && t.isHoliday === isHoliday
    );

    if (existingTemplate) {
      const updated = templates.map((template) => {
        if (template.weekday === weekday && template.isHoliday === isHoliday) {
          return { ...template, transportMode };
        }
        return template;
      });
      this.editTemplates.set(updated);
    } else {
      this.createOrUpdateTemplateProperty(weekday, isHoliday, {
        transportMode,
      });
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
    const templates = this.editTemplates();
    const updated = templates.map((template) => {
      if (template.weekday === weekday && template.isHoliday === isHoliday) {
        return {
          ...template,
          fromTime: fromTime,
        };
      }
      return template;
    });
    this.editTemplates.set(updated);
  }

  updateUntilTime(
    weekday: number,
    isHoliday: boolean,
    untilTime: string
  ): void {
    const templates = this.editTemplates();
    const updated = templates.map((template) => {
      if (template.weekday === weekday && template.isHoliday === isHoliday) {
        return {
          ...template,
          untilTime: untilTime,
        };
      }
      return template;
    });
    this.editTemplates.set(updated);
  }

  updateRouteInfo(
    weekday: number,
    isHoliday: boolean,
    routeInfo: IRouteInfo
  ): void {
    const templates = this.editTemplates();
    const existingTemplate = templates.find(
      (t) => t.weekday === weekday && t.isHoliday === isHoliday
    );

    if (existingTemplate) {
      const updated = templates.map((template) => {
        if (template.weekday === weekday && template.isHoliday === isHoliday) {
          return {
            ...template,
            routeInfo: routeInfo,
          };
        }
        return template;
      });
      this.editTemplates.set(updated);
    } else {
      const containerShift = this.currentContainerShiftSignal();
      if (!containerShift?.id) return;

      const grid = this.templateGridSignal();
      const slot = grid?.slots
        .flat()
        .find((s) => s.weekday === weekday && s.isHoliday === isHoliday);

      const newTemplate: IContainerTemplate = {
        containerId: containerShift.id,
        weekday: weekday,
        fromTime: slot?.fromTime || '00:00',
        untilTime: slot?.untilTime || '23:59',
        isHoliday: isHoliday,
        isWeekdayAndHoliday: slot?.isWeekdayAndHoliday || false,
        routeInfo: routeInfo,
        containerTemplateItems: [],
      };
      this.editTemplates.set([...templates, newTemplate]);
    }
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

  filterAvailableTasksBySearch(
    shifts: IShift[],
    searchString: string,
    includeAddress = false
  ): IShift[] {
    if (!searchString || searchString.trim() === '') {
      return shifts;
    }

    const search = searchString.toLowerCase().trim();

    return shifts.filter((shift) => {
      const name = shift.name?.toLowerCase() || '';
      const abbreviation = shift.abbreviation?.toLowerCase() || '';
      const clientName = shift.client?.name?.toLowerCase() || '';

      const matchesBasicSearch =
        name.includes(search) ||
        abbreviation.includes(search) ||
        clientName.includes(search);

      if (matchesBasicSearch) {
        return true;
      }

      if (includeAddress && shift.client?.addresses) {
        for (const address of shift.client.addresses) {
          const street = address.street?.toLowerCase() || '';
          const zip = address.zip?.toLowerCase() || '';
          const city = address.city?.toLowerCase() || '';

          if (
            street.includes(search) ||
            zip.includes(search) ||
            city.includes(search)
          ) {
            return true;
          }
        }
      }

      return false;
    });
  }

  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.reset();
  }
}
