// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * "Clear day" button of the availability header: sets every hour of the client day of the selected grid cell to
 * "no entry". Disabled while no cell is selected or the user may not edit availabilities.
 * @param edit - Shared edit rules of the availability page (right check and the clear action)
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { AvailabilityEditService } from '../services/availability-edit.service';

@Component({
  selector: 'app-client-availability-clear-day',
  templateUrl: './client-availability-clear-day.component.html',
  styleUrls: ['./client-availability-clear-day.component.scss'],
  standalone: true,
  imports: [NgbTooltipModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientAvailabilityClearDayComponent {
  readonly edit = inject(AvailabilityEditService);

  onClick(): void {
    this.edit.clearSelectedDay();
  }
}
