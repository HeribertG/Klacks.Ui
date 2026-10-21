// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Observable, Subject, of, takeUntil } from 'rxjs';
import { OwnTime } from 'src/app/domain/models/schedule/own-time-class';
import { IShift } from 'src/app/domain/models/shift/shift.interface';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-item.interface';
import { IContainerTemplateGrid } from 'src/app/domain/models/container/container-template-grid.interface';
import { IContainerTemplateSlot } from 'src/app/domain/models/container/container-template-slot';
import { DataManagementContainerService } from 'src/app/domain/services/container/data-management.container.service';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { ContainerLockService } from 'src/app/domain/services/container/container-lock.service';
import { ContainerLockResourceType } from 'src/app/domain/models/container/container-lock';
import { AddressProviderService } from 'src/app/domain/services/address-provider.service';
import { FT_HOLIDAY_TEMPLATE_WEEKDAY_NAME } from 'src/app/domain/constants/container-template-holiday.constants';
import { DirectionService } from 'src/app/application/services/direction.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { IShiftContextMenuEvent } from 'src/app/presentation/shared/time-ruler/shift-context-menu-event.interface';
import { ContainerTemplateComponent } from './container-template.component';
import { ContainerTemplateRouteService } from './services/container-template-route.service';
import { ContainerTemplatePropertiesService } from './services/container-template-properties.service';
import { ContainerTemplateTabService } from './services/container-template-tab.service';
import { ContainerTemplateLifecycleService } from './services/container-template-lifecycle.service';
import { ContainerTemplateShiftOperationsService } from './services/container-template-shift-operations.service';
import { ContainerTemplateAbsenceService } from './services/container-template-absence.service';
import { ContainerTemplateDragDropService } from './services/container-template-drag-drop.service';
import { ContainerTemplateEditorStateService } from './services/container-template-editor-state.service';
import { ContainerTemplateSelectionService } from './services/container-template-selection.service';
import { ContainerTemplateTimeWindowService } from './services/container-template-time-window.service';
import { ContainerTemplateTaskActionsService } from './services/container-template-task-actions.service';
import { ContainerTemplateViewRefreshService } from './services/container-template-view-refresh.service';

@Component({
  selector: 'app-context-menu',
  standalone: true,
  template: '',
})
class ContextMenuStubComponent {
  menuData: unknown = null;
  openMenu = vi.fn();
  closeMenu = vi.fn();
}

const STUB_TEMPLATE = `
  <app-context-menu #contextMenu></app-context-menu>
  <ng-template #propertiesModal></ng-template>
  <ng-template #absenceTimeModal></ng-template>
`;

const SHIFT_ID = 'container-1';
const WEEKDAY_NUMBERS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const createShift = (overrides: Partial<IShift> = {}): IShift =>
  ({
    id: SHIFT_ID,
    name: 'Container',
    startShift: '07:00:00',
    endShift: '15:30:00',
    isHoliday: false,
    isWeekdayAndHoliday: false,
    ...overrides,
  }) as IShift;

const weekdayOption = (value: string) => ({
  value,
  labelKey: `shift.container-template.weekday.${value}`,
});

describe('ContainerTemplateComponent (characterization)', () => {
  let fixture: ComponentFixture<ContainerTemplateComponent>;
  let component: ContainerTemplateComponent;
  let calls: string[];
  let routeParams: BehaviorSubject<{ id?: string }>;
  let loadedShift: IShift;
  let activeWeekdays: { value: string; labelKey: string }[];
  let lockResult: Observable<unknown>;
  let selectedItems: ReturnType<typeof signal<IContainerTemplateItem[]>>;
  let templateGrid: ReturnType<typeof signal<IContainerTemplateGrid | null>>;
  let loading: ReturnType<typeof signal<boolean>>;
  let isReset: ReturnType<typeof signal<boolean>>;
  let search: ReturnType<typeof signal<string>>;
  let includeAddress: ReturnType<typeof signal<boolean>>;
  let tabRows: IContainerTemplateSlot[][];

  let containerService: Record<string, ReturnType<typeof vi.fn> | unknown>;
  let shiftService: Record<string, unknown>;
  let lockService: Record<string, ReturnType<typeof vi.fn>>;
  let toastService: Record<string, ReturnType<typeof vi.fn>>;
  let sortingService: Record<string, ReturnType<typeof vi.fn>>;
  let routeService: Record<string, unknown>;
  let propertiesService: Record<string, unknown>;
  let tabService: Record<string, unknown>;
  let lifecycleService: Record<string, unknown>;
  let shiftOpsService: Record<string, ReturnType<typeof vi.fn>>;
  let absenceService: Record<string, ReturnType<typeof vi.fn>>;
  let dragDropService: Record<string, ReturnType<typeof vi.fn>>;

  const recorder = (name: string, result?: unknown) =>
    vi.fn((..._args: unknown[]) => {
      calls.push(name);
      return result;
    });

  const service = <T>(token: new (...args: never[]) => T): T => fixture.debugElement.injector.get(token);
  const view = () => service(ContainerTemplateEditorStateService) as unknown as Record<string, unknown>;
  const act = {
    holidayVariantChange: () => service(ContainerTemplateSelectionService).onHolidayVariantChange(),
    timeFromChange: (time: OwnTime) => service(ContainerTemplateTimeWindowService).onTimeFromChange(time),
    timeToChange: (time: OwnTime) => service(ContainerTemplateTimeWindowService).onTimeToChange(time),
    weekdayChange: () => service(ContainerTemplateSelectionService).onWeekdayChange(),
    selectTab: (index: number) => service(ContainerTemplateSelectionService).selectTab(index),
    removeAllTasks: () => service(ContainerTemplateTaskActionsService).removeAllTasks(),
    removeTask: (item: IContainerTemplateItem) => service(ContainerTemplateTaskActionsService).removeTask(item),
    autofill: () => service(ContainerTemplateTaskActionsService).autofill(),
    optimizeRoute: () => service(ContainerTemplateTaskActionsService).optimizeRoute(),
    compact: (keep?: boolean) => service(ContainerTemplateTaskActionsService).compactSelectedShifts(keep),
    headerClick: (key: string) => service(ContainerTemplateViewRefreshService).sortBy(key),
    tableRowRightClick: (event: MouseEvent, item: IContainerTemplateItem) =>
      component.onTableRowRightClick(event, item),
    shiftRightClick: (event: IShiftContextMenuEvent) => component.onShiftRightClick(event),
    contextMenuClick: (keys: string[]) => component.onContextMenuClick(keys),
    absenceRowDblClick: (item: IContainerTemplateItem) => component.onAbsenceRowDblClick(item),
    exportShifts: () => service(ContainerTemplateTaskActionsService).exportSelectedShiftsToPdf(),
    exportRoute: () => service(ContainerTemplateTaskActionsService).exportRouteToPdf(),
  };
  const contextMenuStub = () =>
    fixture.debugElement.children[0].componentInstance as ContextMenuStubComponent;

  beforeEach(() => {
    calls = [];
    routeParams = new BehaviorSubject<{ id?: string }>({ id: SHIFT_ID });
    loadedShift = createShift();
    activeWeekdays = [weekdayOption('tuesday'), weekdayOption('thursday')];
    lockResult = of({ acquired: true, isSelfConflict: false, userName: '' });
    selectedItems = signal<IContainerTemplateItem[]>([]);
    templateGrid = signal<IContainerTemplateGrid | null>(null);
    loading = signal(false);
    isReset = signal(false);
    search = signal('');
    includeAddress = signal(false);
    tabRows = [[{ weekday: 2 } as IContainerTemplateSlot], [{ weekday: 2 } as IContainerTemplateSlot]];

    containerService = {
      templateGrid: templateGrid.asReadonly(),
      loading: loading.asReadonly(),
      isReset: isReset.asReadonly(),
      areObjectsDirty: vi.fn(() => false),
      canSave: vi.fn(() => false),
      getActiveWeekdays: vi.fn(() => activeWeekdays),
      getWeekdayNumber: vi.fn((name: string) => WEEKDAY_NUMBERS[name] ?? -1),
      initializeTemplateGrid: recorder('initializeTemplateGrid', of(undefined)),
      loadTasksForWeekday: recorder('loadTasksForWeekday', of(undefined)),
      loadTemplates: recorder('loadTemplates', of(undefined)),
      updateFromTime: recorder('updateFromTime'),
      updateUntilTime: recorder('updateUntilTime'),
      setCurrentWeekdayAndSlot: recorder('setCurrentWeekdayAndSlot'),
      destroy: recorder('containerService.destroy'),
    };
    shiftService = {
      selectedContainerTemplateItemsSignal: selectedItems.asReadonly(),
      selectedShiftSignal: signal<IContainerTemplateItem | null>(null),
      setSelectedShift: recorder('setSelectedShift'),
      setCurrentWeekday: recorder('setCurrentWeekday'),
    };
    lockService = {
      acquire: vi.fn((..._args: unknown[]) => {
        calls.push('acquire');
        return lockResult;
      }),
      release: recorder('release'),
    };
    toastService = { showInfo: recorder('showInfo') };
    sortingService = {
      initialize: recorder('sorting.initialize'),
      onHeaderClick: vi.fn((_key: string, callback: () => void) => callback()),
      getArrow: vi.fn(() => ''),
    };
    routeService = {
      selectedStartBase: '',
      selectedEndBase: '',
      autofill: recorder('autofill'),
      optimizeRoute: recorder('optimizeRoute'),
      loadStartEndBaseForCurrentTemplate: recorder('loadStartEndBase'),
    };
    propertiesService = {
      contextMenuTargetItem: null,
      openPropertiesDialog: recorder('openPropertiesDialog'),
    };
    tabService = {
      selectedTabIndex: 0,
      availableTasks: [{ id: 'available-1' } as IShift],
      onWeekdayChange: recorder('tab.onWeekdayChange'),
      selectTab: recorder('tab.selectTab'),
      selectEmploymentTab: vi.fn(async () => {
        calls.push('tab.selectEmploymentTab');
      }),
      updateAvailableTasks: recorder('updateAvailableTasks'),
      getFilteredRowsForSelectedWeekday: vi.fn(() => tabRows),
      getTabLabel: vi.fn((index: number) => `tab-${index}`),
    };
    lifecycleService = {
      searchStateService: {
        containerTemplateSearch: search.asReadonly(),
        containerTemplateIncludeAddress: includeAddress.asReadonly(),
      },
      workplaceStateService: { areObjectsDirty: vi.fn(() => false) },
      initialize: recorder('lifecycle.initialize'),
      registerSaveCompletedCallback: recorder('registerSaveCompletedCallback'),
      observeRouteParams: vi.fn((destroy$: Subject<void>) => {
        calls.push('observeRouteParams');
        return new Observable<string>((subscriber) =>
          routeParams.subscribe((params) => subscriber.next(params.id as string)),
        ).pipe(takeUntil(destroy$));
      }),
      loadShift: vi.fn((..._args: unknown[]) => {
        calls.push('loadShift');
        return of(loadedShift);
      }),
      markDirty: recorder('markDirty'),
    };
    shiftOpsService = {
      calculateDuration: vi.fn((from: OwnTime, to: OwnTime) => {
        calls.push('calculateDuration');
        const minutes = to.toMinutes() - from.toMinutes();
        return OwnTime.forDuration(
          String(Math.floor(minutes / 60)).padStart(2, '0'),
          String(minutes % 60).padStart(2, '0'),
        );
      }),
      removeTask: vi.fn(
        (_item: IContainerTemplateItem, _weekday: string | null, _isHoliday: boolean, onRemoved: () => void) => {
          calls.push('removeTask');
          onRemoved();
        },
      ),
      hasTimeRangeViolation: vi.fn(() => false),
      isTimeRangePartial: vi.fn(() => false),
      exportSelectedShiftsToPdf: recorder('exportSelectedShiftsToPdf'),
      exportRouteToPdf: recorder('exportRouteToPdf'),
      compactSelectedShifts: recorder('compactSelectedShifts'),
      getTimeRangeStartTime: vi.fn(),
      onTimeRangeStartChange: vi.fn(),
    };
    absenceService = {
      openAbsenceTimeModal: recorder('openAbsenceTimeModal'),
      onAbsenceStartTimeChange: vi.fn(),
      onAbsenceEndTimeChange: vi.fn(),
    };
    dragDropService = {
      getConnectedDropLists: vi.fn(() => []),
      onTaskDrop: recorder('onTaskDrop'),
    };

    TestBed.configureTestingModule({
      imports: [ContainerTemplateComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { params: routeParams.asObservable() } },
        { provide: DataManagementContainerService, useValue: containerService },
        { provide: ContainerTemplateShiftService, useValue: shiftService },
        { provide: ContainerLockService, useValue: lockService },
        { provide: ToastShowService, useValue: toastService },
        {
          provide: TranslateService,
          useValue: {
            currentLang: 'de',
            instant: vi.fn((key: string, params?: Record<string, unknown>) =>
              params ? `${key}|${JSON.stringify(params)}` : key,
            ),
          },
        },
        { provide: AddressProviderService, useValue: { allAddresses: signal([]) } },
        { provide: DirectionService, useValue: { direction: signal('ltr') } },
      ],
    });
    TestBed.overrideComponent(ContainerTemplateComponent, {
      set: { template: STUB_TEMPLATE, imports: [ContextMenuStubComponent] },
    });
    TestBed.overrideProvider(TableSortingService, { useValue: sortingService });
    TestBed.overrideProvider(ContainerTemplateRouteService, { useValue: routeService });
    TestBed.overrideProvider(ContainerTemplatePropertiesService, { useValue: propertiesService });
    TestBed.overrideProvider(ContainerTemplateTabService, { useValue: tabService });
    TestBed.overrideProvider(ContainerTemplateLifecycleService, { useValue: lifecycleService });
    TestBed.overrideProvider(ContainerTemplateShiftOperationsService, { useValue: shiftOpsService });
    TestBed.overrideProvider(ContainerTemplateAbsenceService, { useValue: absenceService });
    TestBed.overrideProvider(ContainerTemplateDragDropService, { useValue: dragDropService });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const create = () => {
    fixture = TestBed.createComponent(ContainerTemplateComponent);
    component = fixture.componentInstance;
  };

  const start = () => {
    create();
    fixture.detectChanges();
  };

  describe('initialization', () => {
    it('initializes the lifecycle, the save hook, the sorting and then loads the routed container in this order', () => {
      // Arrange
      create();

      // Act
      fixture.detectChanges();

      // Assert
      expect(calls.slice(0, 5)).toEqual([
        'lifecycle.initialize',
        'registerSaveCompletedCallback',
        'calculateDuration',
        'sorting.initialize',
        'observeRouteParams',
      ]);
      expect(sortingService['initialize']).toHaveBeenCalledWith({
        columns: ['name', 'abbreviation', 'startShift', 'client'],
        defaultOrderBy: 'name',
        defaultSortOrder: 'asc',
        useThreeWaySort: false,
      });
    });

    it('acquires the lock, loads the shift, builds the grid and loads tasks and templates of the first active weekday', () => {
      // Arrange
      create();

      // Act
      fixture.detectChanges();

      // Assert
      expect(lockService['acquire']).toHaveBeenCalledWith(ContainerLockResourceType.containerTemplate, SHIFT_ID);
      expect(calls).toContain('acquire');
      const loadOrder = calls.filter((c) =>
        ['acquire', 'loadShift', 'initializeTemplateGrid', 'loadTasksForWeekday', 'loadTemplates'].includes(c),
      );
      expect(loadOrder).toEqual(['acquire', 'loadShift', 'initializeTemplateGrid', 'loadTasksForWeekday', 'loadTemplates']);
      expect(containerService['initializeTemplateGrid']).toHaveBeenCalledWith(loadedShift);
      expect(containerService['loadTasksForWeekday']).toHaveBeenCalledWith(2);
      expect(containerService['loadTemplates']).toHaveBeenCalledWith(SHIFT_ID);
      expect(tabService['updateAvailableTasks']).toHaveBeenLastCalledWith('tuesday', false, null, '', false);
      expect(routeService['loadStartEndBaseForCurrentTemplate']).toHaveBeenLastCalledWith('tuesday', false);
      expect(view()['isLoading']).toBe(false);
    });

    it('takes the time window, the active weekdays and the buffer key from the loaded shift', () => {
      // Arrange
      create();

      // Act
      fixture.detectChanges();

      // Assert
      const timeFrom = view()['timeFrom'] as OwnTime;
      const timeTo = view()['timeTo'] as OwnTime;
      expect([timeFrom.hours, timeFrom.minutes, timeTo.hours, timeTo.minutes]).toEqual(['07', '00', '15', '30']);
      expect((view()['duration'] as OwnTime).toMinutes()).toBe(510);
      expect(view()['weekdays']).toEqual(activeWeekdays);
      expect(view()['selectedWeekday']).toBe('tuesday');
      expect(view()['isHoliday']).toBe(false);
      expect(shiftService['setCurrentWeekday']).toHaveBeenCalledWith(
        ContainerTemplateShiftService.bufferKey('tuesday', false),
      );
    });

    it('keeps the default Monday-first weekday list and time window before a shift is loaded', () => {
      // Arrange
      routeParams.next({});

      // Act
      start();

      // Assert
      expect((view()['weekdays'] as { value: string }[]).map((w) => w.value)).toEqual([
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ]);
      const timeFrom = view()['timeFrom'] as OwnTime;
      const timeTo = view()['timeTo'] as OwnTime;
      expect([timeFrom.hours, timeFrom.minutes, timeTo.hours, timeTo.minutes]).toEqual(['06', '00', '18', '00']);
      expect(view()['selectedWeekday']).toBeNull();
      expect(lifecycleService['loadShift']).not.toHaveBeenCalled();
    });

    it('selects the fixed holiday template when an every-holiday container has no weekdays', () => {
      // Arrange
      loadedShift = createShift({ isHoliday: true, isWeekdayAndHoliday: false });
      activeWeekdays = [];

      // Act
      start();

      // Assert
      expect(view()['isHoliday']).toBe(true);
      expect(view()['selectedWeekday']).toBe(FT_HOLIDAY_TEMPLATE_WEEKDAY_NAME);
      expect(view()['isHolidayVariantLocked']).toBe(true);
      expect(view()['isWeekdaySelectionLocked']).toBe(true);
      expect(shiftService['setCurrentWeekday']).toHaveBeenCalledWith(
        ContainerTemplateShiftService.bufferKey(FT_HOLIDAY_TEMPLATE_WEEKDAY_NAME, true),
      );
    });

    it('switches to read-only with the translated reason when the lock is held by another user', () => {
      // Arrange
      lockResult = of({ acquired: false, isSelfConflict: false, userName: 'Anna' });

      // Act
      start();

      // Assert
      const expected = 'container.lock.lockedByOther|{"user":"Anna"}';
      expect(toastService['showInfo']).toHaveBeenCalledWith(expected);
      expect(view()['isReadOnly']).toBe(true);
      expect(view()['readOnlyReason']).toBe(expected);
    });

    it('uses the self-conflict message when the lock is held by the same user elsewhere', () => {
      // Arrange
      lockResult = of({ acquired: false, isSelfConflict: true, userName: 'Me' });

      // Act
      start();

      // Assert
      expect(view()['readOnlyReason']).toBe('container.lock.lockedBySelf|{"user":"Me"}');
    });

    it('reloads tasks, slot and start/end base when the save-completed hook reports a reload', () => {
      // Arrange
      start();
      const [getShift, getWeekday, getIsHoliday, onReloaded] = (
        lifecycleService['registerSaveCompletedCallback'] as ReturnType<typeof vi.fn>
      ).mock.calls[0] as [() => IShift | null, () => string | null, () => boolean, () => void];
      calls = [];

      // Act
      onReloaded();

      // Assert
      expect(getShift()).toBe(loadedShift);
      expect(getWeekday()).toBe('tuesday');
      expect(getIsHoliday()).toBe(false);
      expect(calls).toEqual(['updateAvailableTasks', 'setCurrentWeekdayAndSlot', 'loadStartEndBase']);
      expect(containerService['setCurrentWeekdayAndSlot']).toHaveBeenCalledWith(2, tabRows[0][0]);
    });
  });

  describe('signal bridges', () => {
    it('refreshes the available tasks with the new search string and address flag', () => {
      // Arrange
      start();
      (tabService['updateAvailableTasks'] as ReturnType<typeof vi.fn>).mockClear();

      // Act
      search.set('alpha');
      includeAddress.set(true);
      fixture.detectChanges();

      // Assert
      expect(tabService['updateAvailableTasks']).toHaveBeenCalledTimes(1);
      expect(tabService['updateAvailableTasks']).toHaveBeenCalledWith('tuesday', false, null, 'alpha', true);
    });

    it('mirrors the template grid and loading signals of the container service', () => {
      // Arrange
      start();
      const grid = { slots: [] } as unknown as IContainerTemplateGrid;

      // Act
      templateGrid.set(grid);
      loading.set(true);
      fixture.detectChanges();

      // Assert
      expect(view()['templateGrid']).toBe(grid);
      expect(view()['isLoading']).toBe(true);
    });

    it('refreshes the available tasks when the container service signals a reset', () => {
      // Arrange
      start();
      (tabService['updateAvailableTasks'] as ReturnType<typeof vi.fn>).mockClear();

      // Act
      isReset.set(true);
      fixture.detectChanges();

      // Assert
      expect(tabService['updateAvailableTasks']).toHaveBeenCalledTimes(1);
    });
  });

  describe('holiday variant', () => {
    it('remembers the weekday when switching an every-holiday container to its holiday template and restores it', () => {
      // Arrange
      loadedShift = createShift({ isHoliday: true, isWeekdayAndHoliday: false });
      start();
      view()['selectedWeekday'] = 'thursday';

      // Act
      view()['isHoliday'] = true;
      act.holidayVariantChange();
      const duringHoliday = view()['selectedWeekday'];
      view()['isHoliday'] = false;
      act.holidayVariantChange();

      // Assert
      expect(duringHoliday).toBe(FT_HOLIDAY_TEMPLATE_WEEKDAY_NAME);
      expect(view()['selectedWeekday']).toBe('thursday');
      expect(shiftService['setCurrentWeekday']).toHaveBeenLastCalledWith(
        ContainerTemplateShiftService.bufferKey('thursday', false),
      );
    });

    it('keeps the weekday of a +FT container and only switches the buffer key', () => {
      // Arrange
      loadedShift = createShift({ isHoliday: false, isWeekdayAndHoliday: true });
      start();

      // Act
      view()['isHoliday'] = true;
      act.holidayVariantChange();

      // Assert
      expect(view()['selectedWeekday']).toBe('tuesday');
      expect(view()['hasHolidayVariant']).toBe(true);
      expect(view()['isEveryHolidayContainer']).toBe(false);
      expect(tabService['onWeekdayChange']).toHaveBeenLastCalledWith('tuesday');
      expect(shiftService['setCurrentWeekday']).toHaveBeenLastCalledWith(
        ContainerTemplateShiftService.bufferKey('tuesday', true),
      );
      expect(containerService['loadTasksForWeekday']).toHaveBeenLastCalledWith(2);
    });
  });

  describe('weekday and tab selection', () => {
    it('resets the tab, loads the weekday tasks and refreshes slot and start/end base on weekday change', () => {
      // Arrange
      start();
      view()['selectedWeekday'] = 'thursday';
      calls = [];

      // Act
      act.weekdayChange();

      // Assert
      expect(calls).toEqual([
        'tab.onWeekdayChange',
        'setCurrentWeekday',
        'loadTasksForWeekday',
        'updateAvailableTasks',
        'setCurrentWeekdayAndSlot',
        'loadStartEndBase',
      ]);
      expect(containerService['loadTasksForWeekday']).toHaveBeenLastCalledWith(4);
    });

    it('selects a tab and refreshes tasks, slot and start/end base', () => {
      // Arrange
      start();
      calls = [];

      // Act
      act.selectTab(1);

      // Assert
      expect(calls).toEqual(['tab.selectTab', 'updateAvailableTasks', 'setCurrentWeekdayAndSlot', 'loadStartEndBase']);
      expect(tabService['selectTab']).toHaveBeenCalledWith(1);
    });

    it('re-sorts the available tasks on a header click', () => {
      // Arrange
      start();
      calls = [];

      // Act
      act.headerClick('client');

      // Assert
      expect(sortingService['onHeaderClick']).toHaveBeenCalledWith('client', expect.any(Function));
      expect(calls).toEqual(['updateAvailableTasks']);
    });
  });

  describe('time window', () => {
    it('writes the new start time to the selected weekday template, marks dirty and refreshes the grid after the debounce', () => {
      // Arrange
      vi.useFakeTimers();
      start();
      calls = [];

      // Act
      act.timeFromChange(OwnTime.forTime('08', '15'));

      // Assert
      expect(containerService['updateFromTime']).toHaveBeenCalledWith(2, false, '08:15:00');
      expect(calls).toEqual(['calculateDuration', 'updateFromTime', 'markDirty']);
      expect((view()['duration'] as OwnTime).toMinutes()).toBe(435);
      vi.advanceTimersByTime(499);
      expect(calls).not.toContain('initializeTemplateGrid');
      vi.advanceTimersByTime(1);
      expect(containerService['initializeTemplateGrid']).toHaveBeenLastCalledWith({
        ...loadedShift,
        startShift: '08:15:00',
        endShift: '15:30:00',
      });
      expect(calls.slice(-3)).toEqual(['initializeTemplateGrid', 'loadTasksForWeekday', 'updateAvailableTasks']);
    });

    it('debounces several end time changes into one grid refresh', () => {
      // Arrange
      vi.useFakeTimers();
      start();
      (containerService['initializeTemplateGrid'] as ReturnType<typeof vi.fn>).mockClear();

      // Act
      act.timeToChange(OwnTime.forTime('16', '00'));
      vi.advanceTimersByTime(300);
      act.timeToChange(OwnTime.forTime('17', '00'));
      vi.advanceTimersByTime(500);

      // Assert
      expect(containerService['updateUntilTime']).toHaveBeenLastCalledWith(2, false, '17:00:00');
      expect(containerService['initializeTemplateGrid']).toHaveBeenCalledTimes(1);
      expect(containerService['initializeTemplateGrid']).toHaveBeenCalledWith({
        ...loadedShift,
        startShift: '07:00:00',
        endShift: '17:00:00',
      });
    });

    it('only updates the duration when no weekday is selected', () => {
      // Arrange
      routeParams.next({});
      start();
      calls = [];

      // Act
      act.timeToChange(OwnTime.forTime('20', '00'));

      // Assert
      expect(calls).toEqual(['calculateDuration']);
      expect((view()['duration'] as OwnTime).toMinutes()).toBe(840);
    });
  });

  describe('task actions', () => {
    it('removes every selected task and refreshes once afterwards', () => {
      // Arrange
      start();
      selectedItems.set([{ id: 'a' } as IContainerTemplateItem, { id: 'b' } as IContainerTemplateItem]);
      (shiftOpsService['removeTask'] as ReturnType<typeof vi.fn>).mockImplementation(() => calls.push('removeTask'));
      calls = [];

      // Act
      act.removeAllTasks();

      // Assert
      expect(calls).toEqual(['removeTask', 'removeTask', 'updateAvailableTasks']);
      expect(shiftOpsService['removeTask']).toHaveBeenCalledWith({ id: 'a' }, 'tuesday', false, expect.any(Function));
    });

    it('removes a single task and refreshes through the removal callback', () => {
      // Arrange
      start();
      calls = [];

      // Act
      act.removeTask({ id: 'x' } as IContainerTemplateItem);

      // Assert
      expect(calls).toEqual(['removeTask', 'updateAvailableTasks']);
    });

    it('starts autofill with the current editor state and the local pool of available tasks', () => {
      // Arrange
      start();
      view()['timeRangeToleranceValue'] = 70;

      // Act
      act.autofill();

      // Assert
      const [request, pool] = (routeService['autofill'] as ReturnType<typeof vi.fn>).mock.calls[0] as [
        Record<string, unknown>,
        IShift[],
      ];
      expect(request['containerShift']).toBe(loadedShift);
      expect(request['selectedWeekday']).toBe('tuesday');
      expect(request['isHoliday']).toBe(false);
      expect(request['timeFrom']).toBe(view()['timeFrom']);
      expect(request['timeTo']).toBe(view()['timeTo']);
      expect(request['additionalAvailableWorkIds']).toEqual([]);
      expect(request['timeRangeToleranceValue']).toBe(70);
      expect(request['destroy$']).toBeInstanceOf(Subject);
      expect(pool).toBe(tabService['availableTasks']);
      calls = [];
      (request['onStateChanged'] as () => void)();
      expect(calls).toEqual(['updateAvailableTasks']);
    });

    it('optimizes the route for the selected weekday and refreshes when it reports a change', () => {
      // Arrange
      start();

      // Act
      act.optimizeRoute();

      // Assert
      const args = (routeService['optimizeRoute'] as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(args[0]).toBe('tuesday');
      expect(args[1]).toBe(false);
      expect(args[2]).toBe(view()['timeFrom']);
      expect(args[3]).toBeInstanceOf(Subject);
      calls = [];
      (args[4] as () => void)();
      expect(calls).toEqual(['updateAvailableTasks']);
    });

    it('passes the editor state to compaction and the PDF exports', () => {
      // Arrange
      start();

      // Act
      act.compact(true);
      act.compact();
      act.exportShifts();
      act.exportRoute();

      // Assert
      const timeFrom = view()['timeFrom'];
      const timeTo = view()['timeTo'];
      expect(shiftOpsService['compactSelectedShifts']).toHaveBeenNthCalledWith(1, timeFrom, timeTo, 'tuesday', false, true);
      expect(shiftOpsService['compactSelectedShifts']).toHaveBeenNthCalledWith(2, timeFrom, timeTo, 'tuesday', false, false);
      expect(shiftOpsService['exportSelectedShiftsToPdf']).toHaveBeenCalledWith(loadedShift, 'tuesday', timeFrom, timeTo);
      expect(shiftOpsService['exportRouteToPdf']).toHaveBeenCalledWith(loadedShift, 'tuesday', timeFrom);
    });
  });

  describe('context menu and dialogs', () => {
    it('opens the properties menu for a table row and selects the row item', () => {
      // Arrange
      start();
      const item = { id: 'row' } as IContainerTemplateItem;
      const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as MouseEvent;

      // Act
      act.tableRowRightClick(event, item);

      // Assert
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(propertiesService['contextMenuTargetItem']).toBe(item);
      expect(shiftService['setSelectedShift']).toHaveBeenLastCalledWith(item);
      const menu = contextMenuStub();
      expect(menu.openMenu).toHaveBeenCalledWith(event);
      const menuData = menu.menuData as { list: { key: string; name: string }[] };
      expect(menuData.list.length).toBe(1);
      expect(menuData.list[0]).toEqual(
        expect.objectContaining({ key: 'properties', name: 'shift.container-template.context-menu.properties' }),
      );
    });

    it('opens the properties menu for a time ruler shift', () => {
      // Arrange
      start();
      const item = { id: 'ruler' } as IContainerTemplateItem;
      const mouseEvent = {} as MouseEvent;

      // Act
      act.shiftRightClick({ item, mouseEvent } as IShiftContextMenuEvent);

      // Assert
      expect(propertiesService['contextMenuTargetItem']).toBe(item);
      expect(contextMenuStub().openMenu).toHaveBeenCalledWith(mouseEvent);
    });

    it('opens the properties dialog for a shift target and closes the menu', () => {
      // Arrange
      start();
      propertiesService['contextMenuTargetItem'] = { id: 'shift' } as IContainerTemplateItem;

      // Act
      act.contextMenuClick(['properties']);

      // Assert
      const args = (propertiesService['openPropertiesDialog'] as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(args[0]).toBeTruthy();
      expect(args.slice(1)).toEqual(['tuesday', false]);
      expect(absenceService['openAbsenceTimeModal']).not.toHaveBeenCalled();
      expect(contextMenuStub().closeMenu).toHaveBeenCalledWith(true);
    });

    it('opens the absence time dialog for an absence target', () => {
      // Arrange
      start();
      const target = { id: 'absence', absenceId: 'abs-1' } as IContainerTemplateItem;
      propertiesService['contextMenuTargetItem'] = target;

      // Act
      act.contextMenuClick(['properties']);

      // Assert
      const args = (absenceService['openAbsenceTimeModal'] as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(args[0]).toBe(target);
      expect(args[1]).toBeTruthy();
      expect(args.slice(2)).toEqual([view()['timeFrom'], view()['timeTo'], 'tuesday', false]);
      expect(propertiesService['openPropertiesDialog']).not.toHaveBeenCalled();
    });

    it('only closes the menu for an unknown key', () => {
      // Arrange
      start();

      // Act
      act.contextMenuClick(['other']);

      // Assert
      expect(propertiesService['openPropertiesDialog']).not.toHaveBeenCalled();
      expect(contextMenuStub().closeMenu).toHaveBeenCalledWith(true);
    });

    it('opens the absence time dialog on a row double click', () => {
      // Arrange
      start();
      const item = { id: 'dbl' } as IContainerTemplateItem;

      // Act
      act.absenceRowDblClick(item);

      // Assert
      const args = (absenceService['openAbsenceTimeModal'] as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(args[0]).toBe(item);
      expect(args.slice(2)).toEqual([view()['timeFrom'], view()['timeTo'], 'tuesday', false]);
    });
  });

  describe('teardown', () => {
    it('releases the lock, completes the session and destroys the container state in this order', () => {
      // Arrange
      start();
      calls = [];

      // Act
      fixture.destroy();
      routeParams.next({ id: 'after-destroy' });

      // Assert
      expect(calls).toEqual(['release', 'containerService.destroy']);
      expect(lifecycleService['loadShift']).toHaveBeenCalledTimes(1);
    });
  });
});
