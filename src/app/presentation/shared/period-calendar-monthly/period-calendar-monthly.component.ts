// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  Component, inject, Input, OnInit,
  ChangeDetectionStrategy,
  output
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CounterComponent } from 'src/app/presentation/shared/counter/counter.component';
import { GridSettingsService } from 'src/app/presentation/shared/grid/services/grid-settings.service';

export interface PeriodResetData {
  year: number;
  month?: number;
  week?: number;
}

@Component({
  selector: 'app-period-calendar-monthly',
  templateUrl: './period-calendar-monthly.component.html',
  styleUrls: ['./period-calendar-monthly.component.scss'],
  standalone: true,
  imports: [FormsModule, TranslateModule, CounterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodCalendarMonthlyComponent implements OnInit {
  @Input() year = new Date().getFullYear();
  @Input() month = new Date().getMonth() + 1;
  readonly periodChanged = output<PeriodResetData>();

  public gridSettingsService = inject(GridSettingsService);

  maxYear = new Date().getFullYear() + 30;

  ngOnInit(): void {
    this.periodChanged.emit({ year: this.year, month: this.month });
  }

  changeYear(event: number): void {
    this.year = event;
    this.emitChange();
  }

  onChangeMonth(): void {
    this.emitChange();
  }

  private emitChange(): void {
    this.periodChanged.emit({ year: this.year, month: this.month });
  }
}
