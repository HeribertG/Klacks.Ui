// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Legend of the availability grid: shows the symbol of each cell state with its meaning and explains in a tooltip
 * that the weak grey cross follows from the day rule and how clicking and Ctrl-dragging change a cell.
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { CheckboxDrawingService } from '../services/render-availability-grid/checkbox-drawing.service';
import { AvailabilityDisplayState } from 'src/app/domain/models/client-availability/availability-display-state.enum';
import { AvailabilityLegendEntry } from './availability-legend-entry.interface';

const LEGEND_STATES: readonly { state: AvailabilityDisplayState; labelKey: string; tooltipKey: string }[] = [
  {
    state: AvailabilityDisplayState.Available,
    labelKey: 'client-availability.legend.available',
    tooltipKey: 'client-availability.legend.hint',
  },
  {
    state: AvailabilityDisplayState.Blocked,
    labelKey: 'client-availability.legend.blocked',
    tooltipKey: 'client-availability.legend.hint',
  },
  {
    state: AvailabilityDisplayState.DerivedBlocked,
    labelKey: 'client-availability.legend.derived-blocked',
    tooltipKey: 'client-availability.legend.derived-blocked-tooltip',
  },
  {
    state: AvailabilityDisplayState.Empty,
    labelKey: 'client-availability.legend.empty',
    tooltipKey: 'client-availability.legend.hint',
  },
];

@Component({
  selector: 'app-client-availability-legend',
  templateUrl: './client-availability-legend.component.html',
  styleUrls: ['./client-availability-legend.component.scss'],
  standalone: true,
  imports: [NgbTooltipModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientAvailabilityLegendComponent {
  private checkboxDrawing = inject(CheckboxDrawingService);

  readonly entries = computed<AvailabilityLegendEntry[]>(() => {
    const urls = this.checkboxDrawing.symbolDataUrls();
    return LEGEND_STATES.map((entry) => ({
      labelKey: entry.labelKey,
      tooltipKey: entry.tooltipKey,
      symbolUrl: urls.get(entry.state) ?? null,
    }));
  });
}
