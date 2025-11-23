/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  effect,
  computed,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { AngularSplitModule } from 'angular-split';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { SearchService } from 'src/app/application/services/search.service';
import { SearchStateService } from 'src/app/application/services/search-state.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { EntityName, RouteName } from 'src/app/domain/models/entity-names.enum';
import { TimeRangeService } from 'src/app/presentation/shared/time-ruler/services/time-range.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { TimeInputComponent } from 'src/app/presentation/shared/time-input/time-input.component';
import { TimeRulerComponent } from 'src/app/presentation/shared/time-ruler/time-ruler.component';
import { IconShiftSegmentComponent } from 'src/app/presentation/icons/icon-shift-segment.component';
import { IconTimeWindowComponent } from 'src/app/presentation/icons/icon-time-window.component';
import { IconUnknownTimeComponent } from 'src/app/presentation/icons/icon-unknown-time.component';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { newGuid } from 'src/app/shared/helpers/guid.helper';
import { OwnTime } from 'src/app/domain/models/schedule-class';
import { IShift } from 'src/app/domain/models/shift-class';
import { AddressTypeEnum } from 'src/app/domain/enums/client-enum';
import {
  IContainerTemplateGrid,
  IContainerTemplateSlot,
} from 'src/app/domain/models/container-template-slot';
import {
  IContainerTemplate,
  IContainerTemplateItem,
} from 'src/app/domain/models/container-template-class';
import { DataShiftService } from 'src/app/infrastructure/api/data-shift.service';
import { DataManagementContainerService } from 'src/app/domain/services/container/data-management.container.service';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { ShiftArrangementService } from './services/shift-arrangement.service';
import { TimeRulerDragDropService } from 'src/app/presentation/shared/time-ruler/services/time-ruler-drag-drop.service';
import {
  formatTime,
  timeToString,
} from 'src/app/shared/helpers/time-format.helper';
import { IconCompactComponent } from 'src/app/presentation/icons/icon-compact.component';
import { PdfIconComponent } from 'src/app/presentation/icons/pdf-icon.component';

@Component({
  selector: 'app-container-template',
  imports: [
    FormsModule,
    AngularSplitModule,
    TranslateModule,
    DragDropModule,
    TimeInputComponent,
    TimeRulerComponent,
    IconShiftSegmentComponent,
    IconTimeWindowComponent,
    IconUnknownTimeComponent,
    TrashIconRedComponent,
    IconCompactComponent,
    PdfIconComponent,
  ],
  templateUrl: './container-template.component.html',
  styleUrl: './container-template.component.scss',
  standalone: true,
  providers: [TableSortingService, TimeRulerDragDropService],
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
  public isWeekdayOrHoliday = false;
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

  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  private searchStateService = inject(SearchStateService);
  private workplaceStateService = inject(WorkplaceStateService);
  private timeRangeService = inject(TimeRangeService);
  private translateService = inject(TranslateService);
  public sortingService = inject(TableSortingService);
  private activatedRoute = inject(ActivatedRoute);
  private dataShiftService = inject(DataShiftService);
  private containerService = inject(DataManagementContainerService);
  private shiftService = inject(ContainerTemplateShiftService);
  private arrangementService = inject(ShiftArrangementService);
  private dragDropService = inject(TimeRulerDragDropService);
  private destroy$ = new Subject<void>();
  private timeChange$ = new Subject<void>();

  public containerShift: IShift | null = null;
  public templateGrid: IContainerTemplateGrid | null = null;
  public isLoading = false;
  public selectedTabIndex = 0;
  public availableTasks: IShift[] = [];
  private currentSearchString = '';

  formatTime = formatTime;

  formatWorkTime(workTime: number): string {
    const hours = Math.floor(workTime);
    const minutes = Math.round((workTime - hours) * 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }

  formatClientWithAddress(item: IShift | IContainerTemplateItem): string {
    const shift = 'shiftId' in item ? item.shift : item;

    if (!shift?.client) {
      return '-';
    }

    const client = shift.client;
    const employeeAddress = client.addresses?.find(
      (addr) => addr.type === AddressTypeEnum.customer
    );

    if (!employeeAddress) {
      return client.name || '-';
    }

    const addressParts = [
      employeeAddress.street,
      employeeAddress.zip,
      employeeAddress.city,
    ].filter((part) => part && part.trim() !== '');

    const addressString = addressParts.join(', ');
    return addressString
      ? `${client.name}: ${addressString}`
      : client.name || '-';
  }

  onRemoveTask(item: IContainerTemplateItem): void {
    const itemIdentifier = item.id || item.tmpId;
    if (itemIdentifier) {
      if (item.shift && this.selectedWeekday) {
        const weekdayNumber = this.containerService.getWeekdayNumber(
          this.selectedWeekday
        );
        this.containerService.addShiftToAvailableTasks(
          item.shift,
          weekdayNumber
        );
        this.updateAvailableTasks();

        this.containerService.removeTaskItemFromTemplates(
          itemIdentifier,
          weekdayNumber,
          this.isHoliday
        );
      }

      this.shiftService.removeTask(itemIdentifier);
      this.workplaceStateService.areObjectsDirty();
    }
  }

  onAvailableTasksDrop(event: CdkDragDrop<IShift[]>): void {
    // Do nothing - Zone 3 does not accept drops
    // This handler exists only to satisfy the cdkDropList directive
  }

  getTimeRangeStartTime(item: IContainerTemplateItem): OwnTime {
    if (!item.timeRangeStartShift) {
      return OwnTime.forTime('00', '00');
    }
    const parsed = this.timeRangeService.parseTimeString(
      item.timeRangeStartShift
    );
    if (!parsed) {
      return OwnTime.forTime('00', '00');
    }
    return OwnTime.forTime(
      parsed.hours.toString().padStart(2, '0'),
      parsed.minutes.toString().padStart(2, '0')
    );
  }

  onTimeRangeStartChange(item: IContainerTemplateItem, newTime: OwnTime): void {
    const desiredStartMinutes =
      parseInt(newTime.hours) * 60 + parseInt(newTime.minutes);
    const workTimeMinutes = Math.round((item.shift?.workTime || 0) * 60);
    const desiredEndMinutes = desiredStartMinutes + workTimeMinutes;

    const allItems = this.shiftService.selectedContainerTemplateItemsSignal();

    const updatedItem: IContainerTemplateItem = {
      ...item,
      timeRangeStartShift: this.minutesToTimeString(desiredStartMinutes),
      timeRangeEndShift: this.minutesToTimeString(desiredEndMinutes),
    };

    const updatedItems = this.pushOverlappingShifts(updatedItem, allItems);

    this.shiftService.setSelectedContainerTemplateItems(updatedItems);
  }

  private pushOverlappingShifts(
    changedItem: IContainerTemplateItem,
    allItems: IContainerTemplateItem[]
  ): IContainerTemplateItem[] {
    const result = [...allItems];
    const changedIndex = result.findIndex((s) => s.id === changedItem.id);

    if (changedIndex === -1) {
      return result;
    }

    result[changedIndex] = changedItem;

    const changedStartMinutes =
      this.timeRangeService.getShiftStartMinutes(changedItem);
    const changedEndMinutes =
      this.timeRangeService.getShiftEndMinutes(changedItem);

    for (let i = 0; i < result.length; i++) {
      if (i === changedIndex || !result[i].shift?.isTimeRange) continue;

      const currentItem = result[i];
      const currentStartMinutes =
        this.timeRangeService.getShiftStartMinutes(currentItem);
      const currentEndMinutes =
        this.timeRangeService.getShiftEndMinutes(currentItem);

      const hasOverlap =
        changedStartMinutes < currentEndMinutes &&
        changedEndMinutes > currentStartMinutes;

      if (hasOverlap && currentStartMinutes >= changedStartMinutes) {
        const workTimeMinutes = Math.round(
          (currentItem.shift?.workTime || 0) * 60
        );
        const newStartMinutes = changedEndMinutes;
        const newEndMinutes = newStartMinutes + workTimeMinutes;

        result[i] = {
          ...currentItem,
          timeRangeStartShift: this.minutesToTimeString(newStartMinutes),
          timeRangeEndShift: this.minutesToTimeString(newEndMinutes),
        };

        const pushedItem = result[i];
        const recursiveResult = this.pushOverlappingShifts(pushedItem, result);
        return recursiveResult;
      }
    }

    return result;
  }

  private minutesToTimeString(totalMinutes: number): string {
    const normalizedMinutes = totalMinutes % (24 * 60);
    const hours = Math.floor(normalizedMinutes / 60);
    const minutes = normalizedMinutes % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:00`;
  }

  get selectedContainerTemplateItems(): IContainerTemplateItem[] {
    return this.shiftService.selectedContainerTemplateItemsSignal();
  }

  get selectedShift(): IContainerTemplateItem | null {
    return this.shiftService.selectedShiftSignal();
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
      const searchString = this.searchStateService.containerTemplateSearch();
      if (this.currentSearchString !== searchString) {
        this.currentSearchString = searchString;
        this.onSearchChanged();
      }
    });

    effect(() => {
      const dirty = this.isDirty();
      const canSave = this.canSaveComputed();
      this.workplaceStateService.areObjectsDirty();
    });

    effect(() => {
      this.templateGrid = this.containerService.templateGrid();
    });

    effect(() => {
      this.isLoading = this.containerService.loading();
    });

    effect(() => {
      if (this.containerService.isReset()) {
        this.updateAvailableTasks();
      }
    });
  }

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    this.workplaceStateService.setActiveManagerByRoute(
      RouteName.CONTAINER_TEMPLATE
    );
    this.workplaceStateService.setNameOfVisibleEntity(
      EntityName.SHIFT_CONTAINER_TEMPLATE
    );
    this.searchService.setSearchVisibility(true);
    this.savebarService.setSavebarVisibility(true);

    this.containerService.onSaveCompleted = () => {
      if (this.containerShift?.id && this.selectedWeekday) {
        const weekdayNumber = this.containerService.getWeekdayNumber(
          this.selectedWeekday
        );

        this.containerService
          .loadTasksForWeekday(weekdayNumber)
          .subscribe(() => {
            this.containerService
              .loadTemplates(this.containerShift!.id!)
              .subscribe(() => {
                this.updateAvailableTasks();
                this.updateCurrentWeekdayAndSlot();
              });
          });
      }
    };

    this.calculateDuration();

    this.sortingService.initialize({
      columns: ['name', 'abbreviation', 'startShift', 'client'],
      defaultOrderBy: 'name',
      defaultSortOrder: 'asc',
      useThreeWaySort: false,
    });

    this.activatedRoute.params
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const id = params['id'];
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
    this.dataShiftService
      .getShift(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (shift) => {
          this.containerShift = shift;

          this.setTimeFromShift(shift);
          this.setActiveWeekdays(shift);

          this.containerService.initializeTemplateGrid(shift).subscribe({
            next: () => {
              this.isLoading = false;
              if (this.selectedWeekday) {
                const weekdayNumber = this.containerService.getWeekdayNumber(
                  this.selectedWeekday
                );
                this.containerService
                  .loadTasksForWeekday(weekdayNumber)
                  .subscribe(() => {
                    this.containerService
                      .loadTemplates(this.containerShift!.id!)
                      .subscribe(() => {
                        this.updateAvailableTasks();
                      });
                  });
              }
            },
            error: () => {
              this.isLoading = false;
            },
          });
        },
        error: () => {
          this.isLoading = false;
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
    this.timeChange$.next();
  }

  onTimeToChange(time: OwnTime): void {
    this.timeTo = OwnTime.forTime(time.hours, time.minutes);
    this.calculateDuration();
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
        parseInt(this.timeFrom.minutes)
      ),
      endShift: timeToString(
        parseInt(this.timeTo.hours),
        parseInt(this.timeTo.minutes)
      ),
    };

    this.containerService.initializeTemplateGrid(updatedShift).subscribe({
      next: () => {
        if (this.selectedWeekday) {
          const weekdayNumber = this.containerService.getWeekdayNumber(
            this.selectedWeekday
          );
          this.containerService
            .loadTasksForWeekday(weekdayNumber)
            .subscribe(() => {
              this.updateAvailableTasks();
              this.rearrangeSelectedTasks();
            });
        }
      },
      error: () => {},
    });
  }

  private rearrangeSelectedTasks(): void {
    const currentTasks =
      this.shiftService.selectedContainerTemplateItemsSignal();
    if (currentTasks.length > 0) {
      this.arrangeAndSetSelectedContainerTemplateItems([...currentTasks]);
    }
  }

  private calculateDuration(): void {
    this.duration = this.timeRangeService.calculateDuration(
      this.timeFrom,
      this.timeTo
    );
  }

  onWeekdayChange(): void {
    this.selectedTabIndex = 0;
    this.shiftService.setSelectedShift(null);
    if (this.selectedWeekday) {
      this.shiftService.setCurrentWeekday(this.selectedWeekday);
      const weekdayNumber = this.containerService.getWeekdayNumber(
        this.selectedWeekday
      );
      this.containerService.loadTasksForWeekday(weekdayNumber).subscribe(() => {
        this.updateAvailableTasks();
        this.updateCurrentWeekdayAndSlot();
      });
    }
  }

  selectTab(index: number): void {
    this.selectedTabIndex = index;
    this.shiftService.clearTasks();
    this.shiftService.setSelectedShift(null);
    this.updateAvailableTasks();
    this.updateCurrentWeekdayAndSlot();
  }

  private updateAvailableTasks(): void {
    const filteredRows = this.getFilteredRowsForSelectedWeekday();
    if (
      filteredRows.length === 0 ||
      this.selectedTabIndex >= filteredRows.length
    ) {
      this.availableTasks = [];
      return;
    }

    const row = filteredRows[this.selectedTabIndex];
    const allShifts: IShift[] = [];

    row.forEach((slot) => {
      if (slot.availableTasks) {
        allShifts.push(...slot.availableTasks);
      }
    });

    let uniqueShifts = this.containerService.getUniqueShifts(allShifts);

    const selectedShiftIds = this.shiftService
      .selectedContainerTemplateItemsSignal()
      .map((item) => item.shiftId)
      .filter((id) => id != null);

    uniqueShifts = uniqueShifts.filter(
      (shift) => !selectedShiftIds.includes(shift.id!)
    );

    uniqueShifts = this.containerService.filterAvailableTasksBySearch(
      uniqueShifts,
      this.currentSearchString
    );

    const orderBy = this.sortingService.getCurrentOrderBy();
    const sortOrder = this.sortingService.getCurrentSortOrder();

    this.availableTasks = this.containerService.sortShifts(
      uniqueShifts,
      orderBy || '',
      sortOrder
    );
  }

  getFilteredRowsForSelectedWeekday(): IContainerTemplateSlot[][] {
    if (!this.selectedWeekday) {
      return [];
    }

    const weekdayNumber = this.containerService.getWeekdayNumber(
      this.selectedWeekday
    );
    return this.containerService.getFilteredRowsForWeekday(
      this.templateGrid,
      weekdayNumber
    );
  }

  getSlotsForSelectedTab(): IContainerTemplateSlot[] {
    const filteredRows = this.getFilteredRowsForSelectedWeekday();
    if (
      filteredRows.length === 0 ||
      this.selectedTabIndex >= filteredRows.length
    ) {
      return [];
    }

    return filteredRows[this.selectedTabIndex];
  }

  getConnectedDropLists(): string[] {
    return ['available-tasks-list', 'selected-tasks-list'];
  }

  onDragStarted(event: any): void {}

  onDragEnded(event: any): void {}

  onTaskDrop(event: CdkDragDrop<IContainerTemplateItem[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
      if (event.container.id === 'selected-tasks-list') {
        this.arrangeAndSetSelectedContainerTemplateItems([
          ...event.container.data,
        ]);
      }
    } else {
      if (
        event.container.id === 'selected-tasks-list' &&
        event.previousContainer.id === 'available-tasks-list'
      ) {
        const shift = (event.previousContainer.data as any)[
          event.previousIndex
        ] as IShift;
        const containerTemplateItem: IContainerTemplateItem =
          this.convertShiftToContainerTemplateItem(shift);

        event.container.data.splice(
          event.currentIndex,
          0,
          containerTemplateItem
        );
        (event.previousContainer.data as any).splice(event.previousIndex, 1);

        this.insertNewItemWithMinimalRepositioning(
          [...event.container.data],
          event.currentIndex
        );
      } else if (
        event.previousContainer.id === 'selected-tasks-list' &&
        event.container.id === 'available-tasks-list'
      ) {
        const item = event.previousContainer.data[event.previousIndex];
        event.previousContainer.data.splice(event.previousIndex, 1);

        this.arrangeAndSetSelectedContainerTemplateItems([
          ...event.previousContainer.data,
        ]);
        const selectedIdentifier =
          this.shiftService.selectedShift?.id ||
          this.shiftService.selectedShift?.tmpId;
        const itemIdentifier = item.id || item.tmpId;
        if (selectedIdentifier === itemIdentifier) {
          this.shiftService.setSelectedShift(null);
        }
      }
    }
  }

  private convertShiftToContainerTemplateItem(
    shift: IShift
  ): IContainerTemplateItem {
    return {
      tmpId: newGuid(),
      shiftId: shift.id!,
      shift: shift,
      startShift: shift.startShift,
      endShift: shift.endShift,
      briefingTime: shift.briefingTime,
      debriefingTime: shift.debriefingTime,
      travelTimeAfter: shift.travelTimeAfter,
      travelTimeBefore: shift.travelTimeBefore,
      timeRangeStartShift: shift.isTimeRange ? shift.startShift : '',
      timeRangeEndShift: shift.isTimeRange ? shift.endShift : '',
    };
  }

  private insertNewItemWithMinimalRepositioning(
    containerTemplateItems: IContainerTemplateItem[],
    newItemIndex: number
  ): void {
    if (containerTemplateItems.length === 0) {
      this.shiftService.setSelectedContainerTemplateItems(
        containerTemplateItems
      );
      return;
    }

    const containerTimeFrom = timeToString(
      parseInt(this.timeFrom.hours),
      parseInt(this.timeFrom.minutes)
    );
    const containerTimeUntil = timeToString(
      parseInt(this.timeTo.hours),
      parseInt(this.timeTo.minutes)
    );

    const arrangedItems =
      this.arrangementService.insertItemWithMinimalRepositioning(
        containerTemplateItems,
        newItemIndex,
        containerTimeFrom,
        containerTimeUntil
      );

    this.shiftService.setSelectedContainerTemplateItems(arrangedItems);

    if (this.selectedWeekday) {
      const weekdayNumber = this.containerService.getWeekdayNumber(
        this.selectedWeekday
      );
      this.containerService.updateTaskOrderInTemplates(
        arrangedItems,
        weekdayNumber,
        this.isHoliday
      );
    }
  }

  private arrangeAndSetSelectedContainerTemplateItems(
    containerTemplateItems: IContainerTemplateItem[]
  ): void {
    if (containerTemplateItems.length === 0) {
      this.shiftService.setSelectedContainerTemplateItems(
        containerTemplateItems
      );
      return;
    }

    const containerTimeFrom = timeToString(
      parseInt(this.timeFrom.hours),
      parseInt(this.timeFrom.minutes)
    );
    const containerTimeUntil = timeToString(
      parseInt(this.timeTo.hours),
      parseInt(this.timeTo.minutes)
    );

    const arrangedItems = this.arrangementService.arrangeShifts(
      containerTemplateItems,
      containerTimeFrom,
      containerTimeUntil
    );

    this.shiftService.setSelectedContainerTemplateItems(arrangedItems);

    if (this.selectedWeekday) {
      const weekdayNumber = this.containerService.getWeekdayNumber(
        this.selectedWeekday
      );
      this.containerService.updateTaskOrderInTemplates(
        arrangedItems,
        weekdayNumber,
        this.isHoliday
      );
    }
  }

  compactSelectedShifts(): void {
    const currentItems = this.shiftService.selectedContainerTemplateItemsSignal();
    this.arrangeAndSetSelectedContainerTemplateItems([...currentItems]);
  }

  getTabLabel(rowIndex: number): string {
    const filteredRows = this.getFilteredRowsForSelectedWeekday();
    if (filteredRows.length === 0 || rowIndex >= filteredRows.length) {
      return '';
    }

    const firstSlot = filteredRows[rowIndex][0];
    const labelWithoutDay = firstSlot.label.split(' - ')[0];

    const match = labelWithoutDay.match(/^(\w+)\s*\(([^)]+)\)$/);
    if (!match) {
      return labelWithoutDay;
    }

    const [, weekdayEn, holidayLabelEn] = match;

    const weekdayKey = `shift.container-template.weekday-full.${weekdayEn.toLowerCase()}`;
    const weekdayTranslated = this.translateService.instant(weekdayKey);

    const holidayKey = `shift.container-template.holiday-label.${this.getHolidayLabelKey(
      holidayLabelEn
    )}`;
    const holidayTranslated = this.translateService.instant(holidayKey);

    if (holidayTranslated) {
      return `${weekdayTranslated} ${holidayTranslated}`;
    }
    return weekdayTranslated;
  }

  private getHolidayLabelKey(label: string): string {
    const normalized = label.toLowerCase().trim();
    switch (normalized) {
      case 'normal':
        return 'normal';
      case 'weekday':
        return 'weekday';
      case 'holiday':
        return 'holiday';
      case 'holiday only':
        return 'holiday-only';
      default:
        return 'normal';
    }
  }

  onShiftRowClick(item: IContainerTemplateItem): void {
    this.shiftService.setSelectedShift(item);
  }

  onHeaderClick(columnKey: string): void {
    this.sortingService.onHeaderClick(columnKey, () => {
      this.updateAvailableTasks();
    });
  }

  private onSearchChanged(): void {
    this.updateAvailableTasks();
  }

  private updateCurrentWeekdayAndSlot(): void {
    if (!this.selectedWeekday) return;

    const weekdayNumber = this.containerService.getWeekdayNumber(
      this.selectedWeekday
    );
    const slots = this.getSlotsForSelectedTab();

    if (slots.length > 0) {
      this.containerService.setCurrentWeekdayAndSlot(weekdayNumber, slots[0]);
    }
  }

  get currentTemplates(): IContainerTemplate[] {
    return this.containerService.getCurrentTemplates();
  }
}
