/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, inject, OnDestroy, OnInit, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { OwnTime } from 'src/app/domain/models/schedule-class';
import { IShift } from 'src/app/domain/models/shift-class';
import {
  IContainerTemplateGrid,
  IContainerTemplateSlot,
} from 'src/app/domain/models/container-template-slot';
import { IContainerTemplate } from 'src/app/domain/models/container-template-class';
import { DataShiftService } from 'src/app/infrastructure/api/data-shift.service';
import { DataManagementContainerService } from 'src/app/domain/services/container/data-management.container.service';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import {
  formatTime,
  timeToString,
} from 'src/app/shared/helpers/time-format.helper';

@Component({
  selector: 'app-container-template',
  imports: [
    CommonModule,
    FormsModule,
    AngularSplitModule,
    TranslateModule,
    DragDropModule,
    TimeInputComponent,
    TimeRulerComponent,
  ],
  templateUrl: './container-template.component.html',
  styleUrl: './container-template.component.scss',
  standalone: true,
  providers: [TableSortingService],
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
  private destroy$ = new Subject<void>();
  private timeChange$ = new Subject<void>();

  public containerShift: IShift | null = null;
  public templateGrid: IContainerTemplateGrid | null = null;
  public isLoading = false;
  public selectedTabIndex = 0;
  public availableTasks: IShift[] = [];
  private currentSearchString = '';

  formatTime = formatTime;

  get selectedTasks(): IShift[] {
    return this.shiftService.selectedTasksSignal();
  }

  private isDirty = computed(() => {
    const hasSelectedTasks = this.shiftService.selectedTasksSignal().length > 0;
    const hasTemplateChanges = this.containerService.areObjectsDirty();
    return hasSelectedTasks || hasTemplateChanges;
  });

  private canSaveComputed = computed(() => {
    const hasSelectedTasks = this.shiftService.selectedTasksSignal().length > 0;
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
      if (this.containerShift?.id) {
        this.containerService.loadTemplates(this.containerShift.id);
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
          this.containerService.loadTemplates(id);
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
                    this.updateAvailableTasks();
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
          this.containerService.loadTasksForWeekday(weekdayNumber).subscribe(() => {
            this.updateAvailableTasks();
          });
        }
      },
      error: () => {},
    });
  }

  private calculateDuration(): void {
    this.duration = this.timeRangeService.calculateDuration(
      this.timeFrom,
      this.timeTo
    );
  }

  onWeekdayChange(): void {
    this.selectedTabIndex = 0;
    this.shiftService.clearTasks();
    this.shiftService.setSelectedShift(null);
    if (this.selectedWeekday) {
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

    const uniqueShifts = this.containerService.getUniqueShifts(allShifts);
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

  onTaskDrop(event: CdkDragDrop<IShift[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
      if (event.container.id === 'selected-tasks-list') {
        this.shiftService.setSelectedTasks([...event.container.data]);
      }
    } else {
      const movedItem = event.previousContainer.data[event.previousIndex];

      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      if (event.container.id === 'selected-tasks-list') {
        this.shiftService.setSelectedTasks([...event.container.data]);
      } else if (event.previousContainer.id === 'selected-tasks-list') {
        this.shiftService.setSelectedTasks([...event.previousContainer.data]);
        if (this.shiftService.selectedShift?.id === movedItem.id) {
          this.shiftService.setSelectedShift(null);
        }
      }
    }
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

  onShiftRowClick(shift: IShift): void {
    this.shiftService.setSelectedShift(shift);
  }

  onHeaderClick(columnKey: string): void {
    this.sortingService.onHeaderClick(columnKey, () => {
      this.updateAvailableTasks();
    });
  }

  private onSearchChanged(): void {
    if (this.selectedWeekday) {
      const weekdayNumber = this.containerService.getWeekdayNumber(
        this.selectedWeekday
      );
      this.containerService
        .loadTasksForWeekday(weekdayNumber, this.currentSearchString)
        .subscribe(() => {
          this.updateAvailableTasks();
        });
    }
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
