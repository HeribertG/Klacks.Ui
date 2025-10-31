import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AngularSplitModule } from 'angular-split';
import { TranslateModule } from '@ngx-translate/core';
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
  selector: 'app-shift-template',
  imports: [
    CommonModule,
    FormsModule,
    AngularSplitModule,
    TranslateModule,
    TimeInputComponent,
    TimeRulerComponent,
  ],
  templateUrl: './shift-template.component.html',
  styleUrl: './shift-template.component.scss',
  standalone: true,
})
export class ShiftTemplateComponent implements OnInit, OnDestroy {
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
    { value: 'monday', labelKey: 'shift.shift-template.weekday.monday' },
    { value: 'tuesday', labelKey: 'shift.shift-template.weekday.tuesday' },
    { value: 'wednesday', labelKey: 'shift.shift-template.weekday.wednesday' },
    { value: 'thursday', labelKey: 'shift.shift-template.weekday.thursday' },
    { value: 'friday', labelKey: 'shift.shift-template.weekday.friday' },
    { value: 'saturday', labelKey: 'shift.shift-template.weekday.saturday' },
    { value: 'sunday', labelKey: 'shift.shift-template.weekday.sunday' },
  ];

  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  private timeRangeService = inject(TimeRangeService);
  private activatedRoute = inject(ActivatedRoute);
  private dataShiftService = inject(DataShiftService);
  private containerService = inject(DataManagementContainerService);
  private destroy$ = new Subject<void>();

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
    });

    this.containerService.loading$.pipe(takeUntil(this.destroy$)).subscribe(loading => {
      this.isLoading = loading;
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
            console.log('Template grid initialized:', grid);
          },
          error: (error) => {
            console.error('Error initializing template grid:', error);
            this.isLoading = false;
          }
        });
      },
      error: (error) => {
        console.error('Error loading container shift:', error);
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
      activeWeekdays.push({ value: 'sunday', labelKey: 'shift.shift-template.weekday.sunday' });
    }
    if (shift.isMonday) {
      activeWeekdays.push({ value: 'monday', labelKey: 'shift.shift-template.weekday.monday' });
    }
    if (shift.isTuesday) {
      activeWeekdays.push({ value: 'tuesday', labelKey: 'shift.shift-template.weekday.tuesday' });
    }
    if (shift.isWednesday) {
      activeWeekdays.push({ value: 'wednesday', labelKey: 'shift.shift-template.weekday.wednesday' });
    }
    if (shift.isThursday) {
      activeWeekdays.push({ value: 'thursday', labelKey: 'shift.shift-template.weekday.thursday' });
    }
    if (shift.isFriday) {
      activeWeekdays.push({ value: 'friday', labelKey: 'shift.shift-template.weekday.friday' });
    }
    if (shift.isSaturday) {
      activeWeekdays.push({ value: 'saturday', labelKey: 'shift.shift-template.weekday.saturday' });
    }

    this.weekdays = activeWeekdays;

    if (activeWeekdays.length > 0) {
      this.selectedWeekday = activeWeekdays[0].value;
    }
  }

  onTimeFromChange(time: OwnTime): void {
    this.timeFrom = OwnTime.forTime(time.hours, time.minutes);
    this.calculateDuration();
  }

  onTimeToChange(time: OwnTime): void {
    this.timeTo = OwnTime.forTime(time.hours, time.minutes);
    this.calculateDuration();
  }

  private calculateDuration(): void {
    this.duration = this.timeRangeService.calculateDuration(
      this.timeFrom,
      this.timeTo
    );
  }

  onWeekdayChange(): void {
    this.selectedTabIndex = 0;
  }

  selectTab(index: number): void {
    this.selectedTabIndex = index;
  }

  getFilteredRowsForSelectedWeekday(): IContainerTemplateSlot[][] {
    if (!this.templateGrid || !this.selectedWeekday) {
      return [];
    }

    const weekdayNumber = this.getWeekdayNumber(this.selectedWeekday);
    return this.templateGrid.slots.filter(row => row[0].weekday === weekdayNumber);
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

    return uniqueShifts;
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
}
