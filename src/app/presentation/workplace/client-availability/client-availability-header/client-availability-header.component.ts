// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, inject, output, signal } from '@angular/core';
import { NgxSliderModule, Options } from '@angular-slider/ngx-slider';
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { AvailabilitySettingService } from '../services/availability-setting.service';
import { HourGroupingMode } from 'src/app/domain/models/client-availability/hour-grouping-mode.enum';
import { PaymentInterval } from 'src/app/domain/models/contract/contract-class';

const GROUPING_LABELS = ['1h', '2h', '4h', 'VM/NM', 'Tag'];

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

  groupingOptions: Options = {
    floor: 0,
    ceil: 4,
    step: 1,
    showSelectionBarEnd: false,
    showSelectionBar: false,
    translate: (value: number): string => GROUPING_LABELS[value],
  };

  get hourGrouping(): number {
    return this.settings.hourGroupingMode();
  }

  set hourGrouping(value: number) {
    this.settings.hourGroupingMode.set(value as HourGroupingMode);
    this.periodChanged.emit();
  }

  get viewMode(): PaymentInterval {
    return this.settings.viewMode();
  }

  setViewMode(mode: PaymentInterval): void {
    this.settings.viewMode.set(mode);
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
}
