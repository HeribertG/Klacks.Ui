// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, inject, output, signal } from '@angular/core';
import { NgxSliderModule, Options } from '@angular-slider/ngx-slider';
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { AvailabilitySettingService } from '../services/availability-setting.service';
import { HourGroupingMode } from 'src/app/domain/models/client-availability/hour-grouping-mode.enum';
import { PaymentInterval } from 'src/app/domain/models/contract/contract-class';

@Component({
  selector: 'app-client-availability-header',
  templateUrl: './client-availability-header.component.html',
  styleUrls: ['./client-availability-header.component.scss'],
  standalone: true,
  imports: [
    NgxSliderModule,
    NgbDropdownModule,
    NgbTooltipModule,
    TranslateModule,
  ],
})
export class ClientAvailabilityHeaderComponent {
  private settings = inject(AvailabilitySettingService);

  saveRequested = output<void>();
  periodChanged = output<void>();

  periodLabel = signal('');

  zoomOptions: Options = {
    floor: 0.5,
    ceil: 3,
    step: 0.1,
    showTicks: false,
    showSelectionBar: true,
  };

  get zoom(): number {
    return this.settings.zoom;
  }

  set zoom(value: number) {
    this.settings.zoom = value;
  }

  get viewMode(): PaymentInterval {
    return this.settings.viewMode();
  }

  get hourGroupingMode(): HourGroupingMode {
    return this.settings.hourGroupingMode();
  }

  setViewMode(mode: PaymentInterval): void {
    this.settings.viewMode.set(mode);
    this.periodChanged.emit();
  }

  setHourGrouping(mode: HourGroupingMode): void {
    this.settings.hourGroupingMode.set(mode);
    this.periodChanged.emit();
  }

  onSave(): void {
    this.saveRequested.emit();
  }

  onPrevPeriod(): void {
    this.periodChanged.emit();
  }

  onNextPeriod(): void {
    this.periodChanged.emit();
  }

  readonly PaymentInterval = PaymentInterval;
  readonly HourGroupingMode = HourGroupingMode;
}
