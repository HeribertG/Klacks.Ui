import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { AngularSplitModule } from 'angular-split';
import { TranslateModule } from '@ngx-translate/core';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { SearchService } from 'src/app/application/services/search.service';
import { TimeRangeService } from 'src/app/presentation/shared/time-ruler/services/time-range.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { TimeInputComponent } from 'src/app/presentation/shared/time-input/time-input.component';
import { TimeRulerComponent } from 'src/app/presentation/shared/time-ruler/time-ruler.component';
import { OwnTime } from 'src/app/domain/models/schedule-class';
import { IShift } from 'src/app/domain/models/shift-class';
import { IContainerTemplateGrid, IContainerTemplateSlot } from 'src/app/domain/models/container-template-slot';
import { DataShiftService } from 'src/app/infrastructure/api/data-shift.service';
import { DataManagementContainerService } from 'src/app/domain/services/container/data-management.container.service';

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
    { value: 'wednesday', labelKey: 'shift.container-template.weekday.wednesday' },
    { value: 'thursday', labelKey: 'shift.container-template.weekday.thursday' },
    { value: 'friday', labelKey: 'shift.container-template.weekday.friday' },
    { value: 'saturday', labelKey: 'shift.container-template.weekday.saturday' },
    { value: 'sunday', labelKey: 'shift.container-template.weekday.sunday' },
  ];

  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  private timeRangeService = inject(TimeRangeService);
  private activatedRoute = inject(ActivatedRoute);
  private dataShiftService = inject(DataShiftService);
  private containerService = inject(DataManagementContainerService);
  private destroy$ = new Subject<void>();
  private timeChange$ = new Subject<void>();

  public containerShift: IShift | null = null;
  public templateGrid: IContainerTemplateGrid | null = null;
  public isLoading = false;
  public selectedTabIndex = 0;

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    this.searchService.setSearchVisibility(false);
    this.savebarService.setSavebarVisibility(true);
    this.calculateDuration();

    this.activatedRoute.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = params['id'];
      if (id) {
        this.loadContainerShift(id);
      }
    });

    this.containerService.templateGrid$.pipe(takeUntil(this.destroy$)).subscribe(grid => {
      this.templateGrid = grid;
      console.log('[GRID] Template grid updated:', grid);
    });

    this.containerService.loading$.pipe(takeUntil(this.destroy$)).subscribe(loading => {
      this.isLoading = loading;
    });

    this.timeChange$.pipe(
      debounceTime(500),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.executeGridRefresh();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.containerService.reset();
  }

  private loadContainerShift(id: string): void {
    this.isLoading = true;
    this.dataShiftService.getShift(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (shift) => {
        this.containerShift = shift;

        this.setTimeFromShift(shift);
        this.setActiveWeekdays(shift);

        this.containerService.initializeTemplateGrid(shift).subscribe({
          next: (grid) => {
            this.isLoading = false;
            if (this.selectedWeekday) {
              const weekdayNumber = this.getWeekdayNumber(this.selectedWeekday);
              this.containerService.loadTasksForWeekday(weekdayNumber).subscribe();
            }
          },
          error: (error) => {
            this.isLoading = false;
          }
        });
      },
      error: (error) => {
        this.isLoading = false;
      }
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
    const activeWeekdays: typeof this.weekdays = [];

    if (shift.isSunday) {
      activeWeekdays.push({ value: 'sunday', labelKey: 'shift.container-template.weekday.sunday' });
    }
    if (shift.isMonday) {
      activeWeekdays.push({ value: 'monday', labelKey: 'shift.container-template.weekday.monday' });
    }
    if (shift.isTuesday) {
      activeWeekdays.push({ value: 'tuesday', labelKey: 'shift.container-template.weekday.tuesday' });
    }
    if (shift.isWednesday) {
      activeWeekdays.push({ value: 'wednesday', labelKey: 'shift.container-template.weekday.wednesday' });
    }
    if (shift.isThursday) {
      activeWeekdays.push({ value: 'thursday', labelKey: 'shift.container-template.weekday.thursday' });
    }
    if (shift.isFriday) {
      activeWeekdays.push({ value: 'friday', labelKey: 'shift.container-template.weekday.friday' });
    }
    if (shift.isSaturday) {
      activeWeekdays.push({ value: 'saturday', labelKey: 'shift.container-template.weekday.saturday' });
    }

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
      startShift: `${this.timeFrom.hours}:${this.timeFrom.minutes}:00`,
      endShift: `${this.timeTo.hours}:${this.timeTo.minutes}:00`
    };

    this.containerService.initializeTemplateGrid(updatedShift).subscribe({
      next: (grid) => {
        if (this.selectedWeekday) {
          const weekdayNumber = this.getWeekdayNumber(this.selectedWeekday);
          this.containerService.loadTasksForWeekday(weekdayNumber).subscribe();
        }
      },
      error: (error) => {
      }
    });
  }

  private calculateDuration(): void {
    this.duration = this.timeRangeService.calculateDuration(
      this.timeFrom,
      this.timeTo
    );
  }

  onWeekdayChange(): void {
    console.log('[WEEKDAY] Weekday changed:', this.selectedWeekday);
    this.selectedTabIndex = 0;
    if (this.selectedWeekday) {
      const weekdayNumber = this.getWeekdayNumber(this.selectedWeekday);
      console.log('[WEEKDAY] Loading tasks for weekday:', weekdayNumber);
      this.containerService.loadTasksForWeekday(weekdayNumber).subscribe();
    }
  }

  selectTab(index: number): void {
    console.log('[TAB] Tab selected:', index);
    this.selectedTabIndex = index;
  }

  getFilteredRowsForSelectedWeekday(): IContainerTemplateSlot[][] {
    if (!this.templateGrid || !this.selectedWeekday) {
      return [];
    }

    const weekdayNumber = this.getWeekdayNumber(this.selectedWeekday);
    return this.templateGrid.slots.filter(row => row[0].weekday === weekdayNumber);
  }

  getSlotsForSelectedTab(): IContainerTemplateSlot[] {
    const filteredRows = this.getFilteredRowsForSelectedWeekday();
    if (filteredRows.length === 0 || this.selectedTabIndex >= filteredRows.length) {
      return [];
    }

    const slots = filteredRows[this.selectedTabIndex];
    console.log('[SLOTS] Slots for selected tab:', slots.length, slots);
    return slots;
  }

  getSlotDropListIds(): string[] {
    const slots = this.getSlotsForSelectedTab();
    const ids = slots.map((_, index) => `slot-${index}`);
    console.log('[DROP-LISTS] Slot drop list IDs:', ids);
    return ids;
  }

  getConnectedDropLists(): string[] {
    const connected = ['available-tasks-list', ...this.getSlotDropListIds()];
    console.log('[DROP-LISTS] Connected drop lists:', connected);
    return connected;
  }

  getAvailableShiftsForSelectedTab(): IShift[] {
    const filteredRows = this.getFilteredRowsForSelectedWeekday();
    if (filteredRows.length === 0 || this.selectedTabIndex >= filteredRows.length) {
      return [];
    }

    const row = filteredRows[this.selectedTabIndex];
    const allShifts: IShift[] = [];

    row.forEach(slot => {
      if (slot.availableTasks) {
        allShifts.push(...slot.availableTasks);
      }
    });

    const uniqueShifts = allShifts.filter((shift, index, self) =>
      index === self.findIndex(s => s.id === shift.id)
    );

    console.log('[AVAILABLE-TASKS] Available shifts for tab:', uniqueShifts.length, uniqueShifts);

    return uniqueShifts;
  }

  onDragStarted(event: any): void {
    console.log('[DRAG] Drag started:', event);
  }

  onDragEnded(event: any): void {
    console.log('[DRAG] Drag ended:', event);
  }

  getTabLabel(rowIndex: number): string {
    const filteredRows = this.getFilteredRowsForSelectedWeekday();
    if (filteredRows.length === 0 || rowIndex >= filteredRows.length) {
      return '';
    }

    const firstSlot = filteredRows[rowIndex][0];
    return firstSlot.label.split(' - ')[0];
  }

  private getWeekdayNumber(weekdayValue: string): number {
    const weekdayMap: { [key: string]: number } = {
      'sunday': 0,
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6
    };
    return weekdayMap[weekdayValue] ?? -1;
  }

  formatTime(time: string | undefined): string {
    if (!time) {
      return '';
    }
    return time.substring(0, 5);
  }

  onTaskDropToSlot(event: CdkDragDrop<IShift[]>, slot: IContainerTemplateSlot): void {
    console.log('[DROP] onTaskDropToSlot triggered', {
      previousContainer: event.previousContainer.id,
      currentContainer: event.container.id,
      previousIndex: event.previousIndex,
      currentIndex: event.currentIndex,
      slotLabel: slot.label,
      previousData: event.previousContainer.data,
      currentData: event.container.data
    });

    if (event.previousContainer === event.container) {
      console.log('[DROP] Same container - reordering');
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      const task = event.previousContainer.data[event.previousIndex];
      console.log('[DROP] Different container - transferring task:', task);

      if (!slot.assignedTasks) {
        slot.assignedTasks = [];
        console.log('[DROP] Initialized assignedTasks array');
      }

      const alreadyExists = slot.assignedTasks.some(t => t.id === task.id);
      console.log('[DROP] Task already exists?', alreadyExists);

      if (!alreadyExists) {
        slot.assignedTasks.splice(event.currentIndex, 0, task);
        console.log('[DROP] Task added. Total assigned tasks:', slot.assignedTasks.length);
      }
    }
  }

  removeTaskFromSlot(task: IShift, slot: IContainerTemplateSlot): void {
    if (!slot.assignedTasks) {
      return;
    }

    const index = slot.assignedTasks.findIndex(t => t.id === task.id);
    if (index !== -1) {
      slot.assignedTasks.splice(index, 1);
    }
  }
}
