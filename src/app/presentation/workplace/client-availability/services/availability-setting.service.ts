// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { EventEmitter, Injectable, Output, signal } from '@angular/core';
import { HourGroupingMode, COLUMNS_PER_DAY } from 'src/app/domain/models/client-availability/hour-grouping-mode.enum';
import { PaymentInterval } from 'src/app/domain/models/contract/contract-class';
import { IRowHeaderSettings } from 'src/app/presentation/shared/grid/row-header/row-header-settings.interface';

@Injectable()
export class AvailabilitySettingService implements IRowHeaderSettings {
  @Output() zoomChangingEvent = new EventEmitter();

  private static readonly BASE_CELL_WIDTH = 24;
  private static readonly DAY_HEADER_HEIGHT = 27;
  private static readonly HOUR_HEADER_HEIGHT = 28;

  cellHeight = 32;
  cellWidth = AvailabilitySettingService.BASE_CELL_WIDTH;
  cellHeaderHeight =
    AvailabilitySettingService.DAY_HEADER_HEIGHT +
    AvailabilitySettingService.HOUR_HEADER_HEIGHT;
  dayHeaderHeight = AvailabilitySettingService.DAY_HEADER_HEIGHT;
  hourHeaderHeight = AvailabilitySettingService.HOUR_HEADER_HEIGHT;
  borderWidth = 1;

  hourGroupingMode = signal(HourGroupingMode.TwoHour);
  viewMode = signal(PaymentInterval.Weekly);

  private _zoom = 1;

  get zoom(): number {
    return this._zoom;
  }

  set zoom(value: number) {
    this._zoom = value;
    this.cellWidth = AvailabilitySettingService.BASE_CELL_WIDTH * value;
    this.zoomChangingEvent.emit();
  }

  get columnsPerDay(): number {
    return COLUMNS_PER_DAY[this.hourGroupingMode()];
  }
}
