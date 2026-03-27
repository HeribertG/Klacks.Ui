// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Container template component for weekly shift planning in containers.
 * @param containerShift - The current container shift with time frame and weekdays
 * @param templateGrid - The grid with all available slots per weekday
 * @param routeService - Manages route optimization, autofill, and transport mode
 * @param propertiesService - Manages the properties dialog of individual template items
 * @param tabService - Manages tab selection, weekday switching, and available tasks
 * @param lifecycleService - Manages initialization, lifecycle, and search state
 * @param shiftOpsService - Manages shift operations (arrangement, compaction, export)
 */
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit,
  effect,
  computed,
  ViewChild,
  TemplateRef,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, switchMap, tap } from 'rxjs';
import { AngularSplitModule } from 'angular-split';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  CdkDragDrop,
  DragDropModule,
} from '@angular/cdk/drag-drop';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { IShift } from 'src/app/domain/models/shift/shift-class';
import {
  IContainerTemplateGrid,
  IContainerTemplateSlot,
} from 'src/app/domain/models/container/container-template-slot';
import {
  IContainerTemplateItem,
} from 'src/app/domain/models/container/container-template-class';
import {
  ContainerTransportModeEnum,
  TransportModeEnum,
} from 'src/app/domain/enums/transport-mode.enum';
import { DataManagementContainerService } from 'src/app/domain/services/container/data-management.container.service';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { TimeRulerDragDropService } from 'src/app/presentation/shared/time-ruler/services/time-ruler-drag-drop.service';
import { TimeInputComponent } from 'src/app/presentation/shared/time-input/time-input.component';
import { TimeRulerComponent } from 'src/app/presentation/shared/time-ruler/time-ruler.component';
import { IconShiftSegmentComponent } from 'src/app/presentation/icons/icon-shift-segment.component';
import { IconTimeWindowComponent } from 'src/app/presentation/icons/icon-time-window.component';
import { IconUnknownTimeComponent } from 'src/app/presentation/icons/icon-unknown-time.component';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { IconCompactComponent } from 'src/app/presentation/icons/icon-compact.component';
import { PdfIconComponent } from 'src/app/presentation/icons/pdf-icon.component';
import { IconRouteComponent } from 'src/app/presentation/icons/icon-route.component';
import { IconRouteFileComponent } from 'src/app/presentation/icons/icon-route-file.component';
import { ContextMenuComponent } from 'src/app/presentation/shared/context-menu/context-menu.component';
import { ContextMenuService } from 'src/app/presentation/shared/context-menu/context-menu.service';
import {
  Menu,
  MenuItem,
} from 'src/app/presentation/shared/context-menu/context-menu-class';
import { IShiftContextMenuEvent } from 'src/app/presentation/shared/time-ruler/time-ruler.component';
import { IconByCarComponent } from 'src/app/presentation/icons/icon-by-car.component';
import { IconByFootComponent } from 'src/app/presentation/icons/icon-by-foot.component';
import { IconByBicycleComponent } from 'src/app/presentation/icons/icon-by-bicycle.component';
import { IconTransportMixComponent } from 'src/app/presentation/icons/icon-transport-mix.component';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { IconWizardComponent } from 'src/app/presentation/icons/icon-wizard.component';
import { NgxSliderModule, Options } from '@angular-slider/ngx-slider';
import { AddressProviderService } from 'src/app/domain/services/address-provider.service';
import {
  formatTime,
  timeToString,
} from 'src/app/shared/helpers/time-format.helper';
import {
  formatClientWithAddress,
  formatWorkTime,
} from 'src/app/shared/helpers/container-template-format.helper';
import { ContainerTemplateRouteService } from './services/container-template-route.service';
import { ContainerTemplatePropertiesService } from './services/container-template-properties.service';
import { ContainerTemplateTabService } from './services/container-template-tab.service';
import { ContainerTemplateLifecycleService } from './services/container-template-lifecycle.service';
import { ContainerTemplateShiftOperationsService } from './services/container-template-shift-operations.service';
import { ContainerTemplateItemManipulationService } from './services/container-template-item-manipulation.service';
import { ContainerTemplatePdfExportService } from './services/container-template-pdf-export.service';
import { RoutePdfExportService } from './services/route-pdf-export.service';
import { MapRenderingService } from './services/map-rendering.service';
import { ShiftArrangementService } from './services/shift-arrangement.service';
import { ContainerTemplateAbsenceService } from './services/container-template-absence.service';
import { ContainerTemplateDragDropService } from './services/container-template-drag-drop.service';

@Component({
  selector: 'app-container-template',
  imports: [
    FormsModule,
    AngularSplitModule,
    TranslateModule,
    DragDropModule,
    NgbTooltipModule,
    TimeInputComponent,
    TimeRulerComponent,
    IconShiftSegmentComponent,
    IconTimeWindowComponent,
    IconUnknownTimeComponent,
    TrashIconRedComponent,
    IconCompactComponent,
    PdfIconComponent,
    IconRouteComponent,
    IconRouteFileComponent,
    ContextMenuComponent,
    IconByCarComponent,
    IconByFootComponent,
    IconByBicycleComponent,
    IconTransportMixComponent,
    IconWizardComponent,
    NgxSliderModule,
  ],
  templateUrl: './container-template.component.html',
  styleUrl: './container-template.component.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    TableSortingService,
    TimeRulerDragDropService,
    ContextMenuService,
    ContainerTemplateItemManipulationService,
    MapRenderingService,
    RoutePdfExportService,
    ContainerTemplatePdfExportService,
    ShiftArrangementService,
    ContainerTemplateRouteService,
    ContainerTemplatePropertiesService,
    ContainerTemplateTabService,
    ContainerTemplateLifecycleService,
    ContainerTemplateShiftOperationsService,
    ContainerTemplateAbsenceService,
    ContainerTemplateDragDropService,
  ],
})
export class ContainerTemplateComponent implements OnInit, OnDestroy {
  private _timeFrom = OwnTime.forTime('06', '00');
  private _timeTo = OwnTime.forTime('18', '00');

  get timeFrom() {
    return this._timeFrom;
  }
  set timeFrom(value: OwnTime) {
    this._timeFrom = value;
  }

  get timeTo() {
    return this._timeTo;
  }
  set timeTo(value: OwnTime) {
    this._timeTo = value;
  }

  public selectedWeekday: string | null = null;
  public isHoliday = false;
  public isWeekdayAndHoliday = false;
  public duration: OwnTime = OwnTime.forDuration('00', '00');

  public weekdays = [
    { value: 'monday', labelKey: 'shift.container-template.weekday.monday' },
    { value: 'tuesday', labelKey: 'shift.container-template.weekday.tuesday' },
    {
      value: 'wednesday',
      labelKey: 'shift.container-template.weekday.wednesday',
    },
    {
      value: 'thursday',
      labelKey: 'shift.container-template.weekday.thursday',
    },
    { value: 'friday', labelKey: 'shift.container-template.weekday.friday' },
    {
      value: 'saturday',
      labelKey: 'shift.container-template.weekday.saturday',
    },
    { value: 'sunday', labelKey: 'shift.container-template.weekday.sunday' },
  ];

  private containerService = inject(DataManagementContainerService);
  private shiftService = inject(ContainerTemplateShiftService);
  public translateService = inject(TranslateService);
  public sortingService = inject(TableSortingService);
  public addressProvider = inject(AddressProviderService);
  private cdr = inject(ChangeDetectorRef);
  readonly routeService = inject(ContainerTemplateRouteService);
  readonly propertiesService = inject(ContainerTemplatePropertiesService);
  readonly tabService = inject(ContainerTemplateTabService);
  private lifecycleService = inject(ContainerTemplateLifecycleService);
  private shiftOpsService = inject(ContainerTemplateShiftOperationsService);
  readonly absenceService = inject(ContainerTemplateAbsenceService);
  private dragDropService = inject(ContainerTemplateDragDropService);
  private destroy$ = new Subject<void>();
  private timeChange$ = new Subject<void>();

  @ViewChild('contextMenu', { static: false })
  contextMenu!: ContextMenuComponent;
  @ViewChild('propertiesModal', { static: false })
  propertiesModal!: TemplateRef<unknown>;
  @ViewChild('absenceTimeModal', { static: false })
  absenceTimeModal!: TemplateRef<unknown>;

  public containerShift: IShift | null = null;
  public templateGrid: IContainerTemplateGrid | null = null;
  public isLoading = false;

  timeRangeToleranceValue = 50;
  timeRangeToleranceOptions: Options = {
    floor: 0,
    ceil: 100,
    step: 10,
    showSelectionBar: true,
    hideLimitLabels: true,
    hidePointerLabels: true,
  };

  private currentSearchString = '';
  private currentIncludeAddress = false;

  formatTime = formatTime;

  get selectedContainerTemplateItems(): IContainerTemplateItem[] {
    return this.shiftService.selectedContainerTemplateItemsSignal();
  }

  get selectedShift(): IContainerTemplateItem | null {
    return this.shiftService.selectedShiftSignal();
  }

  get TransportModeEnum(): typeof TransportModeEnum {
    return TransportModeEnum;
  }

  get ContainerTransportModeEnum(): typeof ContainerTransportModeEnum {
    return ContainerTransportModeEnum;
  }

  private isDirty = computed(() => {
    const hasSelectedTasks =
      this.shiftService.selectedContainerTemplateItemsSignal().length > 0;
    const hasTemplateChanges = this.containerService.areObjectsDirty();
    return hasSelectedTasks || hasTemplateChanges;
  });

  private canSaveComputed = computed(() => {
    const hasSelectedTasks =
      this.shiftService.selectedContainerTemplateItemsSignal().length > 0;
    const canSaveTemplates = this.containerService.canSave();
    return hasSelectedTasks || canSaveTemplates;
  });

  constructor() {
    effect(() => {
      const searchString = this.lifecycleService.searchStateService.containerTemplateSearch();
      const includeAddress =
        this.lifecycleService.searchStateService.containerTemplateIncludeAddress();
      if (
        this.currentSearchString !== searchString ||
        this.currentIncludeAddress !== includeAddress
      ) {
        this.currentSearchString = searchString;
        this.currentIncludeAddress = includeAddress;
        this.onSearchChanged();
      }
    });

    // Bridges component-local dirty/canSave signals to the global SaveBar via WorkplaceStateService
    effect(() => {
      this.isDirty();
      this.canSaveComputed();
      this.lifecycleService.workplaceStateService.areObjectsDirty();
    });

    effect(() => {
      this.templateGrid = this.containerService.templateGrid();
      this.isLoading = this.containerService.loading();
      this.cdr.markForCheck();
    });

    effect(() => {
      if (this.containerService.isReset()) {
        this.updateAvailableTasks();
        this.cdr.markForCheck();
      }
    });
  }

  ngOnInit(): void {
    this.lifecycleService.initialize();

    this.lifecycleService.registerSaveCompletedCallback(
      () => this.containerShift,
      () => this.selectedWeekday,
      () => this.isHoliday,
      () => {
        this.updateAvailableTasks();
        this.updateCurrentWeekdayAndSlot();
        this.routeService.loadStartEndBaseForCurrentTemplate(
          this.selectedWeekday,
          this.isHoliday,
        );
        this.cdr.markForCheck();
      },
    );

    this.calculateDuration();

    this.sortingService.initialize({
      columns: ['name', 'abbreviation', 'startShift', 'client'],
      defaultOrderBy: 'name',
      defaultSortOrder: 'asc',
      useThreeWaySort: false,
    });

    this.lifecycleService
      .observeRouteParams(this.destroy$)
      .subscribe((id) => {
        if (id) {
          this.loadContainerShift(id);
        }
      });

    this.timeChange$
      .pipe(debounceTime(500), takeUntil(this.destroy$))
      .subscribe(() => {
        this.executeGridRefresh();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.containerService.destroy();
  }

  private loadContainerShift(id: string): void {
    this.isLoading = true;
    this.lifecycleService
      .loadShift(id)
      .pipe(
        takeUntil(this.destroy$),
        tap((shift) => {
          this.containerShift = shift;
          this.setTimeFromShift(shift);
          this.setActiveWeekdays(shift);
        }),
        switchMap((shift) =>
          this.containerService.initializeTemplateGrid(shift),
        ),
        switchMap(() => {
          if (this.selectedWeekday) {
            const weekdayNumber = this.containerService.getWeekdayNumber(
              this.selectedWeekday,
            );
            return this.containerService.loadTasksForWeekday(weekdayNumber).pipe(
              switchMap(() =>
                this.containerService.loadTemplates(this.containerShift!.id!),
              ),
            );
          }
          return [];
        }),
      )
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.updateAvailableTasks();
          this.routeService.loadStartEndBaseForCurrentTemplate(
            this.selectedWeekday,
            this.isHoliday,
          );
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  private setTimeFromShift(shift: IShift): void {
    if (shift.startShift && shift.endShift) {
      const [startHours, startMinutes] = shift.startShift.split(':');
      const [endHours, endMinutes] = shift.endShift.split(':');

      this.timeFrom = OwnTime.forTime(startHours, startMinutes);
      this.timeTo = OwnTime.forTime(endHours, endMinutes);
      this.calculateDuration();
    }
  }

  private setActiveWeekdays(shift: IShift): void {
    const activeWeekdays = this.containerService.getActiveWeekdays(shift);
    this.weekdays = activeWeekdays;

    if (activeWeekdays.length > 0) {
      this.selectedWeekday = activeWeekdays[0].value;
      this.shiftService.setCurrentWeekday(this.selectedWeekday);
    }
  }

  onTimeFromChange(time: OwnTime): void {
    this.timeFrom = OwnTime.forTime(time.hours, time.minutes);
    this.calculateDuration();

    if (this.selectedWeekday) {
      const weekdayNumber = this.containerService.getWeekdayNumber(
        this.selectedWeekday,
      );
      const timeString = timeToString(
        parseInt(this.timeFrom.hours),
        parseInt(this.timeFrom.minutes),
      );
      this.containerService.updateFromTime(
        weekdayNumber,
        this.isHoliday,
        timeString,
      );
      this.lifecycleService.markDirty();
    }

    this.timeChange$.next();
  }

  onTimeToChange(time: OwnTime): void {
    this.timeTo = OwnTime.forTime(time.hours, time.minutes);
    this.calculateDuration();

    if (this.selectedWeekday) {
      const weekdayNumber = this.containerService.getWeekdayNumber(
        this.selectedWeekday,
      );
      const timeString = timeToString(
        parseInt(this.timeTo.hours),
        parseInt(this.timeTo.minutes),
      );
      this.containerService.updateUntilTime(
        weekdayNumber,
        this.isHoliday,
        timeString,
      );
      this.lifecycleService.markDirty();
    }

    this.timeChange$.next();
  }

  private executeGridRefresh(): void {
    if (!this.containerShift) {
      return;
    }

    const updatedShift: IShift = {
      ...this.containerShift,
      startShift: timeToString(
        parseInt(this.timeFrom.hours),
        parseInt(this.timeFrom.minutes),
      ),
      endShift: timeToString(
        parseInt(this.timeTo.hours),
        parseInt(this.timeTo.minutes),
      ),
    };

    this.containerService
      .initializeTemplateGrid(updatedShift)
      .pipe(
        switchMap(() => {
          if (this.selectedWeekday) {
            const weekdayNumber = this.containerService.getWeekdayNumber(
              this.selectedWeekday,
            );
            return this.containerService.loadTasksForWeekday(weekdayNumber);
          }
          return [];
        }),
      )
      .subscribe({
        next: () => {
          this.updateAvailableTasks();
          this.cdr.markForCheck();
        },
        error: () => {
          this.cdr.markForCheck();
        },
      });
  }

  private calculateDuration(): void {
    this.duration = this.shiftOpsService.calculateDuration(
      this.timeFrom,
      this.timeTo,
    );
  }

  onWeekdayChange(): void {
    this.tabService.onWeekdayChange(this.selectedWeekday);
    if (this.selectedWeekday) {
      const weekdayNumber = this.containerService.getWeekdayNumber(
        this.selectedWeekday,
      );
      this.containerService.loadTasksForWeekday(weekdayNumber).subscribe(() => {
        this.updateAvailableTasks();
        this.updateCurrentWeekdayAndSlot();
        this.routeService.loadStartEndBaseForCurrentTemplate(
          this.selectedWeekday,
          this.isHoliday,
        );
        this.cdr.markForCheck();
      });
    }
  }

  selectTab(index: number): void {
    this.tabService.selectTab(index);
    this.updateAvailableTasks();
    this.updateCurrentWeekdayAndSlot();
    this.routeService.loadStartEndBaseForCurrentTemplate(
      this.selectedWeekday,
      this.isHoliday,
    );
    this.cdr.markForCheck();
  }

  async selectEmploymentTab(): Promise<void> {
    await this.tabService.selectEmploymentTab();
    this.cdr.markForCheck();
  }

  updateAvailableTasks(): void {
    this.tabService.updateAvailableTasks(
      this.selectedWeekday,
      this.templateGrid,
      this.currentSearchString,
      this.currentIncludeAddress,
    );
  }

  getFilteredRowsForSelectedWeekday(): IContainerTemplateSlot[][] {
    return this.tabService.getFilteredRowsForSelectedWeekday(
      this.selectedWeekday,
      this.templateGrid,
    );
  }

  getTabLabel(rowIndex: number): string {
    return this.tabService.getTabLabel(
      rowIndex,
      this.selectedWeekday,
      this.templateGrid,
    );
  }

  getSlotsForSelectedTab(): IContainerTemplateSlot[] {
    const filteredRows = this.getFilteredRowsForSelectedWeekday();
    return filteredRows[this.tabService.selectedTabIndex] ?? [];
  }

  getConnectedDropLists(): string[] {
    return this.dragDropService.getConnectedDropLists();
  }

  onTaskDrop(event: CdkDragDrop<IContainerTemplateItem[]>): void {
    this.dragDropService.onTaskDrop(
      event,
      this.timeFrom,
      this.timeTo,
      this.selectedWeekday,
      this.isHoliday,
    );
    this.cdr.markForCheck();
  }

  formatWorkTime = formatWorkTime;

  formatClientWithAddress = formatClientWithAddress;

  hasTimeRangeViolation(item: IContainerTemplateItem): boolean {
    return this.shiftOpsService.hasTimeRangeViolation(item);
  }

  isTimeRangePartial(shift: IShift): boolean {
    return this.shiftOpsService.isTimeRangePartial(shift, this.timeFrom, this.timeTo);
  }

  onRemoveAllTasks(): void {
    const items = [...this.selectedContainerTemplateItems];
    for (const item of items) {
      this.shiftOpsService.removeTask(
        item,
        this.selectedWeekday,
        this.isHoliday,
        () => {},
      );
    }
    this.updateAvailableTasks();
    this.cdr.markForCheck();
  }

  onRemoveTask(item: IContainerTemplateItem): void {
    this.shiftOpsService.removeTask(
      item,
      this.selectedWeekday,
      this.isHoliday,
      () => this.updateAvailableTasks(),
    );
    this.cdr.markForCheck();
  }

  onAvailableTasksDrop(): void {}

  getTimeRangeStartTime(item: IContainerTemplateItem): OwnTime {
    return this.shiftOpsService.getTimeRangeStartTime(item);
  }

  onTimeRangeStartChange(item: IContainerTemplateItem, newTime: OwnTime): void {
    this.shiftOpsService.onTimeRangeStartChange(item, newTime);
  }

  autofill(): void {
    this.routeService.autofill({
      containerShift: this.containerShift,
      selectedWeekday: this.selectedWeekday,
      isHoliday: this.isHoliday,
      timeFrom: this.timeFrom,
      timeTo: this.timeTo,
      availableTasks: this.tabService.availableTasks,
      timeRangeToleranceValue: this.timeRangeToleranceValue,
      destroy$: this.destroy$,
      onStateChanged: () => {
        this.updateAvailableTasks();
        this.cdr.markForCheck();
      },
    });
  }

  optimizeRoute(): void {
    this.routeService.optimizeRoute(
      this.selectedWeekday,
      this.isHoliday,
      this.timeFrom,
      this.destroy$,
      () => {
        this.updateAvailableTasks();
        this.cdr.markForCheck();
      },
    );
  }

  exportSelectedShiftsToPdf(): void {
    this.shiftOpsService.exportSelectedShiftsToPdf(
      this.containerShift,
      this.selectedWeekday,
      this.timeFrom,
      this.timeTo,
    );
  }

  exportRouteToPdf(): void {
    this.shiftOpsService.exportRouteToPdf(
      this.containerShift,
      this.selectedWeekday,
      this.timeFrom,
    );
  }

  onItemsDisplaced(): void {
    this.cdr.markForCheck();
  }

  onShiftRowClick(item: IContainerTemplateItem): void {
    this.shiftService.setSelectedShift(item);
  }

  onHeaderClick(columnKey: string): void {
    this.sortingService.onHeaderClick(columnKey, () => {
      this.updateAvailableTasks();
      this.cdr.markForCheck();
    });
  }

  onShiftRightClick(event: IShiftContextMenuEvent): void {
    this.propertiesService.contextMenuTargetItem = event.item;
    this.shiftService.setSelectedShift(event.item);
    this.openContextMenu(event.mouseEvent);
  }

  onTableRowRightClick(event: MouseEvent, item: IContainerTemplateItem): void {
    event.preventDefault();
    event.stopPropagation();
    this.propertiesService.contextMenuTargetItem = item;
    this.shiftService.setSelectedShift(item);
    this.openContextMenu(event);
  }

  onContextMenuClick(keys: string[]): void {
    if (keys.includes('properties')) {
      this.openPropertiesDialog();
    }
    this.contextMenu.closeMenu(true);
  }

  onContainerContextMenu(event: MouseEvent): void {
    event.preventDefault();
  }

  compactSelectedShifts(): void {
    this.shiftOpsService.compactSelectedShifts(
      this.timeFrom,
      this.selectedWeekday,
      this.isHoliday,
    );
    this.cdr.markForCheck();
  }

  private onSearchChanged(): void {
    this.updateAvailableTasks();
    this.cdr.markForCheck();
  }

  private updateCurrentWeekdayAndSlot(): void {
    if (!this.selectedWeekday) return;

    const weekdayNumber = this.containerService.getWeekdayNumber(
      this.selectedWeekday,
    );
    const slots = this.getSlotsForSelectedTab();

    if (slots.length > 0) {
      this.containerService.setCurrentWeekdayAndSlot(weekdayNumber, slots[0]);
    }
  }

  private openContextMenu(event: MouseEvent): void {
    const menuData = new Menu();
    const propertiesItem = new MenuItem(
      'properties',
      this.translateService.instant(
        'shift.container-template.context-menu.properties',
      ),
      false,
    );
    menuData.list.push(propertiesItem);

    this.contextMenu.menuData = menuData;
    this.contextMenu.openMenu(event);
  }

  private openPropertiesDialog(): void {
    this.propertiesService.openPropertiesDialog(
      this.propertiesModal,
      this.selectedWeekday,
      this.isHoliday,
    );
  }

  onAbsenceRowDblClick(item: IContainerTemplateItem): void {
    this.absenceService.openAbsenceTimeModal(
      item,
      this.absenceTimeModal,
      this.timeFrom,
      this.timeTo,
      this.selectedWeekday,
      this.isHoliday,
    );
  }

  onAbsenceStartTimeChange(time: OwnTime): void {
    this.absenceService.onAbsenceStartTimeChange(time);
  }

  onAbsenceEndTimeChange(time: OwnTime): void {
    this.absenceService.onAbsenceEndTimeChange(time);
  }
}
