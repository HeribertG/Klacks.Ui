import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { AngularSplitModule } from 'angular-split';
import { TranslateModule } from '@ngx-translate/core';
import { SearchService } from 'src/app/application/services/search.service';
import { TimeRangeService } from 'src/app/presentation/shared/time-ruler/services/time-range.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { TimeInputComponent } from 'src/app/presentation/shared/time-input/time-input.component';
import { TimeRulerComponent } from 'src/app/presentation/shared/time-ruler/time-ruler.component';
import { OwnTime } from 'src/app/domain/models/schedule-class';

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
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    this.searchService.setSearchVisibility(false);
    this.savebarService.setSavebarVisibility(true);
    this.calculateDuration();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
}
