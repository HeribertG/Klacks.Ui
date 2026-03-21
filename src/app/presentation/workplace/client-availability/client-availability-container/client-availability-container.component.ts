// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, computed, signal, viewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { AngularSplitModule } from 'angular-split';
import { HScrollbarComponent } from 'src/app/presentation/shared/h-scrollbar/h-scrollbar.component';
import { VScrollbarComponent } from 'src/app/presentation/shared/v-scrollbar/v-scrollbar.component';
import { ClientAvailabilitySurfaceComponent } from '../client-availability-surface/client-availability-surface.component';
import { ClientAvailabilityRowHeaderComponent } from '../client-availability-row-header/client-availability-row-header.component';

@Component({
  selector: 'app-client-availability-container',
  templateUrl: './client-availability-container.component.html',
  styleUrls: ['./client-availability-container.component.scss'],
  standalone: true,
  host: {
    '[style.--v-scrollbar-size]': 'vScrollbarCssSize()',
  },
  imports: [
    AngularSplitModule,
    ClientAvailabilityRowHeaderComponent,
    ClientAvailabilitySurfaceComponent,
    HScrollbarComponent,
    VScrollbarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientAvailabilityContainerComponent {
  surface = viewChild.required<ClientAvailabilitySurfaceComponent>('surface');
  rowHeader = viewChild.required<ClientAvailabilityRowHeaderComponent>('rowHeader');

  vScrollbarCssSize = computed(() =>
    this.vScrollbarMaxValue() <= this.vScrollbarVisibleValue() ? '0px' : '17px'
  );

  public hScrollbarValue = signal(0);
  public vScrollbarValue = signal(0);
  public hScrollbarMaxValue = signal(0);
  public vScrollbarMaxValue = signal(0);
  public hScrollbarVisibleValue = signal(0);
  public vScrollbarVisibleValue = signal(0);

  onHScrollbarValueChange(value: number): void {
    this.hScrollbarValue.set(value);
  }

  onVScrollbarValueChange(value: number): void {
    this.vScrollbarValue.set(value);
  }

  onHScrollbarMaxValueChange(value: number): void {
    this.hScrollbarMaxValue.set(value);
  }

  onVScrollbarMaxValueChange(value: number): void {
    this.vScrollbarMaxValue.set(value);
  }

  onHScrollbarVisibleValueChange(value: number): void {
    this.hScrollbarVisibleValue.set(value);
  }

  onVScrollbarVisibleValueChange(value: number): void {
    this.vScrollbarVisibleValue.set(value);
  }
}
